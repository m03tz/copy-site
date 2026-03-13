-- External operation costs: standalone financial records not tied to a visit
CREATE TABLE IF NOT EXISTS external_costs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  cost_date   DATE NOT NULL,
  visit_type  TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  doctor_id   UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX external_costs_date_idx ON external_costs(cost_date DESC);
CREATE INDEX external_costs_patient_idx ON external_costs(patient_id);

ALTER TABLE external_costs ENABLE ROW LEVEL SECURITY;

-- Doctors have full access
CREATE POLICY "doctors_all_external_costs" ON external_costs
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- Secretaries can view
CREATE POLICY "secretaries_view_external_costs" ON external_costs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretary')
  );
