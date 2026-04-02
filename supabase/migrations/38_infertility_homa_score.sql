ALTER TABLE infertility_records
  ADD COLUMN IF NOT EXISTS homa_score DECIMAL(8,2);
