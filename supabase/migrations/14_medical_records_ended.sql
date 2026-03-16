-- ─── Migration 00014: Add is_ended and visit_fee to medical_records ──────────

ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS is_ended  BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visit_fee DECIMAL(8,2);
