-- Soft delete for medical_records: preserve financial data after "deletion"
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
