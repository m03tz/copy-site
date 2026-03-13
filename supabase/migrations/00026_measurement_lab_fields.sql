-- ─── Migration 00026: Split OGTT into 3 types, rename hcg to b_hcg, add sfa_viscosity ───

ALTER TABLE pregnancy_measurements
  ADD COLUMN IF NOT EXISTS ogtt_fasting DECIMAL(8,2),  -- OGTT Fasting (mg/dL)
  ADD COLUMN IF NOT EXISTS ogtt_1hr     DECIMAL(8,2),  -- OGTT 1hr (mg/dL)
  ADD COLUMN IF NOT EXISTS ogtt_2hr     DECIMAL(8,2),  -- OGTT 2hr (mg/dL)
  ADD COLUMN IF NOT EXISTS b_hcg        DECIMAL(10,2); -- β-hCG (mIU/mL)

ALTER TABLE infertility_records
  ADD COLUMN IF NOT EXISTS sfa_viscosity TEXT;          -- Semen viscosity (normal / high / low)
