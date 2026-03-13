-- ─── Migration 00013: Add ANC columns to pregnancy_measurements (if missing) ──

ALTER TABLE pregnancy_measurements
  ADD COLUMN IF NOT EXISTS crl      DECIMAL(8,2),   -- Crown-Rump Length (mm)
  ADD COLUMN IF NOT EXISTS bpd      DECIMAL(8,2),   -- Biparietal Diameter (mm)
  ADD COLUMN IF NOT EXISTS fl       DECIMAL(8,2),   -- Femur Length (mm)
  ADD COLUMN IF NOT EXISTS ac       DECIMAL(8,2),   -- Abdominal Circumference (mm)
  ADD COLUMN IF NOT EXISTS efw      DECIMAL(8,2),   -- Estimated Fetal Weight (g)
  ADD COLUMN IF NOT EXISTS hb       DECIMAL(8,2),   -- Hemoglobin (g/dL)
  ADD COLUMN IF NOT EXISTS rbs      DECIMAL(8,2),   -- Random Blood Sugar (mg/dL)
  ADD COLUMN IF NOT EXISTS tsh_lab  DECIMAL(8,2),   -- TSH lab value (mIU/L)
  ADD COLUMN IF NOT EXISTS ogtt     DECIMAL(8,2);   -- OGTT result (mg/dL)
