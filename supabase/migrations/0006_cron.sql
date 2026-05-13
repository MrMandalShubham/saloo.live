-- ═══════════════════════════════════════════════════════════════════════════════
-- 0006_cron.sql — pg_cron scheduled maintenance jobs
-- ═══════════════════════════════════════════════════════════════════════════════

-- Remove existing jobs if re-running (idempotent)
SELECT cron.unschedule('cleanup-expired-slot-holds') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-slot-holds'
);
SELECT cron.unschedule('expire-old-bookings') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-old-bookings'
);

-- Every minute: purge slot holds whose 5-min window expired without payment
SELECT cron.schedule(
  'cleanup-expired-slot-holds',
  '* * * * *',
  $$
    DELETE FROM public.slot_holds
    WHERE expires_at < now() AND booking_id IS NULL;
  $$
);

-- Every 10 minutes: expire bookings stuck in pending_payment > 15 minutes
SELECT cron.schedule(
  'expire-old-bookings',
  '*/10 * * * *',
  $$
    UPDATE public.bookings
    SET status = 'expired', updated_at = now()
    WHERE status = 'pending_payment'
      AND created_at < now() - INTERVAL '15 minutes';
  $$
);
