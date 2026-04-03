-- Add married_for field to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS married_for TEXT;
