-- ===================================================
-- Migration: Add Stripe + SSLCommerz payment support
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ===================================================

-- 1. Allow new payment_method values
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod', 'bkash', 'nagad', 'stripe', 'sslcommerz'));

-- 2. Add columns to track the gateway's own session/transaction references.
--    These let webhooks find "which order is this?" reliably.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_session_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_currency TEXT DEFAULT 'BDT';

-- 3. Helpful index for webhook lookups (find order by gateway session fast)
CREATE INDEX IF NOT EXISTS idx_orders_gateway_session_id
  ON orders (gateway_session_id);

-- 4. (Optional but recommended) Prevent duplicate webhook processing.
--    Stripe/SSLCommerz may call your webhook more than once for the same event.
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id TEXT PRIMARY KEY,           -- gateway's event/transaction id
  provider TEXT NOT NULL,        -- 'stripe' | 'sslcommerz'
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
