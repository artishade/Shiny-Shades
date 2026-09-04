/* ===================================================
   - Admin AI Credentials (API Keys)

   Every call goes through /api/ai-credentials with a bearer token; this page
   never touches the ai_credentials table directly, because migration 005
   revokes all browser grants on it. Keys come back masked only.
   =================================================== */

import React, { useCallback, useEffect, useState, type ReactElement } from 'react';
import { AdminAuthLayout } from '@/components/layout/AdminAuthLayout';
import { Button, Input, Modal, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Zap, CheckCircle2, XCircle } from 'lucide-react';
import type { NextPageWithLayout } from '@/types/layout';

interface Credential {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
  keyMasked: string;
  lastUsedAt: string | null;
}

interface TestResult {
  ok: boolean;
  message: string;
}

const emptyForm = { label: '', baseUrl: '', model: '', apiKey: '' };

const AdminApiKeysPage: NextPageWithLayout = () => {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [envFallback, setEnvFallback] = useState(false);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await request();
      setCreds(json.credentials || []);
      setEnvFallback(!!json.envFallback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load credentials.');
    } finally {
      setLoading(false);
    }
  }, [request]);

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

  const setActive = async (id: string) => {
    setBusyId(id);
    setError('');
    try {
      await request('', { method: 'PATCH', body: JSON.stringify({ id, isActive: true }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not activate.');
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
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">API Keys</h1>
          <p className="text-[#6B5B55] text-sm">
            OpenAI-compatible endpoints used for product AI autofill
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

      {envFallback && !creds.some((c) => c.isActive) && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
          No active credential here, but AI_BASE_URL / AI_API_KEY / AI_MODEL are set on the
          server — autofill will use those environment variables.
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
            server. The key is stored server-side and never sent back to this page.
          </p>
          <Button onClick={openAdd}>
            <Plus size={16} /> Add Credential
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {creds.map((cred) => {
            const result = testResults[cred.id];
            return (
              <div key={cred.id} className="glass-card rounded-2xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-charcoal truncate">{cred.label}</h3>
                      {cred.isActive && <Badge variant="success">Active</Badge>}
                    </div>
                    <p className="text-xs text-[#6B5B55] break-all">
                      {cred.baseUrl} · {cred.model} · key {cred.keyMasked}
                    </p>
                    {cred.lastUsedAt && (
                      <p className="text-xs text-[#6B5B55]/70 mt-0.5">
                        Last used {new Date(cred.lastUsedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!cred.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActive(cred.id)}
                        loading={busyId === cred.id}
                      >
                        Set Active
                      </Button>
                    )}
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
            <code>/v1</code>. Use a vision-capable model; the product image is sent to it.
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
