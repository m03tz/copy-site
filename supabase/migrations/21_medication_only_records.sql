-- Allow medical records to be flagged as medication-only
-- These records are created when adding medications without a visit
-- They are hidden from the regular visit list

ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS medication_only BOOLEAN NOT NULL DEFAULT FALSE;
