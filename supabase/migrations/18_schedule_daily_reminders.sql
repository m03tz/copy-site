-- ─── Schedule daily WhatsApp reminders via pg_cron ───────────────────────────
--
-- Runs the `daily-reminders` Edge Function every day at 05:00 UTC
-- which equals 08:00 AM Amman time (Jordan, UTC+3).
--
-- BEFORE running this migration you MUST:
--   1. Deploy the Edge Function:
--        supabase functions deploy daily-reminders
--   2. Set the WhatsApp env vars in Supabase Dashboard:
--        Settings → Edge Functions → daily-reminders → Environment Variables
--        Add: WHATSAPP_TOKEN  and  WHATSAPP_PHONE_NUMBER_ID
--   3. Replace the two placeholder values below with your actual values from:
--        Supabase Dashboard → Settings → General  (Project Reference ID)
--        Supabase Dashboard → Settings → API      (anon/public key)
--
-- To find your values:
--   YOUR_PROJECT_REF  →  e.g. abcdefghijklmnop (from Project Settings → General)
--   YOUR_ANON_KEY     →  the "anon public" key  (from Project Settings → API)

-- Enable required extensions (safe to re-run)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if already set up (allows re-running migration safely)
SELECT cron.unschedule('daily-whatsapp-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-whatsapp-reminders'
);

-- Schedule the job: every day at 05:00 UTC = 08:00 Amman (UTC+3)
SELECT cron.schedule(
  'daily-whatsapp-reminders',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://mkgosgskgmkpflgzeoxl.supabase.co/functions/v1/daily-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZ29zZ3NrZ21rcGZsZ3plb3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTUzMDIsImV4cCI6MjA4NjIzMTMwMn0.2hrLF4MyGLXUMdByMl6uptoSSSWKIHhEyr4GLuwYEQ8"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
