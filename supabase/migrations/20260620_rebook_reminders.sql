-- ═══════════════════════════════════════════════════════════════════════════
-- Win-back / "your usual cut is due" reminders (daily pg_cron job)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_rebook_reminder_at TIMESTAMPTZ;

SELECT cron.unschedule('rebook-due-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'rebook-due-reminders'
);

-- 09:00 IST daily (03:30 UTC). Remind customers whose last completed cut was
-- 21–120 days ago, who have no upcoming booking, not reminded in the last 21 days.
SELECT cron.schedule('rebook-due-reminders', '30 3 * * *', $cron$
  WITH last_b AS (
    SELECT DISTINCT ON (b.user_id)
      b.user_id, b.shop_id, b.barber_id, s.name AS shop_name, b.date
    FROM public.bookings b
    JOIN public.shops s ON s.id = b.shop_id
    WHERE b.status = 'completed'
    ORDER BY b.user_id, b.date DESC
  ),
  due AS (
    SELECT lb.* FROM last_b lb
    JOIN public.users u ON u.id = lb.user_id
    WHERE lb.date <= (now() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '21 days'
      AND lb.date >= (now() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '120 days'
      AND (u.last_rebook_reminder_at IS NULL OR u.last_rebook_reminder_at < now() - INTERVAL '21 days')
      AND NOT EXISTS (
        SELECT 1 FROM public.bookings f
        WHERE f.user_id = lb.user_id
          AND f.status IN ('pending_confirmation','confirmed','in_chair')
      )
  ),
  ins AS (
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT user_id, 'booking_reminder', 'Time for a fresh cut? ✂️',
      'It''s been a while since your visit to ' || shop_name || '. Rebook your usual in seconds!',
      jsonb_build_object('shop_id', shop_id, 'barber_id', barber_id, 'rebook', true)
    FROM due
    RETURNING user_id
  )
  UPDATE public.users SET last_rebook_reminder_at = now()
  WHERE id IN (SELECT user_id FROM ins);
$cron$);
