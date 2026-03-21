-- Add completion tracking fields to operations table
ALTER TABLE operations
  ADD COLUMN IF NOT EXISTS is_completed      BOOLEAN,
  ADD COLUMN IF NOT EXISTS completed_date    DATE,
  ADD COLUMN IF NOT EXISTS completion_amount NUMERIC(10,2);
