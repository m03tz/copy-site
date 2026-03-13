-- Operations / Surgeries table
CREATE TABLE IF NOT EXISTS operations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  operation_date  DATE NOT NULL,
  hospital_name   TEXT NOT NULL,
  operation_type  TEXT NOT NULL,
  notes           TEXT,
  doctor_id       UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast patient lookups
CREATE INDEX IF NOT EXISTS operations_patient_id_idx ON operations(patient_id);
CREATE INDEX IF NOT EXISTS operations_date_idx ON operations(operation_date DESC);

-- RLS
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

-- Doctors can do everything
CREATE POLICY "doctors_all_operations" ON operations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'doctor'
    )
  );

-- Secretaries can view
CREATE POLICY "secretaries_view_operations" ON operations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'secretary'
    )
  );
