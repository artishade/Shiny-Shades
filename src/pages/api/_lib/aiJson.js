/**
 * Shared plumbing for the AI routes that need a JSON object back from a model
 * that has no response_format support.
 *
 * Extracted from /api/ai-product-metadata, which was the only caller until the
 * admin chat gained product and category drafting.
 */

import { callChatCompletions, callChatCompletionsWithFailover, readContent } from './aiCredentials.js';

const RETRY_TIMEOUT_MS = 15000;

export const stripTags = (value) =>
    typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';

/** Clamps to a budget, backing off to a word boundary when one is close. */
export function clamp(value, max) {
    const text = stripTags(value);
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export const cleanHint = (value, maxLength) => {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return stripTags(value).slice(0, maxLength);
};

export function cleanTags(values, max = 12) {
    if (!Array.isArray(values)) return [];
    const tags = [];
    for (const value of values) {
        const tag = stripTags(value).toLowerCase().replace(/^#+/, '').trim();
        if (!tag || tag.length > 30) continue;
        if (!tags.includes(tag) && tags.length < max) tags.push(tag);
    }
    return tags;
}

/** Free gateways serve R1-class models that emit their deliberation inline. */
export function stripThinking(text) {
    const raw = String(text || '').trim();
    const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return stripped || raw;
}

/** Fenced or prose-wrapped output is common enough to be worth digging out. */
export function parseJsonObject(text) {
    const unfenced = String(text || '').replace(/```(?:json)?/gi, '').trim();
    if (!unfenced) return null;

    try {
        const direct = JSON.parse(unfenced);
        if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;
    } catch { /* fall through to substring scan */ }

    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start === -1 || end <= start) return null;

    try {
        const scanned = JSON.parse(unfenced.slice(start, end + 1));
        return scanned && typeof scanned === 'object' && !Array.isArray(scanned) ? scanned : null;
    } catch {
        return null;
    }
}

/**
 * Walks the credential chain for one JSON object.
 *
 * On unparseable output it retries exactly once, on the provider that already
 * answered — it can clearly see the request, it just formatted badly. A model
 * that ignores "JSON only" twice will ignore it a third time for more money.
 *
 * Returns `{ ok: true, parsed, call }`, or `{ ok: false, call }` for a provider
 * failure the caller should hand to `providerError`, or
 * `{ ok: false, badOutput: true, call }` when both attempts parsed to nothing.
 */
export async function requestJsonObject(chain, messages, options = {}) {
    const { temperature = 0.4, maxTokens = 700, timeoutMs, budgetMs, retryTimeoutMs = RETRY_TIMEOUT_MS } = options;

    const call = await callChatCompletionsWithFailover(
        chain,
        { messages, temperature, max_tokens: maxTokens },
        { timeoutMs, budgetMs },
    );
    if (!call.ok) return { ok: false, call };

    const firstText = stripThinking(readContent(call.json));
    let parsed = parseJsonObject(firstText);
    if (parsed) return { ok: true, parsed, call };

    const retry = await callChatCompletions(
        call.cred,
        {
            messages: [
                ...messages,
                { role: 'assistant', content: firstText.slice(0, 2000) },
                {
                    role: 'user',
                    content:
                        'That was not valid JSON. Reply again with ONE JSON object only — no prose, no code fences.',
                },
            ],
            temperature: 0,
            max_tokens: maxTokens,
        },
        retryTimeoutMs,
    );

    // The retry answering badly is still the first call's chain for bookkeeping,
    // but a hard provider failure on the retry is what the caller must report.
    if (!retry.ok) return { ok: false, call: { ...retry, cred: call.cred, attempts: call.attempts } };

    parsed = parseJsonObject(stripThinking(readContent(retry.json)));
    if (!parsed) return { ok: false, badOutput: true, call };

    return { ok: true, parsed, call };
}

/** One phrasing for "the model would not produce JSON", used by every caller. */
export const badOutputError = (res) =>
    res.status(502).json({
        error: 'The model did not return usable JSON. Try again, or switch to a stronger model.',
        code: 'provider_bad_output',
    });
