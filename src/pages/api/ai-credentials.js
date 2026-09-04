/**
 * Admin-managed OpenAI-compatible AI credentials (CRUD + connection test).
 *
 * The plaintext api_key never leaves the server — responses carry a masked
 * form only. ai_credentials has no browser grants at all (migration 005), so
 * this service-role route is the only way in.
 */

import { requireAdmin } from './_lib/requireAdmin.js';
import { checkRateLimitStrict } from './_lib/rateLimit.js';
import {
    callChatCompletions,
    isAllowedBaseUrl,
    maskKey,
    normalizeBaseUrl,
    resolveActiveCredential,
} from './_lib/aiCredentials.js';

const SAFE_COLUMNS = 'id, label, base_url, model, is_active, last_used_at, created_at, updated_at';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toDto = (row) => ({
    id: row.id,
    label: row.label,
    baseUrl: row.base_url,
    model: row.model,
    isActive: !!row.is_active,
    keyMasked: maskKey(row.api_key),
    lastUsedAt: row.last_used_at,
});

const cleanId = (value) => (UUID_RE.test(String(value ?? '')) ? String(value) : null);

const cleanText = (value, maxLength) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed && trimmed.length <= maxLength ? trimmed : null;
};

const badRequest = (res, error) => res.status(400).json({ error, code: 'bad_request' });
const BASE_URL_HINT = 'Base URL must start with https:// (or http://localhost).';

export default async function handler(req, res) {
    const auth = await requireAdmin(req, res);
    if (!auth.ok) return;

    const allowed = await checkRateLimitStrict(`ai-credentials:${auth.admin.email}`, 30, 60);
    if (!allowed) {
        return res.status(429).json({ error: 'Too many requests. Wait a moment.', code: 'rate_limited' });
    }

    const supabase = auth.supabase;

    try {
        if (req.method === 'GET') return await listCredentials(supabase, res);
        if (req.method === 'POST') {
            return req.body?.action === 'test'
                ? await testCredential(supabase, req, res)
                : await createCredential(supabase, req, res);
        }
        if (req.method === 'PATCH') return await updateCredential(supabase, req, res);
        if (req.method === 'DELETE') return await deleteCredential(supabase, req, res);

        res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
        return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
    } catch (err) {
        console.error('[ai-credentials]', err);
        return res.status(500).json({ error: 'Something went wrong.', code: 'server_error' });
    }
}

async function listCredentials(supabase, res) {
    const { data, error } = await supabase
        .from('ai_credentials')
        .select(`${SAFE_COLUMNS}, api_key`)
        .order('created_at', { ascending: true });
    if (error) throw error;

    return res.status(200).json({
        credentials: (data || []).map(toDto),
        envFallback: !!(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL),
    });
}

async function createCredential(supabase, req, res) {
    const label = cleanText(req.body?.label, 60);
    const model = cleanText(req.body?.model, 120);
    const apiKey = cleanText(req.body?.apiKey, 500);
    const baseUrl = normalizeBaseUrl(req.body?.baseUrl);

    if (!label) return badRequest(res, 'Label is required.');
    if (!model) return badRequest(res, 'Model is required.');
    if (!apiKey) return badRequest(res, 'API key is required.');
    if (!isAllowedBaseUrl(baseUrl)) return badRequest(res, BASE_URL_HINT);

    // The very first credential becomes active so the feature works immediately.
    const { count } = await supabase
        .from('ai_credentials')
        .select('id', { count: 'exact', head: true });

    const { data, error } = await supabase
        .from('ai_credentials')
        .insert([{ label, base_url: baseUrl, model, api_key: apiKey, is_active: !count }])
        .select(`${SAFE_COLUMNS}, api_key`)
        .single();
    if (error) throw error;

    return res.status(201).json({ credential: toDto(data) });
}

async function updateCredential(supabase, req, res) {
    const id = cleanId(req.body?.id);
    if (!id) return badRequest(res, 'A valid id is required.');

    const patch = { updated_at: new Date().toISOString() };

    if (req.body?.label !== undefined) {
        const label = cleanText(req.body.label, 60);
        if (!label) return badRequest(res, 'Label is required.');
        patch.label = label;
    }
    if (req.body?.model !== undefined) {
        const model = cleanText(req.body.model, 120);
        if (!model) return badRequest(res, 'Model is required.');
        patch.model = model;
    }
    if (req.body?.baseUrl !== undefined) {
        const baseUrl = normalizeBaseUrl(req.body.baseUrl);
        if (!isAllowedBaseUrl(baseUrl)) return badRequest(res, BASE_URL_HINT);
        patch.base_url = baseUrl;
    }

    // A blank apiKey keeps the stored one, so editing a label never forces the
    // admin to retype a secret they cannot read back.
    const apiKey = cleanText(req.body?.apiKey, 500);
    if (apiKey) patch.api_key = apiKey;

    if (req.body?.isActive === true) {
        // Clear the previous active row first — the partial unique index in
        // migration 005 permits only one.
        const { error } = await supabase
            .from('ai_credentials')
            .update({ is_active: false, updated_at: patch.updated_at })
            .neq('id', id);
        if (error) throw error;
        patch.is_active = true;
    } else if (req.body?.isActive === false) {
        patch.is_active = false;
    }

    const { data, error } = await supabase
        .from('ai_credentials')
        .update(patch)
        .eq('id', id)
        .select(`${SAFE_COLUMNS}, api_key`)
        .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Credential not found.', code: 'not_found' });

    return res.status(200).json({ credential: toDto(data) });
}

async function deleteCredential(supabase, req, res) {
    const id = cleanId(req.query?.id);
    if (!id) return badRequest(res, 'A valid id is required.');

    const { error } = await supabase.from('ai_credentials').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ ok: true });
}

/**
 * One cheap text-only completion. Without this a wrong base URL or a missing
 * /v1 segment is undebuggable, so the provider's own message is passed through.
 */
async function testCredential(supabase, req, res) {
    const id = cleanId(req.body?.id);
    let cred;

    if (id) {
        const { data, error } = await supabase
            .from('ai_credentials')
            .select('label, base_url, model, api_key')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Credential not found.', code: 'not_found' });
        cred = {
            label: data.label,
            baseUrl: normalizeBaseUrl(data.base_url),
            model: data.model,
            apiKey: data.api_key,
        };
    } else {
        cred = await resolveActiveCredential(supabase);
    }

    if (!cred) {
        return res.status(503).json({ error: 'No AI credential configured.', code: 'no_credentials' });
    }

    const result = await callChatCompletions(
        cred,
        { messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 },
        15000,
    );

    return res.status(200).json({
        ok: result.ok,
        model: cred.model,
        message: result.ok ? 'Connection OK' : result.message,
    });
}

