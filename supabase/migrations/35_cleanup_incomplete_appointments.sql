-- ─── Auto-delete incomplete appointments from the previous day ────────────────
--
-- Runs every day at 21:00 UTC = 00:00 midnight Amman time (Asia/Amman, UTC+3).
-- Deletes all appointments from the previous calendar day in Amman time
-- whose status is NOT 'completed' (i.e. scheduled, confirmed, or cancelled).
--
-- pg_cron is already enabled from migration 18.

-- Remove existing job if it exists (safe to re-run)
SELECT cron.unschedule('cleanup-incomplete-appointments')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-incomplete-appointments'
);

-- Schedule: 21:00 UTC = 00:00 midnight Amman (UTC+3)
-- "previous day" is computed in Asia/Amman timezone so the boundary is exact.
SELECT cron.schedule(
  'cleanup-incomplete-appointments',
  '0 21 * * *',
  $$
  DELETE FROM appointments
  WHERE
    status IN ('scheduled', 'confirmed')
    AND scheduled_start AT TIME ZONE 'Asia/Amman' >= (NOW() AT TIME ZONE 'Asia/Amman')::date - INTERVAL '1 day'
    AND scheduled_start AT TIME ZONE 'Asia/Amman' <  (NOW() AT TIME ZONE 'Asia/Amman')::date;
  $$
);
