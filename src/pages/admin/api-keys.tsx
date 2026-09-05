/* ===================================================
   - Admin AI Credentials (API Keys)

   Every call goes through /api/ai-credentials with a bearer token; this page
   never touches the ai_credentials table directly, because migration 005
   revokes all browser grants on it. Keys come back masked only.

   The list is a failover chain, not a flat set: order is meaningful, and every
   provider "in rotation" is tried top to bottom until one answers.
   =================================================== */

import React, { useCallback, useEffect, useState, type ReactElement } from 'react';
import { AdminAuthLayout } from '@/components/layout/AdminAuthLayout';
import { Button, Input, Modal, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import {
  Plus, Edit2, Trash2, Zap, CheckCircle2, XCircle, ArrowUp, ArrowDown,
} from 'lucide-react';
import type { NextPageWithLayout } from '@/types/layout';

interface Credential {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
  keyMasked: string;
  lastUsedAt: string | null;
  priority: number;
  lastStatus: number | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

interface TestResult {
  ok: boolean;
  message: string;
}

const emptyForm = { label: '', baseUrl: '', model: '', apiKey: '' };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '');

const AdminApiKeysPage: NextPageWithLayout = () => {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [envFallback, setEnvFallback] = useState(false);
  const [failoverReady, setFailoverReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const request = useCallback(async (query = '', init: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Session expired. Sign in again.');

    const res = await fetch(`/api/ai-credentials${query}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    return json;
  }, []);

  const apply = useCallback((json: { credentials?: Credential[]; envFallback?: boolean; failoverReady?: boolean }) => {
    setCreds(json.credentials || []);
    setEnvFallback(!!json.envFallback);
    setFailoverReady(json.failoverReady !== false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      apply(await request());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load credentials.');
    } finally {
      setLoading(false);
    }
  }, [request, apply]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (cred: Credential) => {
    setEditing(cred);
    // apiKey stays blank on purpose: the server keeps the stored key when this
    // field is empty, so a label edit never needs the secret retyped.
    setForm({ label: cred.label, baseUrl: cred.baseUrl, model: cred.model, apiKey: '' });
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = editing ? { id: editing.id, ...form } : form;
      await request('', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const toggleRotation = async (cred: Credential) => {
    setBusyId(cred.id);
    setError('');
    try {
      await request('', {
        method: 'PATCH',
        body: JSON.stringify({ id: cred.id, isActive: !cred.isActive }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update rotation.');
    } finally {
      setBusyId(null);
    }
  };

  // The whole order is posted, not a single move, so the server can rewrite
  // every priority in one pass.
  const move = async (index: number, delta: number) => {
    const next = [...creds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    setCreds(next);
    setBusyId(creds[index].id);
    setError('');
    try {
      apply(await request('', {
        method: 'POST',
        body: JSON.stringify({ action: 'reorder', ids: next.map((c) => c.id) }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder.');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (cred: Credential) => {
    if (!confirm(`Delete "${cred.label}"? This cannot be undone.`)) return;
    setBusyId(cred.id);
    setError('');
    try {
      await request(`?id=${encodeURIComponent(cred.id)}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
    } finally {
      setBusyId(null);
    }
  };

  // Returns 200 even when the provider rejects us, so the raw message can be
  // shown — a missing /v1 segment is otherwise impossible to diagnose.
  const test = async (id: string) => {
    setTestingId(id);
    try {
      const json = await request('', { method: 'POST', body: JSON.stringify({ action: 'test', id }) });
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: !!json.ok, message: json.message || (json.ok ? 'Connection OK' : 'Failed') },
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, message: err instanceof Error ? err.message : 'Test failed.' },
      }));
    } finally {
      setTestingId(null);
      // The server recorded the outcome, so the stored error line is now stale.
      try { apply(await request()); } catch { /* the inline result already says enough */ }
    }
  };

  let rank = 0;
  const rows = creds.map((cred) => ({ cred, rank: cred.isActive ? (rank += 1) : 0 }));
  const nothingInRotation = !loading && !creds.some((c) => c.isActive);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">API Keys</h1>
          <p className="text-[#6B5B55] text-sm">
            OpenAI-compatible endpoints for product autofill and AI chat
          </p>
          <p className="text-[#6B5B55]/70 text-xs mt-1">
            Providers in rotation are tried top to bottom. If one errors, times out or runs out of
            quota, the next one takes over automatically.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} /> Add Credential
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {!failoverReady && creds.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
          Run <code>supabase/migrations/006_ai_credentials_failover.sql</code> in the Supabase SQL
          editor to enable ordering and error tracking. Until then only one provider can be in
          rotation at a time.
        </div>
      )}

      {nothingInRotation && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
          {envFallback
            ? 'No provider is in rotation, but AI_BASE_URL / AI_API_KEY / AI_MODEL are set on the server — those will be used.'
            : 'No provider is in rotation. AI autofill and AI chat will fail until you add one.'}
        </div>
      )}

      {envFallback && !nothingInRotation && (
        <div className="mb-4 p-3 rounded-xl bg-blush-light/40 border border-blush/30 text-sm text-[#6B5B55]">
          The server also has AI_BASE_URL / AI_API_KEY / AI_MODEL set, so those sit at the end of
          the chain as a last resort.
        </div>
      )}

      {loading ? (
        <p className="text-[#6B5B55] text-sm animate-pulse">Loading…</p>
      ) : creds.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <h3 className="heading-serif text-xl font-semibold text-charcoal mb-2">
            No credentials yet
          </h3>
          <p className="text-[#6B5B55] text-sm mb-4">
            Add an OpenAI-compatible endpoint — OpenRouter, Groq, DeepSeek, OpenAI or a local
            server. The key is stored server-side and never sent back to this page. Add two or
            three and one running out of quota stops mattering.
          </p>
          <Button onClick={openAdd}>
            <Plus size={16} /> Add Credential
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ cred, rank: position }, index) => {
            const result = testResults[cred.id];
            return (
              <div key={cred.id} className="glass-card rounded-2xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-0.5 w-7 h-7 flex-shrink-0 rounded-full text-xs font-semibold flex items-center justify-center ${
                        position
                          ? 'bg-rose-gold text-white'
                          : 'bg-blush-light/60 text-[#6B5B55]'
                      }`}
                      title={position ? `Tried ${position === 1 ? 'first' : `#${position}`}` : 'Not in rotation'}
                    >
                      {position ? `#${position}` : '–'}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-charcoal truncate">{cred.label}</h3>
                        {cred.isActive
                          ? <Badge variant="success">in rotation</Badge>
                          : <Badge variant="default">standby</Badge>}
                      </div>
                      <p className="text-xs text-[#6B5B55] break-all">
                        {cred.baseUrl} · {cred.model} · key {cred.keyMasked}
                      </p>
                      {cred.lastUsedAt && (
                        <p className="text-xs text-[#6B5B55]/70 mt-0.5">
                          Last used {when(cred.lastUsedAt)}
                        </p>
                      )}
                      {cred.lastError && (
                        <p className="text-xs text-red-600 mt-0.5 break-all">
                          {cred.lastStatus ? `${cred.lastStatus} · ` : ''}{cred.lastError}
                          {cred.lastErrorAt ? ` · ${when(cred.lastErrorAt)}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || !failoverReady}
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => move(index, 1)}
                        disabled={index === rows.length - 1 || !failoverReady}
                      >
                        <ArrowDown size={14} />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleRotation(cred)}
                      loading={busyId === cred.id}
                    >
                      {cred.isActive ? 'Pause' : 'Use'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => test(cred.id)}
                      loading={testingId === cred.id}
                    >
                      <Zap size={14} /> Test
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(cred)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(cred)}>
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                </div>

                {result && (
                  <div
                    className={`mt-3 flex items-start gap-2 text-xs ${result.ok ? 'text-green-700' : 'text-red-600'}`}
                  >
                    {result.ok ? (
                      <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                    )}
                    <span className="break-all">{result.message}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Credential' : 'Add Credential'}
      >
        <div className="space-y-4">
          <Input
            id="cred-label"
            label="Label"
            placeholder="OpenRouter — free vision"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <Input
            id="cred-base-url"
            label="Base URL"
            placeholder="https://openrouter.ai/api/v1"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          />
          <Input
            id="cred-model"
            label="Model"
            placeholder="qwen/qwen2.5-vl-72b-instruct"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
          <Input
            id="cred-api-key"
            label={editing ? 'API Key (leave blank to keep the current one)' : 'API Key'}
            type="password"
            autoComplete="off"
            placeholder={editing ? '••••••••' : 'sk-…'}
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          />

          <p className="text-xs text-[#6B5B55]">
            Base URL is the root that serves <code>/chat/completions</code> — usually ending in{' '}
            <code>/v1</code>. A vision-capable model is needed for product autofill; a text-only
            provider still works for AI chat and is skipped automatically when an image is sent.
          </p>

          <div className="flex gap-3 pt-2">
            <Button onClick={save} loading={saving} fullWidth>
              {editing ? 'Save Changes' : 'Add Credential'}
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)} fullWidth>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

AdminApiKeysPage.getLayout = function getLayout(page: ReactElement) {
  return <AdminAuthLayout>{page}</AdminAuthLayout>;
};

export default AdminApiKeysPage;
