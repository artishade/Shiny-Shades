/**
 * Admin-managed prompt overrides for every AI-written field (GET + PUT).
 *
 * ai_prompts has no browser grants (migration 007) and is_admin() compares
 * emails case-sensitively, so this service-role route is the only writer.
 *
 * PUT carries the whole catalog: the page holds every section in state and
 * sends them all, so the per-group budget can be checked from the body without
 * a second read. A key the body omits is left as it is.
 */

import { requireAdmin } from './_lib/requireAdmin.js';
import { checkRateLimitStrict } from './_lib/rateLimit.js';
import { cleanInstruction, needsMigration } from './_lib/aiPrompts.js';
import {
    MASTER_KEY,
    ROUTE_BUDGETS,
    charsForGroup,
    isPromptKey,
    lintInstruction,
} from '../../lib/aiPromptSections';

const MAX_ROWS = 64;
const BUDGETED_GROUPS = ['product', 'category', 'chat'];

const toDto = (row) => ({
    key: row.key,
    instruction: row.instruction || '',
    isEnabled: row.is_enabled !== false,
    updatedAt: row.updated_at || null,
});

const migrationRequired = (res) =>
    res.status(409).json({
        error: 'Run supabase/migrations/007_add_ai_prompts.sql in the Supabase SQL editor, then try again.',
        code: 'migration_required',
    });

export default async function handler(req, res) {
    const auth = await requireAdmin(req, res);
    if (!auth.ok) return;

    const allowed = await checkRateLimitStrict(`ai-prompts:${auth.admin.email}`, 30, 60);
    if (!allowed) {
        return res.status(429).json({ error: 'Too many requests. Wait a moment.', code: 'rate_limited' });
    }

    try {
        if (req.method === 'GET') return await listPrompts(auth.supabase, res);
        if (req.method === 'PUT') return await savePrompts(auth.supabase, req, res);

        res.setHeader('Allow', 'GET, PUT');
        return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
    } catch (err) {
        console.error('[ai-prompts]', err);
        return res.status(500).json({ error: 'Something went wrong.', code: 'server_error' });
    }
}

/** Unlike the AI routes, this one reports a missing table instead of hiding it. */
async function listPrompts(supabase, res) {
    const { data, error } = await supabase
        .from('ai_prompts')
        .select('key,instruction,is_enabled,updated_at')
        .limit(MAX_ROWS);

    if (error) {
        if (needsMigration(error)) return migrationRequired(res);
        throw error;
    }

    const rows = (data || []).filter((row) => row?.key && isPromptKey(row.key));
    const master = rows.find((row) => row.key === MASTER_KEY);

    return res.status(200).json({
        prompts: rows.filter((row) => row.key !== MASTER_KEY).map(toDto),
        masterEnabled: master ? master.is_enabled !== false : true,
    });
}

async function savePrompts(supabase, req, res) {
    const incoming = Array.isArray(req.body?.prompts) ? req.body.prompts : null;
    if (!incoming) {
        return res.status(400).json({ error: 'Send a prompts array.', code: 'bad_request' });
    }
    if (incoming.length > MAX_ROWS) {
        return res.status(400).json({ error: 'Too many sections in one save.', code: 'bad_request' });
    }

    const cleaned = new Map();
    const enabled = new Map();

    for (const entry of incoming) {
        const key = String(entry?.key ?? '');
        if (key === MASTER_KEY || !isPromptKey(key)) {
            return res.status(400).json({ error: `Unknown prompt section "${key}".`, code: 'bad_request' });
        }
        cleaned.set(key, cleanInstruction(entry?.instruction));
        enabled.set(key, entry?.isEnabled !== false);
    }

    const findings = [];
    cleaned.forEach((instruction, key) => {
        lintInstruction(key, instruction)
            .filter((finding) => finding.level === 'error')
            .forEach((finding) => findings.push({ key, message: finding.message }));
    });
    if (findings.length) {
        return res.status(400).json({
            error: 'Some instructions cannot be saved as written.',
            code: 'bad_prompt',
            findings,
        });
    }

    // An over-budget group is rejected here rather than surfacing later as a
    // context overflow that also stops the credential chain from failing over.
    const getForBudget = (key) => (enabled.get(key) === false ? '' : cleaned.get(key));
    for (const group of BUDGETED_GROUPS) {
        const used = charsForGroup(getForBudget, group);
        if (used > ROUTE_BUDGETS[group]) {
            return res.status(400).json({
                error: `The ${group} instructions total ${used} characters, over the ${ROUTE_BUDGETS[group]} allowed for one request. Shorten them, including the brand voice box.`,
                code: 'prompt_budget',
            });
        }
    }

    const updatedAt = new Date().toISOString();
    const rows = [...cleaned.keys()].map((key) => ({
        key,
        instruction: cleaned.get(key),
        is_enabled: enabled.get(key),
        updated_at: updatedAt,
    }));

    if (typeof req.body?.masterEnabled === 'boolean') {
        rows.push({
            key: MASTER_KEY,
            instruction: '',
            is_enabled: req.body.masterEnabled,
            updated_at: updatedAt,
        });
    }

    const { error } = await supabase.from('ai_prompts').upsert(rows, { onConflict: 'key' });
    if (error) {
        if (needsMigration(error)) return migrationRequired(res);
        throw error;
    }

    return await listPrompts(supabase, res);
}
