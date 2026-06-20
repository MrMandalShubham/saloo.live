-- ═══════════════════════════════════════════════════════════════════════════
-- Staff attendance: barber clock-in / clock-out
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.attendance (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id)   ON DELETE CASCADE,
  barber_id   UUID        NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  work_date   DATE        NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  clock_in    TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_shop_date_idx ON public.attendance (shop_id, work_date);
CREATE INDEX IF NOT EXISTS attendance_barber_idx    ON public.attendance (barber_id, work_date);
-- At most one open shift per barber
CREATE UNIQUE INDEX IF NOT EXISTS attendance_open_shift_idx
  ON public.attendance (barber_id) WHERE clock_out IS NULL;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_owner_all ON public.attendance FOR ALL
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

GRANT ALL ON public.attendance TO authenticated, service_role;
