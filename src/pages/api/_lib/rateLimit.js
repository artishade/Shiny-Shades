import { createClient } from '@supabase/supabase-js';

// Built on first use, not at import time: an unset SUPABASE_URL would otherwise
// throw while the module loads and mask the handler's own 500 with a crash page.
let client = null;
function getSupabase() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    if (!client) {
        client = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
    }
    return client;
}

export function getClientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return fwd.split(',')[0].trim();
    return req.socket?.remoteAddress || 'unknown';
}

/** Returns true if the request is allowed, false if it should be rejected with 429. */
export async function checkRateLimit(key, limit, windowSeconds) {
    const supabase = getSupabase();
    if (!supabase) {
        console.error('[rateLimit] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY unset, allowing request');
        return true;
    }
    const { data, error } = await supabase.rpc('check_rate_limit', {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
    });
    if (error) {
        console.error('[rateLimit] check failed, allowing request:', error);
        return true; // fail open — a rate-limit DB hiccup shouldn't break checkout
    }
    return data === true;
}

/**
 * Same check, but fails CLOSED. For endpoints where each request costs money,
 * a broken rate limiter is a worse outcome than a rejected request.
 */
export async function checkRateLimitStrict(key, limit, windowSeconds) {
    const supabase = getSupabase();
    if (!supabase) {
        console.error('[rateLimit] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY unset, rejecting request');
        return false;
    }
    const { data, error } = await supabase.rpc('check_rate_limit', {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
    });
    if (error) {
        console.error('[rateLimit] strict check failed, rejecting request:', error);
        return false;
    }
    return data === true;
}