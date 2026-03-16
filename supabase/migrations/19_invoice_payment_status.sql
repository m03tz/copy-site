-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00019 — Invoice payment status
-- Adds payment_status column to invoices: 'unpaid' (default) or 'paid'
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid'));

-- Index for filtering by payment status (e.g. financial summary of paid invoices)
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
