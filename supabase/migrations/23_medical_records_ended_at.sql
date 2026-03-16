-- Add ended_at timestamp to medical_records so we can auto-delete ended visits after 24 hours
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
