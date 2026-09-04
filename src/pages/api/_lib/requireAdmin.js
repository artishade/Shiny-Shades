/**
 * Admin guard for API routes.
 *
 * The app has no middleware.ts — AdminAuthLayout only checks for a Supabase
 * session in the browser, and real authorization lives in the is_admin() RLS
 * policies. Routes that spend money or hold secrets need their own check, so
 * they verify the caller's access token server-side and confirm the email is
 * present in the admins table.
 *
 * Usage:
 *   const auth = await requireAdmin(req, res);
 *   if (!auth.ok) return;              // response already sent
 *   auth.admin.email; auth.supabase;   // service-role client, reuse it
 */

let cachedClient = null;

async function getServiceClient() {
    if (cachedClient) return cachedClient;
    const { createClient } = await import('@supabase/supabase-js');
    cachedClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    return cachedClient;
}

export async function requireAdmin(req, res) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        res.status(500).json({
            error: 'Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.',
            code: 'server_misconfigured',
        });
        return { ok: false };
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
        res.status(401).json({ error: 'Sign in as an admin first.', code: 'unauthorized' });
        return { ok: false };
    }

    try {
        const supabase = await getServiceClient();

        const { data, error } = await supabase.auth.getUser(token);
        const email = data?.user?.email;
        if (error || !email) {
            res.status(401).json({ error: 'Session expired. Sign in again.', code: 'unauthorized' });
            return { ok: false };
        }

        // Case-insensitive match: the SQL is_admin() helper compares the JWT
        // claim case-sensitively, so an admins row may differ in casing.
        // LIKE metacharacters are escaped because `_` is legal in an address.
        const pattern = email.replace(/[\\%_]/g, (m) => `\\${m}`);
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('email')
            .ilike('email', pattern)
            .maybeSingle();

        if (adminError) {
            console.error('[requireAdmin] admins lookup failed:', adminError);
            res.status(500).json({ error: 'Could not verify admin access.', code: 'server_error' });
            return { ok: false };
        }
        if (!admin) {
            res.status(403).json({ error: 'This account is not an admin.', code: 'forbidden' });
            return { ok: false };
        }

        return { ok: true, admin, supabase };
    } catch (err) {
        console.error('[requireAdmin]', err);
        res.status(500).json({ error: 'Could not verify admin access.', code: 'server_error' });
        return { ok: false };
    }
}
