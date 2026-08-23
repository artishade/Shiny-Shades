-- ===================================================
-- Migration: Add SEO Title + SEO Keywords to products
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ===================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
