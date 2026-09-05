-- ===================================================
-- Migration: admin-authored AI prompt overrides
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
--
-- One row per prompt section the admin rewrites on /admin/ai-prompts. An
-- absent row simply means that section keeps its built-in guidance, so this
-- table starts almost empty and every AI route works unchanged without it.
--
-- key matches the catalog in src/lib/aiPromptSections.ts. Deliberately no
-- CHECK on it: adding a section should be a row, not a migration.
-- ===================================================

CREATE TABLE IF NOT EXISTS ai_prompts (
  key TEXT PRIMARY KEY,
  instruction TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

-- Admins only. Deliberately NO "Public can view" policy, unlike the
-- content tables in schema.sql.
DROP POLICY IF EXISTS "Admins can manage ai prompts" ON ai_prompts;
CREATE POLICY "Admins can manage ai prompts" ON ai_prompts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Not about secrecy -- prompts are not secrets. /api/ai-prompts is the only
-- writer, and is_admin() compares emails case-sensitively, so a browser-side
-- write would fail silently for an admin whose stored email differs in case.
-- Revoking the grants makes that the one supported path. service_role
-- bypasses both grants and RLS.
REVOKE ALL ON ai_prompts FROM anon, authenticated;

-- The master switch. Turning it off disables every override at once without
-- discarding the text the admin wrote.
INSERT INTO ai_prompts (key, instruction, is_enabled)
VALUES ('_master', '', TRUE)
ON CONFLICT (key) DO NOTHING;
