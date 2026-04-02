-- ─── Migration 00037: Change ultrasound measurement columns to TEXT ──────────
-- Allows free-text values like "1+6+8" for CRL, BPD, FL, AC, EFW

ALTER TABLE pregnancy_measurements
  ALTER COLUMN crl  TYPE TEXT USING crl::TEXT,
  ALTER COLUMN bpd  TYPE TEXT USING bpd::TEXT,
  ALTER COLUMN fl   TYPE TEXT USING fl::TEXT,
  ALTER COLUMN ac   TYPE TEXT USING ac::TEXT,
  ALTER COLUMN efw  TYPE TEXT USING efw::TEXT;
