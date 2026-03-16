-- Add nickname to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Add quantity (عدد الحبات) to prescriptions table
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS quantity TEXT;
