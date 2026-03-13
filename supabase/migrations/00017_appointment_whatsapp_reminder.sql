-- Track whether the same-day WhatsApp reminder was sent for each appointment.
-- NULL = not sent yet. Non-null = sent at that timestamp.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent_at TIMESTAMPTZ;
