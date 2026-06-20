-- Add job_description field to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS job_description TEXT;
