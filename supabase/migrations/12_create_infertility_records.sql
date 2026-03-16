-- ─── Migration 00012: Create infertility_records table (if missing) ──────────
-- Combines migrations 00008 + 00009 safely using IF NOT EXISTS

-- ─── Create table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS infertility_records (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID          NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID          NOT NULL REFERENCES profiles(id),
  record_date     DATE          NOT NULL DEFAULT CURRENT_DATE,

  -- Visit sequence
  visit_number    INT,

  -- Demographics
  parity          TEXT,
  pmh             TEXT,
  psh             TEXT,
  pdh             TEXT,

  -- Clinical overview
  lmp_date        DATE,
  complaint       TEXT,
  us_findings     TEXT,
  plan            TEXT,

  -- HSG
  hsg_date        DATE,
  hsg_result      TEXT,

  -- Hormone panel
  fsh             DECIMAL(8,2),
  lh              DECIMAL(8,2),
  amh             DECIMAL(8,2),
  tsh             DECIMAL(8,2),
  prl             DECIMAL(8,2),

  -- Semen fluid analysis
  sfa_count       DECIMAL(8,2),
  sfa_motility    DECIMAL(8,2),
  sfa_morphology  DECIMAL(8,2),

  notes           TEXT,
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

-- ─── Add missing columns (safe if table already existed partially) ────────────
ALTER TABLE infertility_records ADD COLUMN IF NOT EXISTS visit_number    INT;
ALTER TABLE infertility_records ADD COLUMN IF NOT EXISTS parity          TEXT;
ALTER TABLE infertility_records ADD COLUMN IF NOT EXISTS pmh             TEXT;
ALTER TABLE infertility_records ADD COLUMN IF NOT EXISTS psh             TEXT;
ALTER TABLE infertility_records ADD COLUMN IF NOT EXISTS pdh             TEXT;
ALTER TABLE infertility_records ADD COLUMN IF NOT EXISTS hsg_date        DATE;
ALTER TABLE infertility_records ADD COLUMN IF NOT EXISTS hsg_result      TEXT;

-- ─── updated_at trigger function (create if not exists) ──────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── Trigger (drop first to avoid duplicate) ─────────────────────────────────
DROP TRIGGER IF EXISTS update_infertility_records_updated_at ON infertility_records;
CREATE TRIGGER update_infertility_records_updated_at
  BEFORE UPDATE ON infertility_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE infertility_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "doctor_all_infertility_records"       ON infertility_records;
DROP POLICY IF EXISTS "secretary_read_infertility_records"   ON infertility_records;

-- Doctor: full CRUD
CREATE POLICY "doctor_all_infertility_records"
  ON infertility_records FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- Secretary: read-only
CREATE POLICY "secretary_read_infertility_records"
  ON infertility_records FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretary')
  );
