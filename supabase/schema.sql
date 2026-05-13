-- ═══════════════════════════════════════════════════════════════════════════════
-- OnO — Complete Database Schema
-- Run this entire file in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 0001  Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "unaccent";


-- ─────────────────────────────────────────────────────────────────────────────
-- 0002  Users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone           TEXT UNIQUE NOT NULL,
  name            TEXT,
  email           TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('customer', 'barber', 'shop_owner', 'admin')),
  loyalty_points  INTEGER NOT NULL DEFAULT 0,
  loyalty_tier    TEXT NOT NULL DEFAULT 'bronze'
                    CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  no_show_count   INTEGER NOT NULL DEFAULT 0,
  is_suspended    BOOLEAN NOT NULL DEFAULT false,
  fcm_token       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create public.users row when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, phone, email, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, ''),
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update loyalty tier when points change
CREATE OR REPLACE FUNCTION public.update_loyalty_tier()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.loyalty_tier = CASE
    WHEN NEW.loyalty_points >= 5000 THEN 'platinum'
    WHEN NEW.loyalty_points >= 2000 THEN 'gold'
    WHEN NEW.loyalty_points >= 500  THEN 'silver'
    ELSE 'bronze'
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_loyalty_tier
  BEFORE UPDATE OF loyalty_points ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_loyalty_tier();


-- ─────────────────────────────────────────────────────────────────────────────
-- 0003  Shops
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.shops (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id            UUID NOT NULL REFERENCES public.users(id),
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE,
  description         TEXT CHECK (char_length(description) <= 300),
  phone               TEXT NOT NULL,
  address             TEXT NOT NULL,
  city                TEXT NOT NULL,
  state               TEXT NOT NULL,
  pincode             TEXT NOT NULL,
  location            GEOGRAPHY(POINT, 4326) NOT NULL,
  lat                 NUMERIC(10, 7) NOT NULL,
  lng                 NUMERIC(10, 7) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'verified', 'rejected', 'suspended')),
  photos              TEXT[] NOT NULL DEFAULT '{}',
  features            TEXT[] NOT NULL DEFAULT '{}',
  specialties         TEXT[] NOT NULL DEFAULT '{}',
  social_instagram    TEXT,
  social_facebook     TEXT,
  gst_number          TEXT,
  razorpay_account_id TEXT,
  rating              NUMERIC(3, 2) NOT NULL DEFAULT 0,
  review_count        INTEGER NOT NULL DEFAULT 0,
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  slot_buffer_min     INTEGER NOT NULL DEFAULT 10 CHECK (slot_buffer_min IN (0, 5, 10, 15)),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX shops_location_idx ON public.shops USING GIST (location);
CREATE INDEX shops_status_city_idx ON public.shops (status, city);
CREATE INDEX shops_rating_idx ON public.shops (rating DESC);
CREATE INDEX shops_name_trgm_idx ON public.shops USING GIN (name gin_trgm_ops);

CREATE TABLE public.shop_hours (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id      UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time    TIME NOT NULL,
  close_time   TIME NOT NULL,
  is_closed    BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (shop_id, day_of_week)
);

CREATE INDEX shop_hours_shop_idx ON public.shop_hours (shop_id);

CREATE TABLE public.shop_breaks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id      UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week  INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  label        TEXT
);

CREATE INDEX shop_breaks_shop_idx ON public.shop_breaks (shop_id);

CREATE TABLE public.favourites (
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id    UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shop_id)
);

CREATE INDEX favourites_user_idx ON public.favourites (user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 0004  Barbers & Services
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.barbers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id        UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES public.users(id),
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  avatar_url     TEXT,
  specialties    TEXT[] NOT NULL DEFAULT '{}',
  bio            TEXT,
  rating         NUMERIC(3, 2) NOT NULL DEFAULT 0,
  review_count   INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  invite_status  TEXT NOT NULL DEFAULT 'pending'
                   CHECK (invite_status IN ('pending', 'accepted', 'declined')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX barbers_shop_idx ON public.barbers (shop_id);
CREATE INDEX barbers_user_idx ON public.barbers (user_id);

CREATE TABLE public.barber_hours (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id    UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time    TIME NOT NULL,
  close_time   TIME NOT NULL,
  is_off       BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (barber_id, day_of_week)
);

CREATE INDEX barber_hours_barber_idx ON public.barber_hours (barber_id);

CREATE TABLE public.services (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL
                  CHECK (category IN ('hair', 'beard', 'skin', 'combo', 'kids')),
  duration_min  INTEGER NOT NULL
                  CHECK (duration_min IN (15, 30, 45, 60, 90)),
  price         NUMERIC(10, 2) NOT NULL
                  CHECK (price >= 49 AND price <= 9999),
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_addon      BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX services_shop_idx ON public.services (shop_id, is_active);


-- ─────────────────────────────────────────────────────────────────────────────
-- 0005  Slot Blocks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.slot_blocks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  barber_id   UUID REFERENCES public.barbers(id) ON DELETE CASCADE,
  block_date  DATE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX slot_blocks_shop_date_idx ON public.slot_blocks (shop_id, block_date);
CREATE INDEX slot_blocks_barber_idx ON public.slot_blocks (barber_id, block_date);


-- ─────────────────────────────────────────────────────────────────────────────
-- 0006  Bookings & Payments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS booking_ref_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_booking_ref()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'ONO-' || LPAD(nextval('booking_ref_seq')::TEXT, 4, '0');
END;
$$;

CREATE TABLE public.slot_holds (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  barber_id   UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hold_date   DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  service_ids UUID[] NOT NULL,
  addon_ids   UUID[] NOT NULL DEFAULT '{}',
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  booking_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX slot_holds_expiry_idx ON public.slot_holds (expires_at) WHERE booking_id IS NULL;
CREATE INDEX slot_holds_slot_idx ON public.slot_holds (barber_id, hold_date, start_time, end_time);
CREATE INDEX slot_holds_user_idx ON public.slot_holds (user_id);

-- pg_cron: purge expired unconfirmed holds every minute
SELECT cron.schedule(
  'cleanup-expired-slot-holds',
  '* * * * *',
  $$DELETE FROM public.slot_holds WHERE expires_at < now() AND booking_id IS NULL;$$
);

CREATE TABLE public.bookings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref         TEXT UNIQUE NOT NULL DEFAULT public.generate_booking_ref(),
  user_id             UUID NOT NULL REFERENCES public.users(id),
  shop_id             UUID NOT NULL REFERENCES public.shops(id),
  barber_id           UUID REFERENCES public.barbers(id),
  service_ids         UUID[] NOT NULL,
  addon_ids           UUID[] NOT NULL DEFAULT '{}',
  date                DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending_payment'
                        CHECK (status IN (
                          'pending_payment', 'confirmed', 'in_chair',
                          'completed', 'cancelled', 'no_show', 'disputed', 'expired'
                        )),
  total_amount        NUMERIC(10, 2) NOT NULL,
  advance_amount      NUMERIC(10, 2) NOT NULL,
  instructions        TEXT,
  reference_photo_url TEXT,
  cancel_reason       TEXT,
  cancelled_by        TEXT CHECK (cancelled_by IN ('customer', 'shop', 'system')),
  no_show_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX bookings_user_idx ON public.bookings (user_id, created_at DESC);
CREATE INDEX bookings_shop_date_idx ON public.bookings (shop_id, date);
CREATE INDEX bookings_barber_date_idx ON public.bookings (barber_id, date);
CREATE INDEX bookings_status_idx ON public.bookings (status);

ALTER TABLE public.slot_holds
  ADD CONSTRAINT slot_holds_booking_fk
  FOREIGN KEY (booking_id) REFERENCES public.bookings(id);

CREATE TABLE public.payments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id           UUID NOT NULL REFERENCES public.bookings(id),
  user_id              UUID NOT NULL REFERENCES public.users(id),
  amount               NUMERIC(10, 2) NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('advance', 'refund', 'compensation')),
  method               TEXT,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
  razorpay_order_id    TEXT UNIQUE,
  razorpay_payment_id  TEXT UNIQUE,
  razorpay_signature   TEXT,
  refund_id            TEXT,
  metadata             JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX payments_booking_idx ON public.payments (booking_id);
CREATE INDEX payments_razorpay_order_idx ON public.payments (razorpay_order_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 0007  Reviews & Notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.reviews (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          UUID NOT NULL UNIQUE REFERENCES public.bookings(id),
  user_id             UUID NOT NULL REFERENCES public.users(id),
  shop_id             UUID NOT NULL REFERENCES public.shops(id),
  barber_id           UUID REFERENCES public.barbers(id),
  rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  barber_rating       INTEGER CHECK (barber_rating BETWEEN 1 AND 5),
  wait_rating         INTEGER CHECK (wait_rating BETWEEN 1 AND 5),
  cleanliness_rating  INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
  text                TEXT CHECK (char_length(text) <= 500),
  photos              TEXT[] NOT NULL DEFAULT '{}',
  is_visible          BOOLEAN NOT NULL DEFAULT true,
  shop_response       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reviews_shop_idx ON public.reviews (shop_id, created_at DESC);
CREATE INDEX reviews_user_idx ON public.reviews (user_id);
CREATE INDEX reviews_barber_idx ON public.reviews (barber_id);

CREATE OR REPLACE FUNCTION public.update_shop_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.shops SET
    rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM public.reviews
      WHERE shop_id = NEW.shop_id AND is_visible = true
    ),
    review_count = (
      SELECT COUNT(*) FROM public.reviews
      WHERE shop_id = NEW.shop_id AND is_visible = true
    )
  WHERE id = NEW.shop_id;

  IF NEW.barber_id IS NOT NULL AND NEW.barber_rating IS NOT NULL THEN
    UPDATE public.barbers SET
      rating = (
        SELECT ROUND(AVG(barber_rating)::NUMERIC, 2)
        FROM public.reviews
        WHERE barber_id = NEW.barber_id AND barber_rating IS NOT NULL AND is_visible = true
      ),
      review_count = (
        SELECT COUNT(*) FROM public.reviews
        WHERE barber_id = NEW.barber_id AND is_visible = true
      )
    WHERE id = NEW.barber_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_update_rating
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_shop_rating();

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN (
               'booking_confirmed', 'booking_cancelled', 'reminder',
               'loyalty', 'promotion', 'no_show', 'review_request', 'dispute'
             )),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}',
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications (user_id, is_read) WHERE is_read = false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 0008  Loyalty, Promotions & Disputes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  booking_id    UUID REFERENCES public.bookings(id),
  points        INTEGER NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'expire')),
  description   TEXT NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX loyalty_tx_user_idx ON public.loyalty_transactions (user_id, created_at DESC);

CREATE TABLE public.promotions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id                 UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  type                    TEXT NOT NULL CHECK (type IN (
                            'flat_discount', 'combo', 'happy_hour', 'new_customer', 'loyalty_bonus'
                          )),
  title                   TEXT NOT NULL,
  discount_value          NUMERIC(10, 2) NOT NULL,
  service_id              UUID REFERENCES public.services(id),
  valid_from              TIMESTAMPTZ NOT NULL,
  valid_to                TIMESTAMPTZ,
  applicable_hours_start  TIME,
  applicable_hours_end    TIME,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX promotions_shop_idx ON public.promotions (shop_id, is_active);

CREATE TABLE public.disputes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id        UUID NOT NULL REFERENCES public.bookings(id),
  user_id           UUID NOT NULL REFERENCES public.users(id),
  shop_id           UUID NOT NULL REFERENCES public.shops(id),
  reason            TEXT NOT NULL CHECK (reason IN (
                      'service_not_delivered', 'quality_poor', 'wrong_charge', 'other'
                    )),
  description       TEXT NOT NULL CHECK (char_length(description) >= 30),
  photos            TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN (
                        'open', 'shop_responded', 'escalated',
                        'resolved_refund', 'resolved_no_refund', 'dismissed'
                      )),
  payment_in_escrow BOOLEAN NOT NULL DEFAULT false,
  shop_response     TEXT,
  admin_decision    TEXT,
  sla_deadline      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 days'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX disputes_booking_idx ON public.disputes (booking_id);
CREATE INDEX disputes_shop_idx ON public.disputes (shop_id, status);
CREATE INDEX disputes_status_idx ON public.disputes (status) WHERE status NOT IN ('resolved_refund', 'resolved_no_refund', 'dismissed');


-- ─────────────────────────────────────────────────────────────────────────────
-- 0009  Storage Buckets
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('shop-photos',    'shop-photos',    true,  52428800, ARRAY['image/jpeg','image/png','image/webp']),
  ('profile-photos', 'profile-photos', false, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('review-photos',  'review-photos',  true,  10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "shop_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-photos');

CREATE POLICY "shop_photos_owner_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'shop-photos' AND auth.role() = 'authenticated');

CREATE POLICY "profile_photos_own_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile_photos_own_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "review_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

CREATE POLICY "review_photos_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'review-photos' AND auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────────────────────
-- 0010  Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- shops
CREATE POLICY "shops_select_verified" ON public.shops FOR SELECT USING (status = 'verified');
CREATE POLICY "shops_select_own" ON public.shops FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "shops_update_own" ON public.shops FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "shops_insert_auth" ON public.shops FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- shop_hours / shop_breaks
CREATE POLICY "shop_hours_public_read" ON public.shop_hours
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified'));

CREATE POLICY "shop_breaks_public_read" ON public.shop_breaks
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified'));

-- barbers
CREATE POLICY "barbers_public_read" ON public.barbers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
    AND is_active = true
  );

-- services
CREATE POLICY "services_public_read" ON public.services
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
    AND is_active = true
  );

-- slot_holds
CREATE POLICY "slot_holds_own" ON public.slot_holds FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "slot_holds_insert_auth" ON public.slot_holds
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- bookings
CREATE POLICY "bookings_select_own" ON public.bookings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bookings_insert_auth" ON public.bookings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
CREATE POLICY "bookings_update_own" ON public.bookings FOR UPDATE USING (user_id = auth.uid());

-- payments
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (user_id = auth.uid());

-- reviews
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "reviews_insert_auth" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND user_id = auth.uid() AND status = 'completed'
    )
  );

-- notifications
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- loyalty_transactions
CREATE POLICY "loyalty_tx_own" ON public.loyalty_transactions FOR SELECT USING (user_id = auth.uid());

-- promotions
CREATE POLICY "promotions_public_read" ON public.promotions
  FOR SELECT USING (
    is_active = true
    AND (valid_to IS NULL OR valid_to > now())
    AND EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
  );

-- favourites
CREATE POLICY "favourites_own" ON public.favourites FOR ALL USING (user_id = auth.uid());

-- disputes
CREATE POLICY "disputes_own" ON public.disputes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "disputes_insert_auth" ON public.disputes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- 0011  Functions & Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.shops_nearby(
  p_lat           FLOAT,
  p_lng           FLOAT,
  p_radius_km     FLOAT DEFAULT 5,
  p_open_now      BOOLEAN DEFAULT false,
  p_min_rating    FLOAT DEFAULT 0,
  p_max_price     FLOAT DEFAULT NULL,
  p_features      TEXT[] DEFAULT NULL,
  p_sort_by       TEXT DEFAULT 'nearest',
  p_limit         INT DEFAULT 20,
  p_offset        INT DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  slug          TEXT,
  address       TEXT,
  city          TEXT,
  lat           NUMERIC,
  lng           NUMERIC,
  status        TEXT,
  photos        TEXT[],
  features      TEXT[],
  specialties   TEXT[],
  rating        NUMERIC,
  review_count  INT,
  is_featured   BOOLEAN,
  distance_km   FLOAT,
  is_open_now   BOOLEAN
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_point GEOGRAPHY := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  v_day   INT := EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Kolkata');
  v_time  TIME := (NOW() AT TIME ZONE 'Asia/Kolkata')::TIME;
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.name, s.slug, s.address, s.city, s.lat, s.lng,
    s.status, s.photos, s.features, s.specialties,
    s.rating, s.review_count, s.is_featured,
    ST_Distance(s.location, v_point) / 1000 AS distance_km,
    EXISTS (
      SELECT 1 FROM public.shop_hours sh
      WHERE sh.shop_id = s.id
        AND sh.day_of_week = v_day
        AND sh.is_closed = false
        AND v_time BETWEEN sh.open_time AND sh.close_time
    ) AS is_open_now
  FROM public.shops s
  WHERE
    s.status = 'verified'
    AND ST_DWithin(s.location, v_point, p_radius_km * 1000)
    AND s.rating >= p_min_rating
    AND (p_features IS NULL OR s.features @> p_features)
    AND (
      NOT p_open_now
      OR EXISTS (
        SELECT 1 FROM public.shop_hours sh
        WHERE sh.shop_id = s.id
          AND sh.day_of_week = v_day
          AND sh.is_closed = false
          AND v_time BETWEEN sh.open_time AND sh.close_time
      )
    )
    AND (
      p_max_price IS NULL
      OR EXISTS (
        SELECT 1 FROM public.services sv
        WHERE sv.shop_id = s.id AND sv.is_active = true AND sv.is_addon = false
          AND sv.price <= p_max_price
      )
    )
  ORDER BY
    CASE p_sort_by
      WHEN 'nearest'    THEN ST_Distance(s.location, v_point)
      WHEN 'top_rated'  THEN -s.rating::FLOAT
      ELSE ST_Distance(s.location, v_point)
    END,
    s.is_featured DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE INDEX bookings_conflict_idx ON public.bookings
  (barber_id, date, start_time, end_time)
  WHERE status IN ('confirmed', 'in_chair');

CREATE INDEX services_name_trgm_idx ON public.services
  USING GIN (name gin_trgm_ops);


-- ─────────────────────────────────────────────────────────────────────────────
-- 0012  Admin
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id      UUID NOT NULL REFERENCES public.users(id),
  action_type   TEXT NOT NULL,
  target_type   TEXT NOT NULL CHECK (target_type IN ('shop','user','dispute','booking')),
  target_id     UUID NOT NULL,
  details       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin   ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target  ON public.admin_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON public.admin_actions(created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_admin_actions"
  ON public.admin_actions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- Done. Tables created:
--   users, shops, shop_hours, shop_breaks, favourites
--   barbers, barber_hours, services
--   slot_blocks, slot_holds, bookings, payments
--   reviews, notifications
--   loyalty_transactions, promotions, disputes
--   admin_actions
-- Storage buckets: shop-photos, profile-photos, review-photos
-- ═══════════════════════════════════════════════════════════════════════════════
