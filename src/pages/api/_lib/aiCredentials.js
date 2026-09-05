/**
 * Shared helpers for the admin-managed OpenAI-compatible AI credentials.
 * Imported by /api/ai-credentials, /api/ai-product-metadata and /api/ai-chat.
 *
 * Credentials form a failover chain rather than a single active row: the
 * callers walk it until a provider answers, which is what makes a dead key or
 * an exhausted free-tier quota a non-event.
 */

const DEFAULT_TIMEOUT_MS = 25000;

/** A retry needs enough of the shared budget left to plausibly finish. */
const MIN_ATTEMPT_MS = 4000;

/**
 * Migration 006 has not run. PostgREST reports the same missing column as
 * 42703 when reading and PGRST204 when writing.
 */
const isMissingColumn = (error) => error?.code === '42703' || error?.code === 'PGRST204';

export function maskKey(key) {
    if (!key || typeof key !== 'string') return '';
    if (key.length < 12) return '••••';
    return `${key.slice(0, 3)}…${key.slice(-4)}`;
}

/**
 * Reduces whatever an operator pasted to the root the OpenAI-compatible spec
 * expects: "https://api.example.com/v1/chat/completions/" -> ".../v1"
 */
export function normalizeBaseUrl(raw) {
    const url = String(raw || '').trim().replace(/\/+$/, '');
    return url.replace(/\/chat\/completions$/i, '').replace(/\/+$/, '');
}

export function isAllowedBaseUrl(url) {
    if (/^https:\/\/[^\s/]+/i.test(url)) return true;
    return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
}

/**
 * Every credential the admin left in rotation, best first, then the env vars
 * as a last resort. Callers walk this until one provider answers.
 *
 * select('*') is deliberate: `priority` only exists after migration 006, and
 * naming a column the live table lacks fails the whole request with 42703.
 */
export async function resolveCredentialChain(supabase) {
    const { data, error } = await supabase
        .from('ai_credentials')
        .select('*')
        .eq('is_active', true);

    if (error) console.error('[aiCredentials] chain lookup failed:', error);

    const chain = (data || [])
        .filter((row) => row?.api_key && row?.base_url && row?.model)
        .map((row) => ({
            id: row.id,
            label: row.label,
            baseUrl: normalizeBaseUrl(row.base_url),
            model: row.model,
            apiKey: row.api_key,
            priority: Number(row.priority) || 0,
            createdAt: String(row.created_at || ''),
            source: 'db',
        }))
        .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));

    const { AI_BASE_URL, AI_API_KEY, AI_MODEL } = process.env;
    if (AI_BASE_URL && AI_API_KEY && AI_MODEL) {
        chain.push({
            id: null,
            label: 'Environment variables',
            baseUrl: normalizeBaseUrl(AI_BASE_URL),
            model: AI_MODEL,
            apiKey: AI_API_KEY,
            priority: Number.MAX_SAFE_INTEGER,
            createdAt: '',
            source: 'env',
        });
    }

    return chain;
}

/** The head of the chain. Used by the connection test, which never fails over. */
export async function resolveActiveCredential(supabase) {
    const [first] = await resolveCredentialChain(supabase);
    return first || null;
}

/**
 * POST {baseUrl}/chat/completions — one code path for every OpenAI-compatible
 * gateway. No response_format and no provider-specific fields, because plenty
 * of gateways reject both.
 */
export async function callChatCompletions(cred, body, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(`${cred.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${cred.apiKey}`,
            },
            body: JSON.stringify({ model: cred.model, ...body }),
            signal: controller.signal,
        });

        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch { /* provider returned non-JSON */ }

        if (!res.ok) {
            const message =
                json?.error?.message || json?.message || text.slice(0, 300) || `HTTP ${res.status}`;
            return { ok: false, status: res.status, message };
        }
        return { ok: true, json };
    } catch (err) {
        if (err?.name === 'AbortError') {
            return { ok: false, status: 504, message: 'Provider timed out.' };
        }
        return { ok: false, status: 502, message: err?.message || 'Provider request failed.' };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * A 400 that names the payload is the request's fault, not the provider's:
 * every credential in the chain would spend a round trip refusing the same
 * bytes. Everything else — dead key, quota, 5xx, timeout — deserves the next
 * provider a shot.
 */
const REQUEST_FAULT_RE = /context|token limit|too long|too many tokens|reduce the length/i;

export function isRequestFault(result) {
    if (result?.status === 413 || result?.status === 422) return true;
    return result?.status === 400 && REQUEST_FAULT_RE.test(result?.message || '');
}

export const isRetryableFailure = (result) => !isRequestFault(result);

/**
 * Walks the chain until a provider answers. Attempts share one wall-clock
 * budget, so a chain of timeouts cannot outlive the caller's maxDuration.
 *
 * Returns the winning result plus `cred` (who answered) and `attempts` (who
 * failed first, in order) so the caller can record and report the switch.
 */
export async function callChatCompletionsWithFailover(chain, body, options = {}) {
    const attemptMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    const deadline = Date.now() + (options.budgetMs || attemptMs);
    const attempts = [];
    let last = null;

    for (const cred of chain) {
        const remaining = deadline - Date.now();
        if (attempts.length && remaining < MIN_ATTEMPT_MS) break;

        const timeout = Math.min(attemptMs, Math.max(remaining, MIN_ATTEMPT_MS));
        const result = await callChatCompletions(cred, body, timeout);
        if (result.ok) return { ...result, cred, attempts };

        last = result;
        attempts.push({
            cred,
            status: result.status,
            message: String(result.message || 'Request failed.').slice(0, 300),
        });
        if (isRequestFault(result)) break;
    }

    return {
        ...(last || { ok: false, status: 503, message: 'No provider was reachable.' }),
        cred: attempts[attempts.length - 1]?.cred || null,
        attempts,
    };
}


export function readContent(json) {
    const message = json?.choices?.[0]?.message;
    if (typeof message?.content === 'string') return message.content;
    if (Array.isArray(message?.content)) {
        return message.content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('');
    }
    return '';
}

/** Provider failures are translated once, so every exit carries a stable code. */
export function providerError(res, result) {
    if (result.status === 401 || result.status === 403) {
        return res.status(502).json({ error: 'The provider rejected the API key.', code: 'provider_auth' });
    }
    if (result.status === 429) {
        return res.status(429).json({
            error: 'The provider is rate limiting us. Wait a moment.',
            code: 'provider_rate_limited',
        });
    }
    if (result.status === 504) {
        return res.status(504).json({ error: 'The provider timed out.', code: 'provider_timeout' });
    }
    return res.status(502).json({
        error: result.message || 'The provider request failed.',
        code: 'provider_error',
    });
}

/**
 * Records who answered and who failed, so the API Keys page can explain a
 * skip. Bookkeeping only — a write failing here must never fail the caller.
 */
export async function recordCredentialOutcome(supabase, call) {
    const now = new Date().toISOString();
    const writes = [];

    for (const attempt of call?.attempts || []) {
        if (attempt.cred?.source !== 'db' || !attempt.cred.id) continue;
        writes.push([
            attempt.cred.id,
            { last_status: attempt.status || null, last_error: attempt.message, last_error_at: now },
        ]);
    }

    if (call?.ok && call.cred?.source === 'db' && call.cred.id) {
        writes.push([
            call.cred.id,
            { last_used_at: now, last_status: null, last_error: null, last_error_at: null },
        ]);
    }

    for (const [id, patch] of writes) {
        let { error } = await supabase.from('ai_credentials').update(patch).eq('id', id);

        // Before migration 006 the error columns do not exist; last_used_at is
        // the half of this that still works, and still matters.
        if (isMissingColumn(error) && patch.last_used_at) {
            ({ error } = await supabase
                .from('ai_credentials')
                .update({ last_used_at: patch.last_used_at })
                .eq('id', id));
        }
        if (error && !isMissingColumn(error)) {
            console.error('[aiCredentials] outcome write failed:', error.message || error);
        }
    }
}
