-- Add permanent medical history fields to patients table
-- These replace per-visit PMH/PSH/PDH/Parity from infertility_records

ALTER TABLE patients ADD COLUMN IF NOT EXISTS pmh TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS psh TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pdh TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS parity TEXT;
