/* ===================================================
   - Admin AI Prompts (per-field instruction overrides)

   Every call goes through /api/ai-prompts with a bearer token; this page never
   touches the ai_prompts table directly, because migration 007 revokes all
   browser grants on it.

   An instruction REPLACES the built-in guidance for that field. The JSON
   envelope, the key names, the character caps, the colour palette and the live
   category list stay with the routes, so no wording here can break a generation
   — it can only change how the copy reads.
   =================================================== */

import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { AdminAuthLayout } from '@/components/layout/AdminAuthLayout';
import { Button, Textarea } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Check, ChevronDown, ChevronRight, RotateCcw, Save } from 'lucide-react';
import {
  MAX_PROMPT_CHARS,
  PROMPT_SECTIONS,
  ROUTE_BUDGETS,
  charsForGroup,
  hasBlockingFinding,
  lintInstruction,
  renderPreview,
  sectionsForGroup,
  usedBy,
  type PromptGroup,
} from '@/lib/aiPromptSections';
import type { NextPageWithLayout } from '@/types/layout';

interface PromptRow {
  key: string;
  instruction: string;
  isEnabled: boolean;
}

const GROUP_TITLES: Record<PromptGroup, string> = {
  global: 'Brand voice',
  product: 'Product fields',
  category: 'Category fields',
  chat: 'Chat answers',
};

const GROUP_NOTES: Record<PromptGroup, string> = {
  global: 'One instruction that rides along with every section below.',
  product: 'Drive the products page autofill and the product draft in the chat.',
  category: 'Drive the category draft in the chat.',
  chat: 'The tone of the store-analyst answers. The honesty rules stay locked.',
};

const CARD_CLASS = 'glass-card rounded-2xl p-4';

const AdminAiPromptsPage: NextPageWithLayout = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [error, setError] = useState('');
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [openPreview, setOpenPreview] = useState<PromptGroup | null>(null);

  const request = useCallback(async (init: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Session expired. Sign in again.');

    const res = await fetch('/api/ai-prompts', {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json?.error || `Request failed (${res.status})`) as Error & { code?: string };
      err.code = json?.code;
      throw err;
    }
    return json;
  }, []);

  const apply = useCallback((json: { prompts?: PromptRow[]; masterEnabled?: boolean }) => {
    const nextValues: Record<string, string> = {};
    const nextEnabled: Record<string, boolean> = {};
    (json.prompts || []).forEach((row) => {
      nextValues[row.key] = row.instruction || '';
      nextEnabled[row.key] = row.isEnabled;
    });
    setValues(nextValues);
    setEnabled(nextEnabled);
    setMasterEnabled(json.masterEnabled !== false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        apply(await request());
      } catch (err) {
        if ((err as { code?: string }).code === 'migration_required') setMigrationNeeded(true);
        else setError(err instanceof Error ? err.message : 'Could not load your prompts.');
      } finally {
        setLoading(false);
      }
    })();
  }, [apply, request]);

  // A section switched off must not count against the budget or show up in the
  // preview, so every derived number reads through the same getter.
  const getText = useCallback(
    (key: string) => (enabled[key] === false ? '' : values[key] || ''),
    [enabled, values],
  );

  const findings = useMemo(() => {
    const out: Record<string, ReturnType<typeof lintInstruction>> = {};
    PROMPT_SECTIONS.forEach((section) => {
      out[section.key] = lintInstruction(section.key, getText(section.key));
    });
    return out;
  }, [getText]);

  const blocked = useMemo(
    () => PROMPT_SECTIONS.some((section) => hasBlockingFinding(findings[section.key] || [])),
    [findings],
  );

  const setValue = (key: string, value: string) => {
    setSavedAt(0);
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggle = (key: string, next: boolean) => {
    setSavedAt(0);
    setEnabled((prev) => ({ ...prev, [key]: next }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      apply(
        await request({
          method: 'PUT',
          body: JSON.stringify({
            masterEnabled,
            prompts: PROMPT_SECTIONS.map((section) => ({
              key: section.key,
              instruction: values[section.key] || '',
              isEnabled: enabled[section.key] !== false,
            })),
          }),
        }),
      );
      setSavedAt(Date.now());
    } catch (err) {
      if ((err as { code?: string }).code === 'migration_required') setMigrationNeeded(true);
      setError(err instanceof Error ? err.message : 'Could not save your prompts.');
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (key: string) => {
    const section = PROMPT_SECTIONS.find((s) => s.key === key)!;
    const value = values[key] || '';
    const isOn = enabled[key] !== false;
    const rows = findings[key] || [];

    return (
      <div key={key} className="pt-4 first:pt-0 border-t first:border-t-0 border-blush/20">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-charcoal">{section.label}</p>
            <p className="text-[11px] text-[#6B5B55]/80">Used by: {usedBy(key).join(', ')}</p>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-[#6B5B55] shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={isOn}
              disabled={!value}
              onChange={(e) => toggle(key, e.target.checked)}
              className="accent-rose-gold"
            />
            On
          </label>
        </div>
        <p className="text-[11px] text-[#6B5B55]/80 mb-2">{section.hint}</p>

        <Textarea
          rows={3}
          value={value}
          maxLength={MAX_PROMPT_CHARS}
          placeholder={section.builtIn || section.example || ''}
          onChange={(e) => setValue(key, e.target.value)}
          className="text-sm py-2"
        />

        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          <span className="text-[11px] text-[#6B5B55]/70">
            {value.length}/{MAX_PROMPT_CHARS}
          </span>
          {!value && <span className="text-[11px] text-[#6B5B55]/70">Empty — the built-in wording is used.</span>}
          {!!section.builtIn && (
            <button
              type="button"
              onClick={() => setValue(key, section.builtIn)}
              className="text-[11px] text-rose-gold hover:underline"
            >
              Start from built-in
            </button>
          )}
          {!!value && (
            <button
              type="button"
              onClick={() => setValue(key, '')}
              className="flex items-center gap-1 text-[11px] text-[#6B5B55] hover:underline"
            >
              <RotateCcw size={11} /> Clear
            </button>
          )}
        </div>

        {rows.map((finding) => (
          <p
            key={finding.message}
            className={`text-[11px] mt-1 ${finding.level === 'error' ? 'text-red-600' : 'text-yellow-700'}`}
          >
            {finding.message}
          </p>
        ))}
      </div>
    );
  };

  const renderGroup = (group: PromptGroup) => {
    const used = charsForGroup(getText, group);
    const budget = ROUTE_BUDGETS[group];
    const over = budget > 0 && used > budget;
    const previewOpen = openPreview === group;

    return (
      <div key={group} className={CARD_CLASS}>
        <p className="text-sm font-semibold text-charcoal">{GROUP_TITLES[group]}</p>
        <p className="text-[11px] text-[#6B5B55]/80 mb-4">{GROUP_NOTES[group]}</p>

        <div className="space-y-4">
          {sectionsForGroup(group).map((section) => renderSection(section.key))}
        </div>

        {budget > 0 && (
          <div className="mt-4 pt-3 border-t border-blush/20 flex flex-wrap items-center justify-between gap-2">
            <span className={`text-[11px] ${over ? 'text-red-600' : 'text-[#6B5B55]/80'}`}>
              {used} of {budget} characters per request, brand voice included
            </span>
            <button
              type="button"
              onClick={() => setOpenPreview(previewOpen ? null : group)}
              className="flex items-center gap-1 text-[11px] text-rose-gold hover:underline"
            >
              {previewOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {previewOpen ? 'Hide' : 'Preview'} what the model gets
            </button>
          </div>
        )}

        {previewOpen && (
          <pre className="mt-2 p-3 rounded-xl bg-white/70 border border-blush/30 text-[11px] text-charcoal whitespace-pre-wrap break-words">
            {renderPreview(getText, group)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">AI Prompts</h1>
        <p className="text-[#6B5B55] text-sm">
          Write your own instruction for every field the AI generates
        </p>
        <p className="text-[#6B5B55]/70 text-xs mt-1">
          Your text replaces the built-in wording for that field. The character caps, the colour
          palette, the category list and the JSON the routes expect stay fixed, so nothing here can
          break a generation.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {migrationNeeded && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
          Run <code>supabase/migrations/007_add_ai_prompts.sql</code> in the Supabase SQL editor to
          store your instructions. Until then AI generations keep using the built-in wording.
        </div>
      )}

      {loading ? (
        <div className={`${CARD_CLASS} text-sm text-[#6B5B55] animate-pulse`}>Loading your prompts…</div>
      ) : (
        <div className="space-y-4">
          <div className={CARD_CLASS}>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={masterEnabled}
                onChange={(e) => {
                  setSavedAt(0);
                  setMasterEnabled(e.target.checked);
                }}
                className="mt-0.5 accent-rose-gold"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-charcoal">Use my instructions</span>
                <span className="block text-[11px] text-[#6B5B55]/80">
                  Turn this off to fall back to the built-in wording everywhere without deleting
                  anything you wrote. The first thing to try if a generation looks wrong.
                </span>
              </span>
            </label>
          </div>

          {(['global', 'product', 'category', 'chat'] as PromptGroup[]).map(renderGroup)}

          <div className="sticky bottom-0 py-3 bg-soft-bg/90 backdrop-blur-sm flex flex-wrap items-center justify-end gap-3">
            {blocked && (
              <span className="text-[11px] text-red-600">
                Fix the instructions marked in red before saving.
              </span>
            )}
            {!!savedAt && !blocked && (
              <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                <Check size={14} /> Saved — the next generation uses it
              </span>
            )}
            <Button onClick={save} loading={saving} disabled={blocked || migrationNeeded}>
              <Save size={16} /> Save prompts
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

AdminAiPromptsPage.getLayout = function getLayout(page: ReactElement) {
  return <AdminAuthLayout>{page}</AdminAuthLayout>;
};

export default AdminAiPromptsPage;
