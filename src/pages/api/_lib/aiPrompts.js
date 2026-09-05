/**
 * Loads the admin's prompt overrides and hands the AI routes the guidance they
 * substitute for their built-in wording.
 *
 * Fails open on purpose: a missing table, a revoked grant or a query error all
 * degrade to "no overrides" plus one console.error. A problem with the prompts
 * table must never fail a generation the owner already paid tokens for.
 *
 * No caching. A prompt the owner just saved has to take effect on the very next
 * generation, and the read is one indexed select against a table with at most a
 * dozen rows.
 */

import {
    MASTER_KEY,
    MAX_PROMPT_CHARS,
    ROUTE_SECTIONS,
    isPromptKey,
    renderFieldLine,
    resolvePromptTexts,
} from '../../../lib/aiPromptSections';

const MAX_ROWS = 64;

/** Postgres "relation does not exist", and PostgREST's schema-cache miss. */
const MISSING_TABLE_CODES = ['42P01', 'PGRST205'];

export const needsMigration = (error) => !!error && MISSING_TABLE_CODES.includes(error.code);

/**
 * Not `stripTags`: that one collapses newlines, which is right for model output
 * and destructive for an instruction the owner deliberately wrote over several
 * lines.
 */
export function cleanInstruction(value) {
    if (typeof value !== 'string') return '';
    return value
        .replace(/\r\n?/g, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ')
        .replace(/[^\S\n]+/g, ' ')
        .replace(/ ?\n ?/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .slice(0, MAX_PROMPT_CHARS)
        .trim();
}

const none = (missing = false) => ({ map: new Map(), missing });

/**
 * `map` holds only enabled, non-empty overrides for keys the catalog knows, so
 * a stale key left in the table is inert rather than injected.
 */
export async function loadPromptOverrides(supabase) {
    try {
        const { data, error } = await supabase
            .from('ai_prompts')
            .select('key,instruction,is_enabled')
            .limit(MAX_ROWS);

        if (error) {
            console.error('[aiPrompts] load failed:', error.message || error);
            return none(needsMigration(error));
        }

        const rows = data || [];
        const master = rows.find((row) => row?.key === MASTER_KEY);
        if (master && master.is_enabled === false) return none();

        const map = new Map();
        for (const row of rows) {
            if (!row || row.key === MASTER_KEY || row.is_enabled === false) continue;
            if (!isPromptKey(row.key)) continue;

            const instruction = cleanInstruction(row.instruction);
            if (instruction) map.set(row.key, instruction);
        }

        return { map, missing: false };
    } catch (err) {
        console.error('[aiPrompts] load threw:', err);
        return none();
    }
}

/**
 * The one call an AI route makes. Returns the effective guidance per section
 * plus the ready-made `- field: …` lines, in catalog order.
 *
 * `ownerChars` counts only what the owner wrote — zero when nothing is
 * overridden, which is what keeps a store with no prompts byte-identical to
 * before this feature existed.
 */
export async function loadPromptTexts(supabase, routeId) {
    const { map } = await loadPromptOverrides(supabase);
    const resolved = resolvePromptTexts((key) => map.get(key), routeId);

    const fieldLines = () =>
        ROUTE_SECTIONS[routeId].map(({ section, field }) => {
            const guidance = resolved.text(section);
            return field ? renderFieldLine(field, section, guidance) : guidance;
        });

    return {
        ...resolved,
        fieldLines,
        promptLines: () => [resolved.globalLine, ...fieldLines()].filter(Boolean),
    };
}
