-- Fix: allow staff members (doctor/secretary) to be deleted without violating FK constraints.
-- All columns that reference a staff profile are made nullable with ON DELETE SET NULL.
-- Every block checks both TABLE and COLUMN existence before altering.

DO $$
DECLARE
  con RECORD;
BEGIN

  -- ── appointments.doctor_id ───────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'doctor_id') THEN
    ALTER TABLE appointments ALTER COLUMN doctor_id DROP NOT NULL;
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'appointments' AND kcu.column_name = 'doctor_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE appointments DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE appointments ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- ── appointments.created_by ──────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'created_by') THEN
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'appointments' AND kcu.column_name = 'created_by' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE appointments DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE appointments ADD CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- ── medical_records.doctor_id ────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medical_records' AND column_name = 'doctor_id') THEN
    ALTER TABLE medical_records ALTER COLUMN doctor_id DROP NOT NULL;
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'medical_records' AND kcu.column_name = 'doctor_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE medical_records DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE medical_records ADD CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- ── prescriptions.doctor_id ──────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'doctor_id') THEN
    ALTER TABLE prescriptions ALTER COLUMN doctor_id DROP NOT NULL;
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'prescriptions' AND kcu.column_name = 'doctor_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE prescriptions DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- ── patient_files.uploaded_by ────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_files' AND column_name = 'uploaded_by') THEN
    ALTER TABLE patient_files ALTER COLUMN uploaded_by DROP NOT NULL;
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'patient_files' AND kcu.column_name = 'uploaded_by' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE patient_files DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE patient_files ADD CONSTRAINT patient_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- ── pregnancies.doctor_id ────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pregnancies' AND column_name = 'doctor_id') THEN
    ALTER TABLE pregnancies ALTER COLUMN doctor_id DROP NOT NULL;
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'pregnancies' AND kcu.column_name = 'doctor_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE pregnancies DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE pregnancies ADD CONSTRAINT pregnancies_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- ── infertility_records.doctor_id ────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'infertility_records' AND column_name = 'doctor_id') THEN
    ALTER TABLE infertility_records ALTER COLUMN doctor_id DROP NOT NULL;
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'infertility_records' AND kcu.column_name = 'doctor_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE infertility_records DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE infertility_records ADD CONSTRAINT infertility_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- ── invoices.doctor_id ───────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'doctor_id') THEN
    ALTER TABLE invoices ALTER COLUMN doctor_id DROP NOT NULL;
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'invoices' AND kcu.column_name = 'doctor_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE invoices ADD CONSTRAINT invoices_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- ── lab_tests.created_by ─────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_tests' AND column_name = 'created_by') THEN
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'lab_tests' AND kcu.column_name = 'created_by' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE lab_tests DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE lab_tests ADD CONSTRAINT lab_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- ── external_costs.doctor_id ─────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_costs' AND column_name = 'doctor_id') THEN
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'external_costs' AND kcu.column_name = 'doctor_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE external_costs DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE external_costs ADD CONSTRAINT external_costs_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- ── operations.doctor_id ─────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'operations' AND column_name = 'doctor_id') THEN
    FOR con IN
      SELECT tc.constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'operations' AND kcu.column_name = 'doctor_id' AND tc.constraint_type = 'FOREIGN KEY'
    LOOP EXECUTE 'ALTER TABLE operations DROP CONSTRAINT ' || con.constraint_name; END LOOP;
    ALTER TABLE operations ADD CONSTRAINT operations_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

END;
$$;
