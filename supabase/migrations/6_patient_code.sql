-- Phase: Patient Code
-- Adds a searchable patient_code column generated from DDMMYY + first letter of first name + first letter of last name

ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_patients_patient_code ON patients(patient_code);

-- Backfill existing patients that have a date_of_birth
UPDATE patients p
SET patient_code = (
  SELECT
    TO_CHAR(p.date_of_birth, 'DDMMYY') ||
    UPPER(LEFT(SPLIT_PART(TRIM(pr.full_name_ar), ' ', 1), 1)) ||
    UPPER(LEFT(SPLIT_PART(TRIM(pr.full_name_ar), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(pr.full_name_ar), ' '), 1)), 1))
  FROM profiles pr WHERE pr.id = p.id
  AND pr.full_name_ar IS NOT NULL AND pr.full_name_ar <> ''
)
WHERE p.date_of_birth IS NOT NULL;
