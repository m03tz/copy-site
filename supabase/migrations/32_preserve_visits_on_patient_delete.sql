-- Preserve visit records (and their fees) when a patient is deleted.
-- 1. medical_records.patient_id  → nullable, ON DELETE SET NULL
--    (so visit rows survive patient deletion, shown as "مريضة محذوفة" in reports)
-- 2. medical_records.appointment_id → ON DELETE SET NULL
--    (so deleting the patient's appointments doesn't orphan-block the visit rows)

DO $$
DECLARE
  con RECORD;
BEGIN

  -- ── 1. medical_records.patient_id ───────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name   = 'medical_records'
               AND column_name  = 'patient_id') THEN

    -- Drop NOT NULL so the column can hold NULL after patient deletion.
    ALTER TABLE medical_records ALTER COLUMN patient_id DROP NOT NULL;

    -- Drop every existing FK on patient_id (handles any name variant).
    FOR con IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema    = kcu.table_schema
      WHERE tc.table_schema   = 'public'
        AND tc.table_name     = 'medical_records'
        AND kcu.column_name   = 'patient_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
      EXECUTE 'ALTER TABLE medical_records DROP CONSTRAINT ' || con.constraint_name;
    END LOOP;

    -- Re-add FK with ON DELETE SET NULL.
    ALTER TABLE medical_records
      ADD CONSTRAINT medical_records_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

  END IF;

  -- ── 2. medical_records.appointment_id ───────────────────────────────────────
  -- appointment_id is already nullable; we just need ON DELETE SET NULL so
  -- deleting a patient's appointments doesn't block because of this FK.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name   = 'medical_records'
               AND column_name  = 'appointment_id') THEN

    FOR con IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema    = kcu.table_schema
      WHERE tc.table_schema   = 'public'
        AND tc.table_name     = 'medical_records'
        AND kcu.column_name   = 'appointment_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
      EXECUTE 'ALTER TABLE medical_records DROP CONSTRAINT ' || con.constraint_name;
    END LOOP;

    ALTER TABLE medical_records
      ADD CONSTRAINT medical_records_appointment_id_fkey
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

  END IF;

END;
$$;
