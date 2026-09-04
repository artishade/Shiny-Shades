-- ===================================================
-- Migration: AI provider credentials (admin-managed at runtime)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
--
-- Holds OpenAI-compatible endpoints used by /api/ai-product-metadata.
-- Read ONLY server-side with the service role key. The browser talks to
-- /api/ai-credentials, which never returns api_key in plaintext.
-- ===================================================

CREATE TABLE IF NOT EXISTS ai_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- At most one active row, enforced by the database rather than a trigger.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_credentials_single_active
  ON ai_credentials (is_active) WHERE is_active = TRUE;

ALTER TABLE ai_credentials ENABLE ROW LEVEL SECURITY;

-- Admins only. Deliberately NO "Public can view" policy, unlike the
-- content tables in schema.sql.
DROP POLICY IF EXISTS "Admins can manage ai credentials" ON ai_credentials;
CREATE POLICY "Admins can manage ai credentials" ON ai_credentials
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Belt and braces: without table-level grants, PostgREST cannot expose this
-- table to a browser session at all -- not even to a logged-in admin whose
-- JWT satisfies is_admin(). service_role bypasses both grants and RLS.
REVOKE ALL ON ai_credentials FROM anon, authenticated;
