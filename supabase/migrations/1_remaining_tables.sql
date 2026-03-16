-- 00001 REMAINING: Apply only the tables/objects that weren't created
-- during the partial initial migration run.
-- Each statement uses IF NOT EXISTS or OR REPLACE so it's safe to re-run.

-- Extension (safe to re-run)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Helper function (safe to re-run with OR REPLACE)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLES - Only create if they don't already exist
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'secretary')),
  full_name_ar TEXT NOT NULL,
  full_name_en TEXT,
  phone TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  date_of_birth DATE NOT NULL,
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  national_id TEXT UNIQUE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS doctor_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, holiday_date)
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')) DEFAULT 'scheduled',
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('consultation', 'follow_up', 'prenatal', 'ultrasound', 'other')),
  cancellation_reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  EXCLUDE USING gist (doctor_id WITH =, tstzrange(scheduled_start, scheduled_end) WITH &&) WHERE (status != 'cancelled')
);

CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  vital_signs JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  file_path TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pregnancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  lmp_date DATE NOT NULL,
  expected_due_date DATE GENERATED ALWAYS AS (lmp_date + INTERVAL '280 days') STORED,
  status TEXT NOT NULL CHECK (status IN ('active', 'delivered', 'miscarriage', 'ectopic')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pregnancy_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregnancy_id UUID NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  gestational_week INT,
  weight_kg DECIMAL(5,2),
  blood_pressure TEXT,
  fetal_heartbeat INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TRIGGERS (DROP IF EXISTS then recreate to be safe)
-- =============================================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_medical_records_updated_at ON medical_records;
CREATE TRIGGER update_medical_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_pregnancies_updated_at ON pregnancies;
CREATE TRIGGER update_pregnancies_updated_at
  BEFORE UPDATE ON pregnancies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- HELPER FUNCTION (safe to re-run with OR REPLACE)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- ROW LEVEL SECURITY - Enable on all tables (safe to re-run)
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE pregnancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pregnancy_measurements ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES - Use DROP IF EXISTS + CREATE to be idempotent
-- =============================================================================

-- PROFILES
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
CREATE POLICY "Users view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Doctor and secretary view all profiles" ON profiles;
CREATE POLICY "Doctor and secretary view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor', 'secretary'));

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Doctor and secretary insert profiles" ON profiles;
CREATE POLICY "Doctor and secretary insert profiles"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('doctor', 'secretary'));

-- PATIENTS
DROP POLICY IF EXISTS "Patients view own record" ON patients;
CREATE POLICY "Patients view own record"
  ON patients FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Doctor and secretary view all patients" ON patients;
CREATE POLICY "Doctor and secretary view all patients"
  ON patients FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor', 'secretary'));

DROP POLICY IF EXISTS "Doctor and secretary insert patients" ON patients;
CREATE POLICY "Doctor and secretary insert patients"
  ON patients FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('doctor', 'secretary'));

DROP POLICY IF EXISTS "Doctor and secretary update patients" ON patients;
CREATE POLICY "Doctor and secretary update patients"
  ON patients FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor', 'secretary'));

-- DOCTOR SCHEDULE
DROP POLICY IF EXISTS "Anyone authenticated view schedule" ON doctor_schedule;
CREATE POLICY "Anyone authenticated view schedule"
  ON doctor_schedule FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Doctor manages schedule" ON doctor_schedule;
CREATE POLICY "Doctor manages schedule"
  ON doctor_schedule FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- DOCTOR HOLIDAYS
DROP POLICY IF EXISTS "Anyone authenticated view holidays" ON doctor_holidays;
CREATE POLICY "Anyone authenticated view holidays"
  ON doctor_holidays FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Doctor manages holidays" ON doctor_holidays;
CREATE POLICY "Doctor manages holidays"
  ON doctor_holidays FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- APPOINTMENTS
DROP POLICY IF EXISTS "Patients view own appointments" ON appointments;
CREATE POLICY "Patients view own appointments"
  ON appointments FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctor and secretary view all appointments" ON appointments;
CREATE POLICY "Doctor and secretary view all appointments"
  ON appointments FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor', 'secretary'));

DROP POLICY IF EXISTS "Doctor and secretary insert appointments" ON appointments;
CREATE POLICY "Doctor and secretary insert appointments"
  ON appointments FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('doctor', 'secretary'));

DROP POLICY IF EXISTS "Doctor and secretary update appointments" ON appointments;
CREATE POLICY "Doctor and secretary update appointments"
  ON appointments FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor', 'secretary'));

DROP POLICY IF EXISTS "Doctor and secretary delete appointments" ON appointments;
CREATE POLICY "Doctor and secretary delete appointments"
  ON appointments FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor', 'secretary'));

-- MEDICAL RECORDS
DROP POLICY IF EXISTS "Patients view own medical records" ON medical_records;
CREATE POLICY "Patients view own medical records"
  ON medical_records FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctor manages all medical records" ON medical_records;
CREATE POLICY "Doctor manages all medical records"
  ON medical_records FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- PRESCRIPTIONS
DROP POLICY IF EXISTS "Patients view own prescriptions" ON prescriptions;
CREATE POLICY "Patients view own prescriptions"
  ON prescriptions FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctor manages all prescriptions" ON prescriptions;
CREATE POLICY "Doctor manages all prescriptions"
  ON prescriptions FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- PATIENT FILES
DROP POLICY IF EXISTS "Patients view own files" ON patient_files;
CREATE POLICY "Patients view own files"
  ON patient_files FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctor and secretary view all files" ON patient_files;
CREATE POLICY "Doctor and secretary view all files"
  ON patient_files FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor', 'secretary'));

DROP POLICY IF EXISTS "Doctor and secretary upload files" ON patient_files;
CREATE POLICY "Doctor and secretary upload files"
  ON patient_files FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('doctor', 'secretary'));

DROP POLICY IF EXISTS "Doctor deletes files" ON patient_files;
CREATE POLICY "Doctor deletes files"
  ON patient_files FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- PREGNANCIES
DROP POLICY IF EXISTS "Patients view own pregnancies" ON pregnancies;
CREATE POLICY "Patients view own pregnancies"
  ON pregnancies FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctor manages all pregnancies" ON pregnancies;
CREATE POLICY "Doctor manages all pregnancies"
  ON pregnancies FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- PREGNANCY MEASUREMENTS
DROP POLICY IF EXISTS "Patients view own pregnancy measurements" ON pregnancy_measurements;
CREATE POLICY "Patients view own pregnancy measurements"
  ON pregnancy_measurements FOR SELECT TO authenticated
  USING ((SELECT patient_id FROM pregnancies WHERE id = pregnancy_id) = auth.uid());

DROP POLICY IF EXISTS "Doctor manages all pregnancy measurements" ON pregnancy_measurements;
CREATE POLICY "Doctor manages all pregnancy measurements"
  ON pregnancy_measurements FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- =============================================================================
-- PERFORMANCE INDEXES (IF NOT EXISTS)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_patients_id ON patients(id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_start ON appointments(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_id ON medical_records(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_medical_record_id ON prescriptions(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_patient_files_patient_id ON patient_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_pregnancies_patient_id ON pregnancies(patient_id);
CREATE INDEX IF NOT EXISTS idx_pregnancies_status ON pregnancies(status);
CREATE INDEX IF NOT EXISTS idx_pregnancy_measurements_pregnancy_id ON pregnancy_measurements(pregnancy_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_doctor_id ON doctor_schedule(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_holidays_doctor_id ON doctor_holidays(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_holidays_date ON doctor_holidays(holiday_date);
