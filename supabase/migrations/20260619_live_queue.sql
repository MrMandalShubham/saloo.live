-- ═══════════════════════════════════════════════════════════════════════════
-- LIVE WALK-IN QUEUE ENGINE
-- Walk-in tokens, "people ahead of you", chair status, turn alerts.
-- Queue is separate from time-slot bookings (bookings table).
-- ═══════════════════════════════════════════════════════════════════════════

-- Shop opt-in for walk-ins
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS walk_in_enabled BOOLEAN NOT NULL DEFAULT true;

-- Live chair status per barber
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS chair_status TEXT NOT NULL DEFAULT 'available'
  CHECK (chair_status IN ('available','cutting','cleanup','break','offline'));

-- ─── QUEUE ENTRIES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.queue_entries (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                UUID        NOT NULL REFERENCES public.shops(id)   ON DELETE CASCADE,
  barber_id              UUID        REFERENCES public.barbers(id) ON DELETE SET NULL, -- preferred (null = any)
  assigned_barber_id     UUID        REFERENCES public.barbers(id) ON DELETE SET NULL, -- who took them
  user_id                UUID        REFERENCES public.users(id)   ON DELETE SET NULL, -- null = offline walk-in
  customer_name          TEXT,
  customer_phone         TEXT,
  service_ids            UUID[]      NOT NULL DEFAULT '{}',
  token_number           INT         NOT NULL,
  queue_date             DATE        NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  status                 TEXT        NOT NULL DEFAULT 'waiting'
                                       CHECK (status IN ('waiting','called','in_chair','completed','cancelled','no_show')),
  estimated_duration_min INT         NOT NULL DEFAULT 30,
  source                 TEXT        NOT NULL DEFAULT 'online'
                                       CHECK (source IN ('online','walk_in')),
  joined_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_at              TIMESTAMPTZ,
  started_at             TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_shop_date_status ON public.queue_entries(shop_id, queue_date, status);
CREATE INDEX IF NOT EXISTS idx_queue_user             ON public.queue_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_joined           ON public.queue_entries(shop_id, queue_date, joined_at);

CREATE TRIGGER queue_entries_updated_at
  BEFORE UPDATE ON public.queue_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── DAILY TOKEN COUNTER (per shop, per day) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.queue_counters (
  shop_id      UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  counter_date DATE NOT NULL,
  last_token   INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (shop_id, counter_date)
);

CREATE OR REPLACE FUNCTION public.next_queue_token(p_shop_id UUID, p_date DATE)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_token INT;
BEGIN
  INSERT INTO public.queue_counters (shop_id, counter_date, last_token)
  VALUES (p_shop_id, p_date, 1)
  ON CONFLICT (shop_id, counter_date)
  DO UPDATE SET last_token = public.queue_counters.last_token + 1
  RETURNING last_token INTO v_token;
  RETURN v_token;
END;
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

-- Customer sees own entries; owner sees their shop's entries. Writes go via edge functions (service role).
CREATE POLICY queue_select ON public.queue_entries FOR SELECT
  USING (
    user_id = auth.uid()
    OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

GRANT ALL ON public.queue_entries  TO authenticated, service_role;
GRANT ALL ON public.queue_counters TO authenticated, service_role;
