/**
 * Admin-managed OpenAI-compatible AI credentials (CRUD + reorder + test).
 *
 * The plaintext api_key never leaves the server — responses carry a masked
 * form only. ai_credentials has no browser grants at all (migration 005), so
 * this service-role route is the only way in.
 *
 * Rows marked active form a failover chain, tried in ascending priority. The
 * priority and last_error columns arrive with migration 006, so reads use
 * select('*') and writes that need them map 42703 to a migration hint.
 */

import { requireAdmin } from './_lib/requireAdmin.js';
import { checkRateLimitStrict } from './_lib/rateLimit.js';
import {
    callChatCompletions,
    isAllowedBaseUrl,
    maskKey,
    normalizeBaseUrl,
    recordCredentialOutcome,
    resolveActiveCredential,
} from './_lib/aiCredentials.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REORDER_IDS = 50;

const toDto = (row) => ({
    id: row.id,
    label: row.label,
    baseUrl: row.base_url,
    model: row.model,
    isActive: !!row.is_active,
    keyMasked: maskKey(row.api_key),
    lastUsedAt: row.last_used_at,
    priority: Number(row.priority) || 0,
    lastStatus: row.last_status ?? null,
    lastError: row.last_error ?? null,
    lastErrorAt: row.last_error_at ?? null,
});

/** Chain order: priority first, then insertion order for the unseeded default. */
const byChainOrder = (a, b) =>
    (Number(a.priority) || 0) - (Number(b.priority) || 0) ||
    String(a.created_at || '').localeCompare(String(b.created_at || ''));

const cleanId = (value) => (UUID_RE.test(String(value ?? '')) ? String(value) : null);

const cleanText = (value, maxLength) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed && trimmed.length <= maxLength ? trimmed : null;
};

const badRequest = (res, error) => res.status(400).json({ error, code: 'bad_request' });
const BASE_URL_HINT = 'Base URL must start with https:// (or http://localhost).';

// A missing column reads back as 42703 and writes back as PGRST204; 23505 is
// migration 005's one-active-row index. All three mean the same unrun file.
const needsMigration = (error) =>
    error?.code === '42703' || error?.code === 'PGRST204' || error?.code === '23505';
const migrationRequired = (res) =>
    res.status(409).json({
        error:
            'Run supabase/migrations/006_ai_credentials_failover.sql in the Supabase SQL editor, then try again.',
        code: 'migration_required',
    });

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
            if (req.body?.action === 'test') return await testCredential(supabase, req, res);
            if (req.body?.action === 'reorder') return await reorderCredentials(supabase, req, res);
            return await createCredential(supabase, req, res);
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
    const { data, error } = await supabase.from('ai_credentials').select('*');
    if (error) throw error;

    const rows = (data || []).slice().sort(byChainOrder);

    return res.status(200).json({
        credentials: rows.map(toDto),
        envFallback: !!(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL),
        // A missing column simply does not come back from select('*').
        failoverReady: !rows.length || rows[0].priority !== undefined,
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

    // New credentials join the chain, at the end: the DEFAULT priority sorts
    // after every row migration 006 seeded.
    const row = { label, base_url: baseUrl, model, api_key: apiKey, is_active: true };
    let { data, error } = await supabase.from('ai_credentials').insert([row]).select('*').single();

    // Migration 005's one-active-row index is still in place, so add it as a
    // standby instead of refusing.
    if (error?.code === '23505') {
        ({ data, error } = await supabase
            .from('ai_credentials')
            .insert([{ ...row, is_active: false }])
            .select('*')
            .single());
    }
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

    // Many rows can be in rotation now, so activating one leaves the rest alone.
    if (req.body?.isActive === true) patch.is_active = true;
    else if (req.body?.isActive === false) patch.is_active = false;

    const { data, error } = await supabase
        .from('ai_credentials')
        .update(patch)
        .eq('id', id)
        .select('*')
        .maybeSingle();
    if (error) {
        if (needsMigration(error)) return migrationRequired(res);
        throw error;
    }
    if (!data) return res.status(404).json({ error: 'Credential not found.', code: 'not_found' });

    return res.status(200).json({ credential: toDto(data) });
}

/**
 * The client sends the whole list in its new order and priorities are rewritten
 * from scratch, so a half-finished reorder cannot leave two providers claiming
 * the same slot.
 */
async function reorderCredentials(supabase, req, res) {
    const raw = Array.isArray(req.body?.ids) ? req.body.ids : null;
    if (!raw || !raw.length || raw.length > MAX_REORDER_IDS) {
        return badRequest(res, 'Send an ids array in the new order.');
    }

    const ids = [];
    for (const value of raw) {
        const id = cleanId(value);
        if (!id || ids.includes(id)) return badRequest(res, 'ids must be unique credential ids.');
        ids.push(id);
    }

    const updatedAt = new Date().toISOString();
    for (let i = 0; i < ids.length; i += 1) {
        const { error } = await supabase
            .from('ai_credentials')
            .update({ priority: (i + 1) * 10, updated_at: updatedAt })
            .eq('id', ids[i]);
        if (error) {
            if (needsMigration(error)) return migrationRequired(res);
            throw error;
        }
    }

    return await listCredentials(supabase, res);
}

async function deleteCredential(supabase, req, res) {
    const id = cleanId(req.query?.id);
    if (!id) return badRequest(res, 'A valid id is required.');

    const { error } = await supabase.from('ai_credentials').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ ok: true });
}

/**
 * One cheap text-only completion, against exactly the credential asked for —
 * no failover, or the test would report on the wrong provider. Without this a
 * wrong base URL or a missing /v1 segment is undebuggable, so the provider's
 * own message is passed through.
 *
 * The result is recorded, so testing a provider also refreshes or clears the
 * stale error the API Keys page shows for it.
 */
async function testCredential(supabase, req, res) {
    const id = cleanId(req.body?.id);
    let cred;

    if (id) {
        const { data, error } = await supabase
            .from('ai_credentials')
            .select('id, label, base_url, model, api_key')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Credential not found.', code: 'not_found' });
        cred = {
            id: data.id,
            label: data.label,
            baseUrl: normalizeBaseUrl(data.base_url),
            model: data.model,
            apiKey: data.api_key,
            source: 'db',
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

    await recordCredentialOutcome(supabase, {
        ok: result.ok,
        cred,
        attempts: result.ok
            ? []
            : [{ cred, status: result.status, message: String(result.message || '').slice(0, 300) }],
    });

    return res.status(200).json({
        ok: result.ok,
        model: cred.model,
        message: result.ok ? 'Connection OK' : result.message,
    });
}

