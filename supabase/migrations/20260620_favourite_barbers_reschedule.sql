-- ═══════════════════════════════════════════════════════════════════════════
-- Favorite barbers + booking reschedule tracking
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── FAVOURITE BARBERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favourite_barbers (
  user_id    UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  barber_id  UUID        NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, barber_id)
);

CREATE INDEX IF NOT EXISTS favourite_barbers_user_idx ON public.favourite_barbers (user_id);

ALTER TABLE public.favourite_barbers ENABLE ROW LEVEL SECURITY;

-- Users manage their own favourite barbers (direct client access via RLS)
CREATE POLICY fav_barbers_select ON public.favourite_barbers FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY fav_barbers_insert ON public.favourite_barbers FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY fav_barbers_delete ON public.favourite_barbers FOR DELETE
  USING (user_id = auth.uid());

GRANT ALL ON public.favourite_barbers TO authenticated, service_role;

-- ─── RESCHEDULE TRACKING ON BOOKINGS ─────────────────────────────────────────
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reschedule_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;
