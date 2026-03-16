-- ─── Migration 00008: Medical Forms (Infertility + ANC enhancements) ──────────

-- ─── Infertility Records Table ────────────────────────────────────────────────
-- Stores clinical history for infertility/delay-in-pregnancy patients.
-- Each row is one clinical encounter (a doctor visit for infertility evaluation).

CREATE TABLE IF NOT EXISTS infertility_records (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID          NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID          NOT NULL REFERENCES profiles(id),
  record_date     DATE          NOT NULL DEFAULT CURRENT_DATE,

  -- Clinical overview
  lmp_date        DATE,
  complaint       TEXT,
  us_findings     TEXT,
  plan            TEXT,

  -- Hormone panel (all optional numeric values)
  fsh             DECIMAL(8,2),
  lh              DECIMAL(8,2),
  amh             DECIMAL(8,2),
  tsh             DECIMAL(8,2),
  prl             DECIMAL(8,2),

  -- Semen fluid analysis (partner)
  sfa_count       DECIMAL(8,2),
  sfa_motility    DECIMAL(8,2),
  sfa_morphology  DECIMAL(8,2),

  notes           TEXT,
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

-- Auto-update updated_at on change
CREATE TRIGGER update_infertility_records_updated_at
  BEFORE UPDATE ON infertility_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS for infertility_records ─────────────────────────────────────────────

ALTER TABLE infertility_records ENABLE ROW LEVEL SECURITY;

-- Doctor: full CRUD access
CREATE POLICY "doctor_all_infertility_records"
  ON infertility_records FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- Secretary: read-only access
CREATE POLICY "secretary_read_infertility_records"
  ON infertility_records FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretary')
  );

-- ─── ANC enhancements: add ultrasound + lab fields to pregnancy_measurements ──
-- These fields support the ANC (Antenatal Care) follow-up form.

ALTER TABLE pregnancy_measurements
  ADD COLUMN IF NOT EXISTS crl      DECIMAL(8,2),   -- Crown-Rump Length (mm)
  ADD COLUMN IF NOT EXISTS bpd      DECIMAL(8,2),   -- Biparietal Diameter (mm)
  ADD COLUMN IF NOT EXISTS fl       DECIMAL(8,2),   -- Femur Length (mm)
  ADD COLUMN IF NOT EXISTS ac       DECIMAL(8,2),   -- Abdominal Circumference (mm)
  ADD COLUMN IF NOT EXISTS efw      DECIMAL(8,2),   -- Estimated Fetal Weight (g)
  ADD COLUMN IF NOT EXISTS hb       DECIMAL(8,2),   -- Hemoglobin (g/dL)
  ADD COLUMN IF NOT EXISTS rbs      DECIMAL(8,2),   -- Random Blood Sugar (mg/dL)
  ADD COLUMN IF NOT EXISTS tsh_lab  DECIMAL(8,2),   -- TSH lab value (mIU/L)
  ADD COLUMN IF NOT EXISTS ogtt     DECIMAL(8,2);   -- OGTT result (mg/dL)
