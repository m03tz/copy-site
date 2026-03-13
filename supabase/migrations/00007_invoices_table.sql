-- Phase: Invoice Printing
-- Stores invoice records with sequential invoice numbers for audit trail

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number INT            NOT NULL UNIQUE DEFAULT nextval('invoice_number_seq'),
  appointment_id UUID           NOT NULL REFERENCES appointments(id),
  patient_id     UUID           NOT NULL REFERENCES patients(id),
  doctor_id      UUID           NOT NULL REFERENCES profiles(id),
  amount_jod     NUMERIC(10,2)  NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_appointment_id ON invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctor manages all invoices"
  ON invoices FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');
