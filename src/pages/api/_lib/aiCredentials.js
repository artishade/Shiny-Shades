/**
 * Shared helpers for the admin-managed OpenAI-compatible AI credentials.
 * Imported by /api/ai-credentials and /api/ai-product-metadata.
 */

const DEFAULT_TIMEOUT_MS = 25000;

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

/** Active DB row first, then env vars, then null. */
export async function resolveActiveCredential(supabase) {
    const { data, error } = await supabase
        .from('ai_credentials')
        .select('id, label, base_url, model, api_key')
        .eq('is_active', true)
        .maybeSingle();

    if (error) console.error('[aiCredentials] active row lookup failed:', error);

    if (data?.api_key && data?.base_url && data?.model) {
        return {
            id: data.id,
            label: data.label,
            baseUrl: normalizeBaseUrl(data.base_url),
            model: data.model,
            apiKey: data.api_key,
            source: 'db',
        };
    }

    const { AI_BASE_URL, AI_API_KEY, AI_MODEL } = process.env;
    if (AI_BASE_URL && AI_API_KEY && AI_MODEL) {
        return {
            id: null,
            label: 'Environment variables',
            baseUrl: normalizeBaseUrl(AI_BASE_URL),
            model: AI_MODEL,
            apiKey: AI_API_KEY,
            source: 'env',
        };
    }

    return null;
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
