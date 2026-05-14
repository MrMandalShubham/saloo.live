-- ═══════════════════════════════════════════════════════════════════════════════
-- 0007_scale_1k.sql — Performance optimizations for 1K+ concurrent users
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. ATOMIC SLOT HOLD (prevents race conditions) ─────────────────────────
-- Single transaction: check conflicts + insert hold atomically.
-- Uses advisory lock on barber+date to serialize concurrent hold attempts
-- for the same barber on the same day without blocking other barbers.

CREATE OR REPLACE FUNCTION public.atomic_hold_slot(
  p_shop_id    UUID,
  p_barber_id  UUID,
  p_user_id    UUID,
  p_hold_date  DATE,
  p_start_time TIME,
  p_end_time   TIME,
  p_service_ids UUID[],
  p_addon_ids  UUID[] DEFAULT '{}'
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lock_key BIGINT;
  v_conflict_count INT;
  v_hold_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Advisory lock: hash of barber_id + date ensures only one hold attempt
  -- per barber per day can execute this block at a time.
  -- pg_advisory_xact_lock releases automatically at transaction end.
  v_lock_key := hashtext(p_barber_id::TEXT || p_hold_date::TEXT);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Check booking conflicts
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.bookings
  WHERE barber_id = p_barber_id
    AND date = p_hold_date
    AND status IN ('confirmed', 'in_chair')
    AND start_time < p_end_time
    AND end_time > p_start_time;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'SLOT_CONFLICT: Slot already booked';
  END IF;

  -- Check hold conflicts (only unexpired holds without a booking)
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.slot_holds
  WHERE barber_id = p_barber_id
    AND hold_date = p_hold_date
    AND expires_at > now()
    AND booking_id IS NULL
    AND start_time < p_end_time
    AND end_time > p_start_time;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'HOLD_CONFLICT: Slot held by another user';
  END IF;

  -- Insert the hold
  INSERT INTO public.slot_holds (shop_id, barber_id, user_id, hold_date, start_time, end_time, service_ids, addon_ids)
  VALUES (p_shop_id, p_barber_id, p_user_id, p_hold_date, p_start_time, p_end_time, p_service_ids, p_addon_ids)
  RETURNING id, expires_at INTO v_hold_id, v_expires_at;

  RETURN json_build_object('hold_id', v_hold_id, 'expires_at', v_expires_at);
END;
$$;

GRANT EXECUTE ON FUNCTION public.atomic_hold_slot TO service_role;


-- ─── 2. JWT CUSTOM CLAIM: inject user_role into JWT ─────────────────────────
-- This Postgres hook runs when Supabase generates a JWT.
-- It adds the user's role to app_metadata so middleware can read it
-- without making a DB call on every page navigation.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  claims JSONB;
  v_role TEXT;
BEGIN
  -- Get the user's role from our users table
  SELECT role INTO v_role FROM public.users WHERE id = (event->>'user_id')::UUID;

  -- Get existing claims
  claims := event->'claims';

  -- Add user_role to app_metadata in the JWT
  IF v_role IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata,user_role}',
      to_jsonb(v_role)
    );
    -- Update the event with modified claims
    event := jsonb_set(event, '{claims}', claims);
  END IF;

  RETURN event;
END;
$$;

-- Grant execute to supabase_auth_admin (required for auth hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT ALL ON TABLE public.users TO supabase_auth_admin;
REVOKE ALL ON TABLE public.users FROM supabase_auth_admin;
GRANT SELECT ON TABLE public.users TO supabase_auth_admin;


-- ─── 3. MISSING INDEXES for high-frequency queries ──────────────────────────

-- Slot holds: active hold conflict detection (the most hammered query at scale)
CREATE INDEX IF NOT EXISTS slot_holds_active_conflict_idx
  ON public.slot_holds (barber_id, hold_date, start_time, end_time)
  WHERE expires_at > now() AND booking_id IS NULL;

-- Bookings: conflict detection for hold creation
CREATE INDEX IF NOT EXISTS bookings_active_conflict_idx
  ON public.bookings (barber_id, date, start_time, end_time)
  WHERE status IN ('confirmed', 'in_chair');

-- Shops: featured + verified for homepage queries
CREATE INDEX IF NOT EXISTS shops_featured_verified_idx
  ON public.shops (is_featured DESC, rating DESC)
  WHERE status = 'verified';

-- Notifications: unread count query (called on every page load)
CREATE INDEX IF NOT EXISTS notifications_unread_count_idx
  ON public.notifications (user_id)
  WHERE is_read = false;

-- Services: price lookup for nearby shops (min_price subquery)
CREATE INDEX IF NOT EXISTS services_min_price_idx
  ON public.services (shop_id, price)
  WHERE is_active = true AND is_addon = false;


-- ─── 4. CLEANUP CRON: more efficient with index-only scan ──────────────────

-- Drop and recreate with more efficient query
SELECT cron.unschedule('cleanup-expired-slot-holds') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-slot-holds'
);

SELECT cron.schedule(
  'cleanup-expired-slot-holds',
  '* * * * *',
  $$
    DELETE FROM public.slot_holds
    WHERE expires_at < now()
      AND booking_id IS NULL
    LIMIT 1000;
  $$
);

-- Add LIMIT to prevent long-running deletes during traffic spikes


-- ─── 5. CONNECTION POOLING NOTE ─────────────────────────────────────────────
-- For 1K+ concurrent users, enable Supabase connection pooling:
--   Dashboard → Settings → Database → Connection Pooling → Enable (Transaction mode)
--   Set pool size to at least 50 for the free tier, 200+ for Pro
-- Edge Functions use service_role which bypasses the pooler by default.
-- Consider switching Edge Functions to use the pooler URL for better scaling.
