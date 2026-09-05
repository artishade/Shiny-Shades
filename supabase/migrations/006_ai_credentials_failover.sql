-- ===================================================
-- Migration: AI provider failover chain
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
--
-- Migration 005 allowed exactly one active credential. This turns the table
-- into an ordered chain: every active row is a candidate, tried in ascending
-- priority, and the last provider error is kept so the API Keys page can
-- explain why a provider was skipped.
--
-- Safe to run more than once.
-- ===================================================

ALTER TABLE ai_credentials ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 100;
ALTER TABLE ai_credentials ADD COLUMN IF NOT EXISTS last_status INT;
ALTER TABLE ai_credentials ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE ai_credentials ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;

-- The whole point of the chain is more than one active row.
DROP INDEX IF EXISTS idx_ai_credentials_single_active;

-- Existing rows all share the DEFAULT, so seed a stable order from created_at.
-- Skipped once any row has been reordered, so a re-run never clobbers the
-- admin's chosen order.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) * 10 AS seq
  FROM ai_credentials
)
UPDATE ai_credentials AS c
SET priority = ordered.seq
FROM ordered
WHERE c.id = ordered.id
  AND NOT EXISTS (SELECT 1 FROM ai_credentials WHERE priority <> 100);

-- New rows keep the DEFAULT 100 and therefore sort after the seeded ones.
CREATE INDEX IF NOT EXISTS idx_ai_credentials_chain
  ON ai_credentials (priority, created_at) WHERE is_active = TRUE;
