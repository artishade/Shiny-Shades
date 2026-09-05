// Temporary: proves the failover chain works against the live DB. Deleted after.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
    callChatCompletionsWithFailover,
    isRequestFault,
    recordCredentialOutcome,
    resolveCredentialChain,
} from './src/pages/api/_lib/aiCredentials.js';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
}

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
);

const { data: rows } = await supabase.from('ai_credentials').select('*');
console.log('--- rows:', (rows || []).length, 'columns:', Object.keys(rows?.[0] || {}).join(', '));
console.log('--- has priority column:', rows?.[0]?.priority !== undefined);

const chain = await resolveCredentialChain(supabase);
console.log('--- chain:', chain.map((c) => `${c.label}/${c.model} p=${c.priority} src=${c.source}`));

if (!chain.length) {
    console.log('no credentials, stopping');
    process.exit(0);
}

const body = { messages: [{ role: 'user', content: 'say OK' }], max_tokens: 8 };

// 1. A dead key in front of a working one must fall through.
const broken = { ...chain[0], id: null, source: 'test', label: 'BROKEN-KEY', apiKey: 'sk-not-a-real-key' };
const bogusHost = {
    ...chain[0], id: null, source: 'test', label: 'BOGUS-MODEL',
    model: 'definitely/not-a-real-model-xyz',
};

const call = await callChatCompletionsWithFailover([broken, bogusHost, ...chain], body, {
    timeoutMs: 20000,
    budgetMs: 45000,
});
console.log('--- failover ok:', call.ok, '| answered by:', call.cred?.label, call.cred?.model);
console.log('--- attempts:', call.attempts.map((a) => `${a.cred.label} -> ${a.status} ${a.message.slice(0, 70)}`));
console.log('--- reply:', JSON.stringify(call.json?.choices?.[0]?.message?.content || '').slice(0, 120));

// 2. Recording must degrade quietly on a pre-migration table.
await recordCredentialOutcome(supabase, call);
const { data: after } = await supabase.from('ai_credentials').select('*');
console.log('--- after record:', (after || []).map((r) => `${r.label} used=${r.last_used_at} err=${r.last_error ?? 'n/a'}`));

// 3. A context-length 400 must NOT fail over.
console.log('--- request fault (context):', isRequestFault({ status: 400, message: 'maximum context length exceeded' }));
console.log('--- request fault (bad key):', isRequestFault({ status: 401, message: 'invalid api key' }));
console.log('--- request fault (429):', isRequestFault({ status: 429, message: 'rate limit' }));

// 4. An all-dead chain must return the last failure, not throw.
const dead = await callChatCompletionsWithFailover([broken], body, { timeoutMs: 8000, budgetMs: 10000 });
console.log('--- all dead:', dead.ok, dead.status, String(dead.message).slice(0, 80), '| attempts:', dead.attempts.length);
