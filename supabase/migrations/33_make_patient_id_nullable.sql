-- Make patient_id nullable in all tables that need to survive patient deletion.
-- This is the minimum required so the server action can SET patient_id = NULL
-- before deleting the patient row, preserving visit fees and financial records.
-- The server action handles the null-out explicitly, so FK cascade behaviour
-- doesn't matter after this migration runs.

ALTER TABLE medical_records  ALTER COLUMN patient_id DROP NOT NULL;
ALTER TABLE invoices          ALTER COLUMN patient_id DROP NOT NULL;
ALTER TABLE external_costs    ALTER COLUMN patient_id DROP NOT NULL;
ALTER TABLE operations        ALTER COLUMN patient_id DROP NOT NULL;
