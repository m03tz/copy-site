-- Lab Tests table
CREATE TABLE IF NOT EXISTS lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  test_type TEXT NOT NULL, -- e.g. 'CBC', 'urine', 'LFT', 'KFT', 'other'
  test_name TEXT NOT NULL,
  result TEXT,
  reference_values TEXT,
  doctor_notes TEXT,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage lab tests"
  ON lab_tests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('doctor', 'secretary', 'admin')
    )
  );

CREATE POLICY "Patients can read their own lab tests"
  ON lab_tests FOR SELECT
  USING (patient_id = auth.uid());
