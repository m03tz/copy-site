-- Phase 6: Email reminder tracking columns
-- Stores Resend email IDs so scheduled reminders can be cancelled
-- when an appointment is cancelled

ALTER TABLE appointments
  ADD COLUMN reminder_24h_email_id TEXT,
  ADD COLUMN reminder_2h_email_id TEXT;

-- Note: Apply via Supabase Dashboard SQL Editor
