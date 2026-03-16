-- Add visit_type to medical_records (used when ending a visit for financial records)
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS visit_type TEXT;

-- Add completion_type to operations (used when completing an operation for financial records)
ALTER TABLE operations ADD COLUMN IF NOT EXISTS completion_type TEXT;
