-- Preserve financial records when a patient is deleted.
-- Makes patient_id nullable in financial tables and switches FK to ON DELETE SET NULL.
-- After this migration, deleting a patient keeps their invoices/costs/operations
-- with patient_id = NULL (shown as "Deleted Patient" in reports).

DO $$
DECLARE
  con RECORD;
BEGIN

  -- ── invoices.patient_id ──────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'patient_id') THEN
    ALTER TABLE invoices ALTER COLUMN patient_id DROP NOT NULL;
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'invoices' AND kcu.column_name = 'patient_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE invoices ADD CONSTRAINT invoices_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;
  END IF;

  -- ── external_costs.patient_id ────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'external_costs' AND column_name = 'patient_id') THEN
    ALTER TABLE external_costs ALTER COLUMN patient_id DROP NOT NULL;
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'external_costs' AND kcu.column_name = 'patient_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE external_costs DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE external_costs ADD CONSTRAINT external_costs_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;
  END IF;

  -- ── operations.patient_id ────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'operations' AND column_name = 'patient_id') THEN
    ALTER TABLE operations ALTER COLUMN patient_id DROP NOT NULL;
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'operations' AND kcu.column_name = 'patient_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE operations DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE operations ADD CONSTRAINT operations_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;
  END IF;

END;
$$;
