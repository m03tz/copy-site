-- ─── Migration 00009: Infertility Records Enhancements ───────────────────────
-- Adds: parity, PMH, PSH, PDH, HSG fields, and auto visit_number per patient

ALTER TABLE infertility_records
  ADD COLUMN IF NOT EXISTS visit_number   INT,           -- auto-sequential per patient
  ADD COLUMN IF NOT EXISTS parity         TEXT,          -- e.g. P0, P1, P2
  ADD COLUMN IF NOT EXISTS pmh            TEXT,          -- Past Medical History
  ADD COLUMN IF NOT EXISTS psh            TEXT,          -- Past Surgical History
  ADD COLUMN IF NOT EXISTS pdh            TEXT,          -- Past Drug History
  ADD COLUMN IF NOT EXISTS hsg_date       DATE,          -- HSG procedure date
  ADD COLUMN IF NOT EXISTS hsg_result     TEXT;          -- HSG result description

-- ─── Auto-number existing rows (backfill) ────────────────────────────────────
-- Assign sequential visit_number per patient ordered by record_date
UPDATE infertility_records ir
SET visit_number = sub.rn
FROM (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY record_date, created_at) AS rn
  FROM infertility_records
) sub
WHERE ir.id = sub.id;
