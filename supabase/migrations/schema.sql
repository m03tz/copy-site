-- =============================================================================
-- Dr. Fadi Women's Health Clinic — Complete Schema
-- Single-file schema combining all migrations (1–33).
-- Run once on a fresh Supabase project to create the full database.
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- SEQUENCES
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- =============================================================================
-- TABLES
-- =============================================================================

-- 1. Profiles — extends auth.users with role and personal info
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL CHECK (role IN ('patient', 'doctor', 'secretary')),
  full_name_ar TEXT,
  full_name_en TEXT,
  phone        TEXT        UNIQUE,
  email        TEXT        UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patients — patient-specific data
CREATE TABLE IF NOT EXISTS patients (
  id                      UUID    PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  date_of_birth           DATE,
  blood_type              TEXT    CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  national_id             TEXT    UNIQUE,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  notes                   TEXT,
  patient_code            TEXT    UNIQUE,
  nickname                TEXT,
  pmh                     TEXT,
  psh                     TEXT,
  pdh                     TEXT,
  parity                  TEXT,
  gravida                 INTEGER,
  para                    INTEGER,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Doctor schedule
CREATE TABLE IF NOT EXISTS doctor_schedule (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id             UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week           INT     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time            TIME    NOT NULL,
  end_time              TIME    NOT NULL,
  slot_duration_minutes INT     NOT NULL DEFAULT 30,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, day_of_week)
);

-- 4. Doctor holidays
CREATE TABLE IF NOT EXISTS doctor_holidays (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, holiday_date)
);

-- 5. Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id                 UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  scheduled_start           TIMESTAMPTZ NOT NULL,
  scheduled_end             TIMESTAMPTZ NOT NULL,
  status                    TEXT        NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled','confirmed','cancelled','completed')),
  appointment_type          TEXT        NOT NULL
                              CHECK (appointment_type IN ('consultation','follow_up','prenatal','ultrasound','other')),
  cancellation_reason       TEXT,
  notes                     TEXT,
  created_by                UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  whatsapp_reminder_sent_at TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  EXCLUDE USING gist (doctor_id WITH =, tstzrange(scheduled_start, scheduled_end) WITH &&)
    WHERE (status != 'cancelled')
);

-- 6. Medical records — visit records
--    patient_id nullable + ON DELETE SET NULL so visit fees survive patient deletion
--    (shown as "مريضة محذوفة" in Financial/Visitors reports).
CREATE TABLE IF NOT EXISTS medical_records (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID        REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id  UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  doctor_id       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  visit_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT,
  diagnosis       TEXT,
  treatment_plan  TEXT,
  vital_signs     JSONB,
  notes           TEXT,
  is_ended        BOOLEAN     DEFAULT FALSE,
  visit_fee       DECIMAL(8,2),
  medication_only BOOLEAN     NOT NULL DEFAULT FALSE,
  ended_at        TIMESTAMPTZ,
  visit_type      TEXT,
  deleted_at      TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  medication_name   TEXT NOT NULL,
  dosage            TEXT NOT NULL,
  duration          TEXT NOT NULL,
  instructions      TEXT,
  quantity          TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Patient files
CREATE TABLE IF NOT EXISTS patient_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  uploaded_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_name         TEXT NOT NULL,
  file_type         TEXT NOT NULL CHECK (file_type IN ('image','pdf')),
  file_path         TEXT NOT NULL,
  description       TEXT,
  medical_record_id UUID REFERENCES medical_records(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Pregnancies
CREATE TABLE IF NOT EXISTS pregnancies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lmp_date          DATE NOT NULL,
  expected_due_date DATE GENERATED ALWAYS AS (lmp_date + INTERVAL '280 days') STORED,
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','delivered','miscarriage','ectopic')),
  baby_gender       TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Pregnancy measurements (ANC visits)
CREATE TABLE IF NOT EXISTS pregnancy_measurements (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pregnancy_id     UUID        NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  measured_at      DATE        NOT NULL DEFAULT CURRENT_DATE,
  gestational_week INT,
  weight_kg        DECIMAL(5,2),
  blood_pressure   TEXT,
  fetal_heartbeat  INT,
  crl              DECIMAL(8,2),   -- Crown-Rump Length (mm)
  bpd              DECIMAL(8,2),   -- Biparietal Diameter (mm)
  fl               DECIMAL(8,2),   -- Femur Length (mm)
  ac               DECIMAL(8,2),   -- Abdominal Circumference (mm)
  efw              DECIMAL(8,2),   -- Estimated Fetal Weight (g)
  hb               DECIMAL(8,2),   -- Hemoglobin (g/dL)
  rbs              DECIMAL(8,2),   -- Random Blood Sugar (mg/dL)
  tsh_lab          DECIMAL(8,2),   -- TSH (mIU/L)
  ogtt             DECIMAL(8,2),   -- OGTT result (mg/dL)
  ogtt_fasting     DECIMAL(8,2),   -- OGTT Fasting (mg/dL)
  ogtt_1hr         DECIMAL(8,2),   -- OGTT 1hr (mg/dL)
  ogtt_2hr         DECIMAL(8,2),   -- OGTT 2hr (mg/dL)
  fh               TEXT,           -- Fetal Heart (PRESENT/ABSENT/...)
  placenta         TEXT,
  liquor           TEXT,           -- ADEQUATE/REDUCED/...
  plt              DECIMAL(8,2),   -- Platelets (x10³/μL)
  ua               TEXT,           -- Urine Analysis
  hcg              DECIMAL(10,2),  -- hCG (mIU/mL)
  b_hcg            DECIMAL(10,2),  -- β-hCG (mIU/mL)
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Infertility records
CREATE TABLE IF NOT EXISTS infertility_records (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  record_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  visit_number   INT,
  parity         TEXT,
  pmh            TEXT,
  psh            TEXT,
  pdh            TEXT,
  lmp_date       DATE,
  complaint      TEXT,
  us_findings    TEXT,
  plan           TEXT,
  hsg_date       DATE,
  hsg_result     TEXT,
  fsh            DECIMAL(8,2),
  lh             DECIMAL(8,2),
  amh            DECIMAL(8,2),
  tsh            DECIMAL(8,2),
  prl            DECIMAL(8,2),
  sfa_count      DECIMAL(8,2),
  sfa_motility   DECIMAL(8,2),
  sfa_morphology DECIMAL(8,2),
  sfa_viscosity  TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 12. Invoices
--     patient_id nullable + ON DELETE SET NULL so invoices survive patient deletion.
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number INT            NOT NULL UNIQUE DEFAULT nextval('invoice_number_seq'),
  appointment_id UUID           REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id     UUID           REFERENCES patients(id) ON DELETE SET NULL,
  doctor_id      UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  amount_jod     NUMERIC(10,2)  DEFAULT 0,
  notes          TEXT,
  payment_status TEXT           NOT NULL DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid','paid')),
  created_at     TIMESTAMPTZ    DEFAULT NOW()
);

-- 13. Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT           NOT NULL,
  amount_jod  NUMERIC(10,2)  NOT NULL CHECK (amount_jod > 0),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- 14. Lab tests
CREATE TABLE IF NOT EXISTS lab_tests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  test_type         TEXT NOT NULL,
  test_name         TEXT NOT NULL,
  result            TEXT,
  reference_values  TEXT,
  doctor_notes      TEXT,
  test_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 15. Operations / Surgeries
--     patient_id nullable + ON DELETE SET NULL so records survive patient deletion.
CREATE TABLE IF NOT EXISTS operations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID        REFERENCES patients(id) ON DELETE SET NULL,
  operation_date  DATE        NOT NULL,
  hospital_name   TEXT        NOT NULL,
  operation_type  TEXT        NOT NULL,
  completion_type TEXT,
  notes           TEXT,
  doctor_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. External costs — standalone financial records not tied to a visit
--     patient_id nullable + ON DELETE SET NULL so records survive patient deletion.
CREATE TABLE IF NOT EXISTS external_costs (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID           REFERENCES patients(id) ON DELETE SET NULL,
  cost_date  DATE           NOT NULL,
  visit_type TEXT           NOT NULL,
  amount     NUMERIC(10,2)  NOT NULL CHECK (amount > 0),
  doctor_id  UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at             ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_appointments_updated_at         ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_medical_records_updated_at      ON medical_records;
CREATE TRIGGER update_medical_records_updated_at
  BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_pregnancies_updated_at          ON pregnancies;
CREATE TRIGGER update_pregnancies_updated_at
  BEFORE UPDATE ON pregnancies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_infertility_records_updated_at  ON infertility_records;
CREATE TRIGGER update_infertility_records_updated_at
  BEFORE UPDATE ON infertility_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- HELPER FUNCTION: get_user_role (requires profiles table to exist)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedule        ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_holidays        ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_files          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pregnancies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pregnancy_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE infertility_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_costs         ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROFILES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users view own profile"                ON profiles;
CREATE POLICY "Users view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Doctor and secretary view all profiles" ON profiles;
CREATE POLICY "Doctor and secretary view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Users update own profile"              ON profiles;
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT get_user_role()));

DROP POLICY IF EXISTS "Doctor and secretary update profiles"  ON profiles;
CREATE POLICY "Doctor and secretary update profiles"
  ON profiles FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Doctor and secretary insert profiles"  ON profiles;
CREATE POLICY "Doctor and secretary insert profiles"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Doctor deletes profiles"               ON profiles;
CREATE POLICY "Doctor deletes profiles"
  ON profiles FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- -----------------------------------------------------------------------------
-- PATIENTS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Patients view own record"              ON patients;
CREATE POLICY "Patients view own record"
  ON patients FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Doctor and secretary view all patients" ON patients;
CREATE POLICY "Doctor and secretary view all patients"
  ON patients FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Doctor and secretary insert patients"  ON patients;
CREATE POLICY "Doctor and secretary insert patients"
  ON patients FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Doctor and secretary update patients"  ON patients;
CREATE POLICY "Doctor and secretary update patients"
  ON patients FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Doctor deletes patients"               ON patients;
CREATE POLICY "Doctor deletes patients"
  ON patients FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- -----------------------------------------------------------------------------
-- DOCTOR SCHEDULE
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone authenticated view schedule"    ON doctor_schedule;
CREATE POLICY "Anyone authenticated view schedule"
  ON doctor_schedule FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Doctor manages schedule"               ON doctor_schedule;
CREATE POLICY "Doctor manages schedule"
  ON doctor_schedule FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- -----------------------------------------------------------------------------
-- DOCTOR HOLIDAYS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone authenticated view holidays"    ON doctor_holidays;
CREATE POLICY "Anyone authenticated view holidays"
  ON doctor_holidays FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Doctor manages holidays"               ON doctor_holidays;
CREATE POLICY "Doctor manages holidays"
  ON doctor_holidays FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- -----------------------------------------------------------------------------
-- APPOINTMENTS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Patients view own appointments"               ON appointments;
CREATE POLICY "Patients view own appointments"
  ON appointments FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctor and secretary view all appointments"   ON appointments;
CREATE POLICY "Doctor and secretary view all appointments"
  ON appointments FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Doctor and secretary insert appointments"     ON appointments;
CREATE POLICY "Doctor and secretary insert appointments"
  ON appointments FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Doctor and secretary update appointments"     ON appointments;
CREATE POLICY "Doctor and secretary update appointments"
  ON appointments FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Doctor and secretary delete appointments"     ON appointments;
CREATE POLICY "Doctor and secretary delete appointments"
  ON appointments FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor','secretary'));

-- -----------------------------------------------------------------------------
-- MEDICAL RECORDS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Patients view own medical records"     ON medical_records;
CREATE POLICY "Patients view own medical records"
  ON medical_records FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctor manages all medical records"    ON medical_records;
CREATE POLICY "Doctor manages all medical records"
  ON medical_records FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

DROP POLICY IF EXISTS "Secretary views all medical records"   ON medical_records;
CREATE POLICY "Secretary views all medical records"
  ON medical_records FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) = 'secretary');

DROP POLICY IF EXISTS "Secretary inserts medical records"     ON medical_records;
CREATE POLICY "Secretary inserts medical records"
  ON medical_records FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) = 'secretary');

DROP POLICY IF EXISTS "Secretary updates medical records"     ON medical_records;
CREATE POLICY "Secretary updates medical records"
  ON medical_records FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) = 'secretary');

-- -----------------------------------------------------------------------------
-- PRESCRIPTIONS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Patients view own prescriptions"       ON prescriptions;
CREATE POLICY "Patients view own prescriptions"
  ON prescriptions FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctor manages all prescriptions"      ON prescriptions;
CREATE POLICY "Doctor manages all prescriptions"
  ON prescriptions FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- -----------------------------------------------------------------------------
-- PATIENT FILES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Patients view own files"               ON patient_files;
CREATE POLICY "Patients view own files"
  ON patient_files FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctor and secretary view all files"   ON patient_files;
CREATE POLICY "Doctor and secretary view all files"
  ON patient_files FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Doctor and secretary upload files"     ON patient_files;
CREATE POLICY "Doctor and secretary upload files"
  ON patient_files FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('doctor','secretary'));

DROP POLICY IF EXISTS "Doctor and secretary delete files"     ON patient_files;
CREATE POLICY "Doctor and secretary delete files"
  ON patient_files FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor','secretary'));

-- -----------------------------------------------------------------------------
-- PREGNANCIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Patients view own pregnancies"         ON pregnancies;
CREATE POLICY "Patients view own pregnancies"
  ON pregnancies FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctor manages all pregnancies"        ON pregnancies;
CREATE POLICY "Doctor manages all pregnancies"
  ON pregnancies FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- -----------------------------------------------------------------------------
-- PREGNANCY MEASUREMENTS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Patients view own pregnancy measurements" ON pregnancy_measurements;
CREATE POLICY "Patients view own pregnancy measurements"
  ON pregnancy_measurements FOR SELECT TO authenticated
  USING ((SELECT patient_id FROM pregnancies WHERE id = pregnancy_id) = auth.uid());

DROP POLICY IF EXISTS "Doctor manages all pregnancy measurements" ON pregnancy_measurements;
CREATE POLICY "Doctor manages all pregnancy measurements"
  ON pregnancy_measurements FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- -----------------------------------------------------------------------------
-- INFERTILITY RECORDS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "doctor_all_infertility_records"        ON infertility_records;
CREATE POLICY "doctor_all_infertility_records"
  ON infertility_records FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

DROP POLICY IF EXISTS "secretary_read_infertility_records"    ON infertility_records;
CREATE POLICY "secretary_read_infertility_records"
  ON infertility_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretary'));

-- -----------------------------------------------------------------------------
-- INVOICES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Doctor manages all invoices"           ON invoices;
CREATE POLICY "Doctor manages all invoices"
  ON invoices FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- -----------------------------------------------------------------------------
-- INVOICE ITEMS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "doctor_full_invoice_items"             ON invoice_items;
CREATE POLICY "doctor_full_invoice_items"
  ON invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

DROP POLICY IF EXISTS "secretary_read_invoice_items"          ON invoice_items;
CREATE POLICY "secretary_read_invoice_items"
  ON invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretary'));

-- -----------------------------------------------------------------------------
-- LAB TESTS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Staff can manage lab tests"            ON lab_tests;
CREATE POLICY "Staff can manage lab tests"
  ON lab_tests FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('doctor','secretary','admin')
  ));

DROP POLICY IF EXISTS "Patients can read their own lab tests" ON lab_tests;
CREATE POLICY "Patients can read their own lab tests"
  ON lab_tests FOR SELECT
  USING (patient_id = auth.uid());

-- -----------------------------------------------------------------------------
-- OPERATIONS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "doctors_all_operations"                ON operations;
CREATE POLICY "doctors_all_operations"
  ON operations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'doctor'));

DROP POLICY IF EXISTS "secretaries_view_operations"           ON operations;
CREATE POLICY "secretaries_view_operations"
  ON operations FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'secretary'));

-- -----------------------------------------------------------------------------
-- EXTERNAL COSTS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "doctors_all_external_costs"            ON external_costs;
CREATE POLICY "doctors_all_external_costs"
  ON external_costs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

DROP POLICY IF EXISTS "secretaries_view_external_costs"       ON external_costs;
CREATE POLICY "secretaries_view_external_costs"
  ON external_costs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretary'));

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_id_role                    ON profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_patients_id                         ON patients(id);
CREATE INDEX IF NOT EXISTS idx_patients_patient_code               ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id             ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id              ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_start        ON appointments(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_appointments_status                 ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id          ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id           ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_id      ON medical_records(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id            ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_medical_record_id     ON prescriptions(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_patient_files_patient_id            ON patient_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_files_medical_record_id     ON patient_files(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_pregnancies_patient_id              ON pregnancies(patient_id);
CREATE INDEX IF NOT EXISTS idx_pregnancies_status                  ON pregnancies(status);
CREATE INDEX IF NOT EXISTS idx_pregnancy_measurements_pregnancy_id ON pregnancy_measurements(pregnancy_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_doctor_id           ON doctor_schedule(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_holidays_doctor_id           ON doctor_holidays(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_holidays_date                ON doctor_holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_invoices_appointment_id             ON invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id                 ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status             ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS operations_patient_id_idx               ON operations(patient_id);
CREATE INDEX IF NOT EXISTS operations_date_idx                     ON operations(operation_date DESC);
CREATE INDEX IF NOT EXISTS external_costs_date_idx                 ON external_costs(cost_date DESC);
CREATE INDEX IF NOT EXISTS external_costs_patient_idx              ON external_costs(patient_id);

-- =============================================================================
-- OPTIONAL: Daily WhatsApp reminders via pg_cron
-- Requires pg_cron + pg_net extensions enabled in the Supabase dashboard.
-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY before uncommenting.
-- =============================================================================

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- SELECT cron.unschedule('daily-whatsapp-reminders')
-- WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-whatsapp-reminders');
--
-- SELECT cron.schedule(
--   'daily-whatsapp-reminders',
--   '0 5 * * *',
--   $$
--   SELECT net.http_post(
--     url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-reminders',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--     body    := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );
