-- Add obstetric history columns to patients table
-- gravida = total number of pregnancies (entered by doctor)
-- para    = number of deliveries (entered by doctor)
-- abortus = gravida - para (computed in application layer)

ALTER TABLE patients ADD COLUMN IF NOT EXISTS gravida INTEGER;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS para    INTEGER;
