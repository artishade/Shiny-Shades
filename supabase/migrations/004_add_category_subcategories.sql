-- ===================================================
-- Shiny Shades — Subcategory support
-- Adds a self-referencing parent_id to categories so
-- a category can optionally belong to a parent category.
-- Top-level categories have parent_id = NULL.
-- ===================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Fast lookups of "all children of category X"
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Prevent a category from being its own parent
ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_not_self_parent;
ALTER TABLE categories
  ADD CONSTRAINT categories_not_self_parent CHECK (parent_id IS DISTINCT FROM id);
