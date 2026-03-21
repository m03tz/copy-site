-- Fix: ensure invoices.patient_id has ON DELETE CASCADE so patients can be deleted.
-- Safe to run whether or not the table exists, and regardless of prior constraint names.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN

    -- Drop existing patient_id FK (constraint name varies depending on how table was created)
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'invoices' AND kcu.column_name = 'patient_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
      EXECUTE (
        SELECT 'ALTER TABLE invoices DROP CONSTRAINT ' || tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'invoices' AND kcu.column_name = 'patient_id' AND tc.constraint_type = 'FOREIGN KEY'
        LIMIT 1
      );
    END IF;

    -- Re-add with CASCADE
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_patient_id_fkey
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

    -- Drop existing appointment_id FK if it exists and lacks CASCADE
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'invoices' AND kcu.column_name = 'appointment_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
      EXECUTE (
        SELECT 'ALTER TABLE invoices DROP CONSTRAINT ' || tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'invoices' AND kcu.column_name = 'appointment_id' AND tc.constraint_type = 'FOREIGN KEY'
        LIMIT 1
      );

      ALTER TABLE invoices
        ADD CONSTRAINT invoices_appointment_id_fkey
          FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
    END IF;

  END IF;
END;
$$;
