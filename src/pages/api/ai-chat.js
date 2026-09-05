/**
 * Store-data chat for the admin panel.
 *
 * Context-stuffing, not tool-calling: every turn rebuilds a compact aggregated
 * digest of the store and puts it in the system prompt. One provider call per
 * message, so it works on any OpenAI-compatible /chat/completions endpoint —
 * the same reason this project avoids response_format elsewhere.
 *
 * The digest is rebuilt fresh each turn on purpose. "How many orders today"
 * has to be right, and Vercel lambdas don't share a cache anyway.
 *
 * The provider call walks the credential chain, so one dead key or exhausted
 * free-tier quota moves to the next provider instead of failing the message.
 */

import { requireAdmin } from './_lib/requireAdmin.js';
import { checkRateLimitStrict } from './_lib/rateLimit.js';
import {
    callChatCompletionsWithFailover,
    isRequestFault,
    providerError,
    readContent,
    recordCredentialOutcome,
    resolveCredentialChain,
} from './_lib/aiCredentials.js';
import { buildStoreSnapshot, serializeSnapshot } from './_lib/storeSnapshot.js';

export const config = { maxDuration: 60 };

const MAX_MESSAGES = 40;
const MAX_TURNS_SENT = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_CHARS = 8000;
const MAX_REPLY_CHARS = 4000;
const PROVIDER_TIMEOUT_MS = 20000;

// Two full attempts plus the snapshot queries, under maxDuration.
const PROVIDER_BUDGET_MS = 45000;

const RULES = [
    "You are the data analyst for Shiny Shades, an online women's fashion store in Bangladesh.",
    'You are talking to the owner. Currency is BDT, written as Taka or ৳.',
    'Reply in plain text only — no markdown, no asterisks, no tables, no code fences. The chat window renders raw text.',
    'Answer in whatever language the owner writes in, including Banglish.',
    'Be short and concrete. Lead with the number, then one or two lines of what it means and what to do about it.',
    '',
    'HONESTY RULES, these override everything else:',
    '- The STORE SNAPSHOT below is your only source of data. Never state a number that is not in it or arithmetic on it.',
    '- Never fill a gap with an industry benchmark, an estimate or a guess. If the snapshot cannot answer, say exactly which data the store does not record, then suggest where the owner could get it.',
    '- The snapshot covers only the recent orders named in COVERAGE. If a question needs older orders, say so.',
    '- When a caveat affects your answer, state it in one short clause. The caveats are: cancelled orders are excluded from revenue; shipping is derived arithmetic, not a stored column; product ratings and review counts are always 0 because there is no review feature; the coupon used_count column is dead so usage is counted off orders; the category product_count column is dead so counts are derived; no cost price is stored anywhere, so profit and margin cannot be computed.',
    '- Customer identities are deliberately withheld from you. For a name, phone or address, tell the owner to open the Orders page.',
    '- If asked about traffic, visitors, sessions, referrers, conversion rate, cart abandonment, product views, search demand, ad spend or post performance: say plainly that the store records none of it, that analytics only sends data out to Google Tag Manager and the Facebook Pixel and never reads it back, and point at GA4 or Meta Events Manager. Do not invent a number.',
    '',
].join('\n');

/** Model output and client input are both untrusted; strip control characters. */
const clean = (value) =>
    String(value)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .trim();

/** Rejecting "system" matters: the system prompt is server-owned. */
const validRole = (role) => (role === 'user' || role === 'assistant' ? role : '');

/** Free gateways serve R1-class models that emit their deliberation inline. */
function stripThinking(text) {
    const raw = clean(text);
    const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return stripped || raw;
}

function sanitizeMessages(raw) {
    if (!Array.isArray(raw) || !raw.length) {
        return { status: 400, code: 'bad_request', error: 'Send a messages array.' };
    }
    if (raw.length > MAX_MESSAGES) {
        return {
            status: 400,
            code: 'too_many_messages',
            error: 'This conversation is too long. Clear the chat and start again.',
        };
    }

    const cleaned = [];
    for (const entry of raw) {
        const role = validRole(entry?.role);
        if (!role || typeof entry?.content !== 'string') continue;
        const content = clean(entry.content);
        if (content) cleaned.push({ role, content });
    }

    const last = cleaned[cleaned.length - 1];
    if (!last || last.role !== 'user') {
        return { status: 400, code: 'bad_request', error: 'Send a question.' };
    }
    if (last.content.length > MAX_MESSAGE_CHARS) {
        return {
            status: 400,
            code: 'message_too_long',
            error: `Keep a message under ${MAX_MESSAGE_CHARS} characters.`,
        };
    }

    // Walked newest first so the current question always survives the budget.
    const kept = [];
    let budget = MAX_HISTORY_CHARS;
    for (let i = cleaned.length - 1; i >= 0; i -= 1) {
        if (kept.length >= MAX_TURNS_SENT) break;
        if (kept.length && cleaned[i].content.length > budget) break;
        budget -= cleaned[i].content.length;
        kept.unshift(cleaned[i]);
    }
    if (kept.length > 1 && kept[0].role === 'assistant') kept.shift();

    return { messages: kept, trimmed: cleaned.length - kept.length };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
    }

    const auth = await requireAdmin(req, res);
    if (!auth.ok) return;

    // Strict limiter fails closed, and check_rate_limit lives only in the live
    // database — an unavailable limiter is indistinguishable from a real 429,
    // so the copy has to cover both.
    const burst = await checkRateLimitStrict(`ai-chat:${auth.admin.email}`, 12, 300);
    if (!burst) {
        return res.status(429).json({
            error: 'Too many messages, or the rate limiter is unavailable. Wait a minute and try again.',
            code: 'rate_limited',
        });
    }

    const daily = await checkRateLimitStrict(`ai-chat-day:${auth.admin.email}`, 100, 86400);
    if (!daily) {
        return res.status(429).json({
            error: 'Daily limit of 100 chat messages reached. It resets in 24 hours.',
            code: 'daily_limit',
        });
    }

    const parsed = sanitizeMessages(req.body?.messages);
    if (parsed.error) {
        return res.status(parsed.status).json({ error: parsed.error, code: parsed.code });
    }

    try {
        const chain = await resolveCredentialChain(auth.supabase);
        if (!chain.length) {
            return res.status(503).json({
                error: 'No AI credential configured. Add one on the API Keys page.',
                code: 'no_credentials',
            });
        }

        const digest = await buildStoreSnapshot(auth.supabase);
        const snapshot = serializeSnapshot(digest);

        // Rules and snapshot share one system message; some gateways drop a second.
        const call = await callChatCompletionsWithFailover(
            chain,
            {
                messages: [{ role: 'system', content: `${RULES}${snapshot}` }, ...parsed.messages],
                temperature: 0.2,
                max_tokens: 900,
            },
            { timeoutMs: PROVIDER_TIMEOUT_MS, budgetMs: PROVIDER_BUDGET_MS },
        );

        await recordCredentialOutcome(auth.supabase, call);

        if (!call.ok) {
            if (isRequestFault(call)) {
                return res.status(413).json({
                    error: 'The conversation outgrew this model’s context. Clear the chat and ask again.',
                    code: 'context_too_long',
                });
            }
            return providerError(res, call);
        }

        const reply = stripThinking(readContent(call.json)).slice(0, MAX_REPLY_CHARS);
        if (!reply) {
            return res.status(502).json({
                error: 'The model returned an empty reply. Try again, or switch to a stronger model.',
                code: 'provider_bad_output',
            });
        }

        return res.status(200).json({
            ok: true,
            reply,
            meta: {
                model: call.cred.model,
                credentialLabel: call.cred.label,
                historyTrimmed: parsed.trimmed,
                ordersCovered: digest.coverage.ordersFetched,
                ordersTotal: digest.coverage.ordersTotal,
                totalTokens: Number(call.json?.usage?.total_tokens) || 0,
                switchedFrom: call.attempts.map((a) => `${a.cred.label} (${a.status})`),
            },
        });
    } catch (err) {
        console.error('[ai-chat]', err);
        return res.status(500).json({ error: 'Something went wrong.', code: 'server_error' });
    }
}
