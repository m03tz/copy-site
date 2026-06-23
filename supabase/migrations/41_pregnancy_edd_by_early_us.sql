-- Add edd_by_early_us (Expected Due Date by early ultrasound) to pregnancies.
-- Optional override calculated from an early-pregnancy ultrasound rather than LMP.
ALTER TABLE pregnancies ADD COLUMN IF NOT EXISTS edd_by_early_us DATE;
