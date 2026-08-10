import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export function getClientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return fwd.split(',')[0].trim();
    return req.socket?.remoteAddress || 'unknown';
}

/** Returns true if the request is allowed, false if it should be rejected with 429. */
export async function checkRateLimit(key, limit, windowSeconds) {
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