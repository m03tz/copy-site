-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00010 — Invoice line items
-- • Makes invoices.appointment_id nullable (invoices can exist without a visit)
-- • Makes invoices.amount_jod nullable (total is now computed from items)
-- • Creates invoice_items table (many items per invoice)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Relax constraints on invoices table
ALTER TABLE invoices
  ALTER COLUMN appointment_id DROP NOT NULL,
  ALTER COLUMN amount_jod     DROP NOT NULL;

ALTER TABLE invoices
  ALTER COLUMN amount_jod SET DEFAULT 0;

-- 2. Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT           NOT NULL,
  amount_jod  NUMERIC(10,2)  NOT NULL CHECK (amount_jod > 0),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- 3. RLS on invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Doctor has full access
CREATE POLICY "doctor_full_invoice_items"
  ON invoice_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Secretary can read
CREATE POLICY "secretary_read_invoice_items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'secretary'
    )
  );
