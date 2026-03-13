-- ─── Migration 00015: Add baby_gender to pregnancies + obstetric/lab fields ───

-- Baby gender on the pregnancy record (persists across all visits)
ALTER TABLE pregnancies
  ADD COLUMN IF NOT EXISTS baby_gender TEXT;

-- New obstetric fields on each measurement visit
ALTER TABLE pregnancy_measurements
  ADD COLUMN IF NOT EXISTS fh       TEXT,          -- Fetal Heart (PRESENT / ABSENT / ...)
  ADD COLUMN IF NOT EXISTS placenta TEXT,          -- Placenta position
  ADD COLUMN IF NOT EXISTS liquor   TEXT,          -- Amniotic fluid (ADEQUATE / REDUCED / ...)
  ADD COLUMN IF NOT EXISTS plt      DECIMAL(8,2),  -- Platelets (×10³/μL)
  ADD COLUMN IF NOT EXISTS ua       TEXT,          -- Urine Analysis
  ADD COLUMN IF NOT EXISTS hcg      DECIMAL(10,2); -- hCG (mIU/mL)
