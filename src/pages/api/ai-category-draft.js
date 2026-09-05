/**
 * Category drafting for the admin AI chat.
 *
 * Text only: the owner types "notun category banao — Party Sarees" or "shirts er
 * description SEO friendly koro", and this returns a draft the chat renders as an
 * editable card. Generate-only; the browser writes through useCategoryStore.
 *
 * `action` is a two-value allowlist, so no phrasing the owner or the model can
 * produce reaches a delete. That is deliberate, not an oversight.
 */

import { requireAdmin } from './_lib/requireAdmin.js';
import { checkRateLimitStrict } from './_lib/rateLimit.js';
import { providerError, recordCredentialOutcome, resolveCredentialChain } from './_lib/aiCredentials.js';
import { badOutputError, clamp, cleanHint, requestJsonObject } from './_lib/aiJson.js';

export const config = { maxDuration: 60 };

const MAX_CATEGORIES_SENT = 60;
const MAX_INSTRUCTION_CHARS = 1200;
const PROVIDER_TIMEOUT_MS = 20000;
const PROVIDER_BUDGET_MS = 40000;

const buildSystemPrompt = (rows) => [
    "You manage the category list of a women's fashion store in Bangladesh.",
    'Reply with ONE JSON object and nothing else. No markdown, no code fences, no commentary.',
    'Use exactly these keys: action, targetSlug, name, description, parentSlug, seoTitle, seoDescription, seoKeywords.',
    '- action: "create" for a new category, "update" to change one that exists. Nothing else is allowed.',
    '- targetSlug: for "update", the slug being changed, VERBATIM from the list below. "" for "create".',
    '- name: string, max 40 characters, title case, no emoji.',
    '- description: string, one or two sentences, max 300 characters, shopper-facing.',
    '- parentSlug: the slug of the parent category if this belongs under one, else "".',
    '- seoTitle: string, max 60 characters.',
    '- seoDescription: string, max 160 characters.',
    '- seoKeywords: string, 4-8 comma separated lowercase keywords.',
    rows.length
        ? `Existing categories (slug — name — parent slug):\n${rows}`
        : 'The store has no categories yet, so action must be "create".',
    'Never delete anything. If the owner asks to delete, still reply with an "update" object and leave the fields unchanged.',
    'Write in English unless the owner asks for another language.',
].join('\n');

async function fetchCategories(supabase) {
    const { data, error } = await supabase
        .from('categories')
        .select('id,name,slug,parent_id')
        .order('created_at', { ascending: true })
        .limit(MAX_CATEGORIES_SENT);

    if (error) {
        console.error('[ai-category-draft] category lookup failed:', error.message || error);
        return [];
    }
    return (data || [])
        .filter((row) => row?.name && row?.slug)
        .map((row) => ({
            id: String(row.id),
            name: String(row.name),
            slug: String(row.slug),
            parentId: row.parent_id ? String(row.parent_id) : null,
        }));
}

const serializeCategories = (categories) =>
    categories
        .map((c) => {
            const parent = categories.find((p) => p.id === c.parentId);
            return `${c.slug} — ${c.name} — ${parent ? parent.slug : 'none'}`;
        })
        .join('\n');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
    }

    const auth = await requireAdmin(req, res);
    if (!auth.ok) return;

    const allowed = await checkRateLimitStrict(`ai-category-draft:${auth.admin.email}`, 15, 300);
    if (!allowed) {
        return res.status(429).json({
            error: 'Too many category drafts, or the rate limiter is unavailable. Wait a minute and try again.',
            code: 'rate_limited',
        });
    }

    const instruction = cleanHint(req.body?.instruction, MAX_INSTRUCTION_CHARS);
    if (!instruction) {
        return res.status(400).json({ error: 'Say what the category should be.', code: 'bad_request' });
    }

    try {
        const chain = await resolveCredentialChain(auth.supabase);
        if (!chain.length) {
            return res.status(503).json({
                error: 'No AI credential configured. Add one on the API Keys page.',
                code: 'no_credentials',
            });
        }

        const categories = await fetchCategories(auth.supabase);

        const messages = [
            { role: 'system', content: buildSystemPrompt(serializeCategories(categories)) },
            { role: 'user', content: instruction },
        ];

        const result = await requestJsonObject(chain, messages, {
            temperature: 0.4,
            maxTokens: 600,
            timeoutMs: PROVIDER_TIMEOUT_MS,
            budgetMs: PROVIDER_BUDGET_MS,
        });

        await recordCredentialOutcome(auth.supabase, result.call);
        if (!result.ok) {
            return result.badOutput ? badOutputError(res) : providerError(res, result.call);
        }

        const parsed = result.parsed;
        const cred = result.call.cred;

        // A target that does not exist degrades to a create; the alternative is an
        // update card whose Apply would 404 after the owner had already edited it.
        const wantsUpdate = String(parsed.action || '').toLowerCase() === 'update';
        const target = wantsUpdate
            ? categories.find((c) => c.slug === clamp(parsed.targetSlug, 80).toLowerCase()) || null
            : null;

        const parent = categories.find((c) => c.slug === clamp(parsed.parentSlug, 80).toLowerCase()) || null;
        const name = clamp(parsed.name, 40) || (target ? target.name : '');
        if (!name) return badOutputError(res);

        return res.status(200).json({
            ok: true,
            data: {
                action: target ? 'update' : 'create',
                targetId: target ? target.id : '',
                targetSlug: target ? target.slug : '',
                name,
                description: clamp(parsed.description, 300),
                // A category cannot parent itself into an orphan loop.
                parentId: parent && (!target || parent.id !== target.id) ? parent.id : '',
                seoTitle: clamp(parsed.seoTitle, 70),
                seoDescription: clamp(parsed.seoDescription, 200),
                seoKeywords: clamp(parsed.seoKeywords, 200),
            },
            meta: {
                model: cred.model,
                credentialLabel: cred.label,
                switchedFrom: result.call.attempts.map((a) => `${a.cred.label} (${a.status})`),
            },
        });
    } catch (err) {
        console.error('[ai-category-draft]', err);
        return res.status(500).json({ error: 'Something went wrong.', code: 'server_error' });
    }
}
