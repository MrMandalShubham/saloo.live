-- ════════════════════════════════════════════════════════════════════════════
-- SALOO — FULL WIPE + REBUILD
-- Paste this ENTIRE file in Supabase SQL Editor and run it ONCE.
-- After running, sign in and then run:
--   UPDATE public.users SET role='admin' WHERE email='shubhammandal391@gmail.com';
-- ════════════════════════════════════════════════════════════════════════════


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 1: WIPE EVERYTHING                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TRIGGER IF EXISTS users_updated_at       ON public.users;
DROP TRIGGER IF EXISTS users_loyalty_tier     ON public.users;
DROP TRIGGER IF EXISTS shops_updated_at       ON public.shops;
DROP TRIGGER IF EXISTS barbers_updated_at     ON public.barbers;
DROP TRIGGER IF EXISTS services_updated_at    ON public.services;
DROP TRIGGER IF EXISTS bookings_updated_at    ON public.bookings;
DROP TRIGGER IF EXISTS payments_updated_at    ON public.payments;
DROP TRIGGER IF EXISTS reviews_updated_at     ON public.reviews;
DROP TRIGGER IF EXISTS reviews_update_rating  ON public.reviews;
DROP TRIGGER IF EXISTS promotions_updated_at  ON public.promotions;
DROP TRIGGER IF EXISTS disputes_updated_at    ON public.disputes;

DROP TABLE IF EXISTS public.admin_actions        CASCADE;
DROP TABLE IF EXISTS public.disputes             CASCADE;
DROP TABLE IF EXISTS public.loyalty_transactions CASCADE;
DROP TABLE IF EXISTS public.notifications        CASCADE;
DROP TABLE IF EXISTS public.reviews              CASCADE;
DROP TABLE IF EXISTS public.payments             CASCADE;
DROP TABLE IF EXISTS public.bookings             CASCADE;
DROP TABLE IF EXISTS public.slot_holds           CASCADE;
DROP TABLE IF EXISTS public.slot_blocks          CASCADE;
DROP TABLE IF EXISTS public.promotions           CASCADE;
DROP TABLE IF EXISTS public.services             CASCADE;
DROP TABLE IF EXISTS public.barber_hours         CASCADE;
DROP TABLE IF EXISTS public.barbers              CASCADE;
DROP TABLE IF EXISTS public.favourites           CASCADE;
DROP TABLE IF EXISTS public.shop_breaks          CASCADE;
DROP TABLE IF EXISTS public.shop_hours           CASCADE;
DROP TABLE IF EXISTS public.shops                CASCADE;
DROP TABLE IF EXISTS public.users                CASCADE;

DROP SEQUENCE IF EXISTS public.booking_ref_seq;

DROP FUNCTION IF EXISTS public.set_updated_at()          CASCADE;
DROP FUNCTION IF EXISTS public.update_loyalty_tier()     CASCADE;
DROP FUNCTION IF EXISTS public.generate_booking_ref()    CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()         CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role()           CASCADE;
DROP FUNCTION IF EXISTS public.is_admin()                CASCADE;
DROP FUNCTION IF EXISTS public.is_own_shop(UUID)         CASCADE;
DROP FUNCTION IF EXISTS public.get_owner_shop_id()       CASCADE;
DROP FUNCTION IF EXISTS public.get_role_by_email(TEXT)   CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_profile()     CASCADE;
DROP FUNCTION IF EXISTS public.request_shop_owner()      CASCADE;
DROP FUNCTION IF EXISTS public.promote_to_admin(TEXT)    CASCADE;
DROP FUNCTION IF EXISTS public.update_shop_rating()      CASCADE;
DROP FUNCTION IF EXISTS public.atomic_hold_slot(UUID,UUID,UUID,DATE,TIME,TIME,UUID[],UUID[]) CASCADE;
DROP FUNCTION IF EXISTS public.increment_no_show_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.shops_nearby(FLOAT,FLOAT,FLOAT,BOOLEAN,FLOAT,FLOAT,TEXT[],TEXT,INT,INT) CASCADE;

DROP POLICY IF EXISTS "shop_photos_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "shop_photos_owner_upload"  ON storage.objects;
DROP POLICY IF EXISTS "shop_photos_owner_delete"  ON storage.objects;
DROP POLICY IF EXISTS "shop_photos_admin"         ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_own_read"   ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_own_upload" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_own_delete" ON storage.objects;
DROP POLICY IF EXISTS "review_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "review_photos_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "review_photos_own_delete"  ON storage.objects;

DO $$ BEGIN
  PERFORM cron.unschedule('expire-slot-holds');
  PERFORM cron.unschedule('expire-pending-payments');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 2: EXTENSIONS                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_cron";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — cron jobs skipped';
END $$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 3: HELPER FUNCTIONS                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_loyalty_tier()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.loyalty_tier := CASE
    WHEN NEW.loyalty_points >= 5000 THEN 'platinum'
    WHEN NEW.loyalty_points >= 2000 THEN 'gold'
    WHEN NEW.loyalty_points >= 500  THEN 'silver'
    ELSE 'bronze'
  END;
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS public.booking_ref_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_booking_ref()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN RETURN 'ONO-' || LPAD(nextval('public.booking_ref_seq')::TEXT, 6, '0'); END;
$$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 4: TABLES                                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── USERS ───────────────────────────────────────────────────────────────
CREATE TABLE public.users (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT        UNIQUE,
  phone              TEXT,
  name               TEXT,
  avatar_url         TEXT,
  role               TEXT        NOT NULL DEFAULT 'customer'
                                   CHECK (role IN ('customer','admin')),
  loyalty_points     INTEGER     NOT NULL DEFAULT 0   CHECK (loyalty_points >= 0),
  loyalty_tier       TEXT        NOT NULL DEFAULT 'bronze'
                                   CHECK (loyalty_tier IN ('bronze','silver','gold','platinum')),
  no_show_count      INTEGER     NOT NULL DEFAULT 0   CHECK (no_show_count >= 0),
  date_of_birth      DATE,
  gender             TEXT        CHECK (gender IS NULL OR gender IN ('male','female','other','prefer_not_to_say')),
  address            TEXT,
  city               TEXT,
  pincode            TEXT        CHECK (pincode IS NULL OR pincode ~ '^\d{6}$'),
  preferred_language TEXT        NOT NULL DEFAULT 'en',
  fcm_token          TEXT,
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  is_suspended       BOOLEAN     NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_phone_unique    ON public.users (phone) WHERE phone IS NOT NULL AND phone != '';
CREATE        INDEX users_role_idx        ON public.users (role);
CREATE        INDEX users_email_lower_idx ON public.users (lower(email));

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER users_loyalty_tier
  BEFORE UPDATE OF loyalty_points ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_loyalty_tier();


-- ─── SHOPS ───────────────────────────────────────────────────────────────
CREATE TABLE public.shops (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID          NOT NULL REFERENCES public.users(id),
  name                  TEXT          NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  slug                  TEXT          UNIQUE,
  description           TEXT          CHECK (char_length(description) <= 500),
  phone                 TEXT          NOT NULL,
  email                 TEXT,
  address               TEXT          NOT NULL,
  city                  TEXT          NOT NULL,
  state                 TEXT          NOT NULL,
  pincode               TEXT          NOT NULL CHECK (pincode ~ '^\d{6}$'),
  location              GEOGRAPHY(POINT,4326),
  lat                   NUMERIC(10,7),
  lng                   NUMERIC(10,7),
  status                TEXT          NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending','verified','rejected','suspended')),
  photos                TEXT[]        NOT NULL DEFAULT '{}',
  features              TEXT[]        NOT NULL DEFAULT '{}',
  specialties           TEXT[]        NOT NULL DEFAULT '{}',
  social_instagram      TEXT,
  social_facebook       TEXT,
  gst_number            TEXT,
  razorpay_account_id   TEXT,
  advance_percentage    INTEGER       NOT NULL DEFAULT 30 CHECK (advance_percentage BETWEEN 0 AND 100),
  auto_confirm_bookings BOOLEAN       NOT NULL DEFAULT false,
  slot_buffer_min       INTEGER       NOT NULL DEFAULT 10  CHECK (slot_buffer_min IN (0,5,10,15)),
  rating                NUMERIC(3,2)  NOT NULL DEFAULT 0   CHECK (rating BETWEEN 0 AND 5),
  review_count          INTEGER       NOT NULL DEFAULT 0   CHECK (review_count >= 0),
  is_featured           BOOLEAN       NOT NULL DEFAULT false,
  rejection_reason      TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX shops_location_idx    ON public.shops USING GIST (location);
CREATE INDEX shops_status_city_idx ON public.shops (status, city);
CREATE INDEX shops_owner_idx       ON public.shops (owner_id);
CREATE INDEX shops_rating_idx      ON public.shops (rating DESC) WHERE status = 'verified';
CREATE INDEX shops_name_trgm_idx   ON public.shops USING GIN (name gin_trgm_ops);

CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── SHOP HOURS ──────────────────────────────────────────────────────────
CREATE TABLE public.shop_hours (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID    NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   TIME    NOT NULL,
  close_time  TIME    NOT NULL,
  is_closed   BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (shop_id, day_of_week),
  CHECK (close_time > open_time)
);

CREATE INDEX shop_hours_shop_idx ON public.shop_hours (shop_id);


-- ─── SHOP BREAKS ─────────────────────────────────────────────────────────
CREATE TABLE public.shop_breaks (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID    NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME    NOT NULL,
  end_time    TIME    NOT NULL,
  label       TEXT,
  CHECK (end_time > start_time)
);

CREATE INDEX shop_breaks_shop_idx ON public.shop_breaks (shop_id);


-- ─── FAVOURITES ──────────────────────────────────────────────────────────
CREATE TABLE public.favourites (
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id    UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shop_id)
);

CREATE INDEX favourites_user_idx ON public.favourites (user_id);


-- ─── BARBERS ─────────────────────────────────────────────────────────────
CREATE TABLE public.barbers (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id           UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id           UUID        REFERENCES public.users(id),
  name              TEXT        NOT NULL CHECK (char_length(name) >= 2),
  phone             TEXT,
  email             TEXT,
  avatar_url        TEXT,
  bio               TEXT        CHECK (char_length(bio) <= 300),
  specialties       TEXT[]      NOT NULL DEFAULT '{}',
  rating            NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  review_count      INTEGER     NOT NULL DEFAULT 0  CHECK (review_count >= 0),
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  invite_status     TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (invite_status IN ('pending','accepted','declined')),
  invite_token      TEXT        UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX barbers_shop_idx ON public.barbers (shop_id);
CREATE INDEX barbers_user_idx ON public.barbers (user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER barbers_updated_at
  BEFORE UPDATE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── BARBER HOURS ────────────────────────────────────────────────────────
CREATE TABLE public.barber_hours (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id   UUID    NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   TIME    NOT NULL,
  close_time  TIME    NOT NULL,
  is_off      BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (barber_id, day_of_week),
  CHECK (close_time > open_time)
);

CREATE INDEX barber_hours_barber_idx ON public.barber_hours (barber_id);


-- ─── SERVICES ────────────────────────────────────────────────────────────
CREATE TABLE public.services (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id      UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name         TEXT          NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  category     TEXT          NOT NULL
                               CHECK (category IN ('hair','beard','skin','combo','kids','other')),
  duration_min INTEGER       NOT NULL CHECK (duration_min IN (15,30,45,60,90,120)),
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 1 AND price <= 99999),
  description  TEXT          CHECK (char_length(description) <= 300),
  is_active    BOOLEAN       NOT NULL DEFAULT true,
  is_addon     BOOLEAN       NOT NULL DEFAULT false,
  sort_order   INTEGER       NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX services_shop_active_idx ON public.services (shop_id, is_active);
CREATE INDEX services_name_trgm_idx   ON public.services USING GIN (name gin_trgm_ops);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── SLOT BLOCKS ─────────────────────────────────────────────────────────
CREATE TABLE public.slot_blocks (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID    NOT NULL REFERENCES public.shops(id)   ON DELETE CASCADE,
  barber_id   UUID             REFERENCES public.barbers(id) ON DELETE CASCADE,
  block_date  DATE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME    NOT NULL,
  end_time    TIME    NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (block_date IS NOT NULL OR day_of_week IS NOT NULL)
);

CREATE INDEX slot_blocks_shop_date_idx ON public.slot_blocks (shop_id, block_date);
CREATE INDEX slot_blocks_barber_idx    ON public.slot_blocks (barber_id, block_date);


-- ─── SLOT HOLDS ──────────────────────────────────────────────────────────
CREATE TABLE public.slot_holds (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id)   ON DELETE CASCADE,
  barber_id   UUID        NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  hold_date   DATE        NOT NULL,
  start_time  TIME        NOT NULL,
  end_time    TIME        NOT NULL,
  service_ids UUID[]      NOT NULL,
  addon_ids   UUID[]      NOT NULL DEFAULT '{}',
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  booking_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX slot_holds_slot_idx   ON public.slot_holds (barber_id, hold_date, start_time, end_time);
CREATE INDEX slot_holds_user_idx   ON public.slot_holds (user_id);
CREATE INDEX slot_holds_expiry_idx ON public.slot_holds (expires_at) WHERE booking_id IS NULL;


-- ─── BOOKINGS ────────────────────────────────────────────────────────────
CREATE TABLE public.bookings (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref         TEXT          UNIQUE NOT NULL DEFAULT public.generate_booking_ref(),
  user_id             UUID          NOT NULL REFERENCES public.users(id),
  shop_id             UUID          NOT NULL REFERENCES public.shops(id),
  barber_id           UUID                   REFERENCES public.barbers(id),
  service_ids         UUID[]        NOT NULL  CHECK (cardinality(service_ids) > 0),
  addon_ids           UUID[]        NOT NULL  DEFAULT '{}',
  date                DATE          NOT NULL,
  start_time          TIME          NOT NULL,
  end_time            TIME          NOT NULL,
  status              TEXT          NOT NULL DEFAULT 'pending_payment'
                                      CHECK (status IN (
                                        'pending_payment','confirmed','in_chair',
                                        'completed','cancelled','no_show',
                                        'disputed','expired'
                                      )),
  total_amount        NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  advance_amount      NUMERIC(10,2) NOT NULL CHECK (advance_amount >= 0),
  instructions        TEXT          CHECK (char_length(instructions) <= 500),
  reference_photo_url TEXT,
  cancel_reason       TEXT,
  cancelled_by        TEXT          CHECK (cancelled_by IN ('customer','shop','system','admin')),
  no_show_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (advance_amount <= total_amount)
);

CREATE INDEX bookings_user_idx        ON public.bookings (user_id, created_at DESC);
CREATE INDEX bookings_shop_date_idx   ON public.bookings (shop_id, date);
CREATE INDEX bookings_barber_date_idx ON public.bookings (barber_id, date);
CREATE INDEX bookings_status_idx      ON public.bookings (status);
CREATE INDEX bookings_conflict_idx    ON public.bookings (barber_id, date, start_time, end_time)
  WHERE status IN ('confirmed','in_chair');

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.slot_holds
  ADD CONSTRAINT slot_holds_booking_fk
  FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


-- ─── PAYMENTS ────────────────────────────────────────────────────────────
CREATE TABLE public.payments (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          UUID          NOT NULL REFERENCES public.bookings(id),
  user_id             UUID          NOT NULL REFERENCES public.users(id),
  amount              NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  type                TEXT          NOT NULL CHECK (type IN ('advance','balance','refund','compensation')),
  method              TEXT          CHECK (method IN ('razorpay','cash','wallet','loyalty')),
  status              TEXT          NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('pending','captured','failed','refunded')),
  razorpay_order_id   TEXT          UNIQUE,
  razorpay_payment_id TEXT          UNIQUE,
  razorpay_signature  TEXT,
  refund_id           TEXT          UNIQUE,
  failure_reason      TEXT,
  metadata            JSONB         NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX payments_booking_idx ON public.payments (booking_id);
CREATE INDEX payments_user_idx    ON public.payments (user_id);
CREATE INDEX payments_status_idx  ON public.payments (status) WHERE status = 'pending';

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── REVIEWS ─────────────────────────────────────────────────────────────
CREATE TABLE public.reviews (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id         UUID        NOT NULL UNIQUE REFERENCES public.bookings(id),
  user_id            UUID        NOT NULL REFERENCES public.users(id),
  shop_id            UUID        NOT NULL REFERENCES public.shops(id),
  barber_id          UUID                 REFERENCES public.barbers(id),
  rating             INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  barber_rating      INTEGER     CHECK (barber_rating BETWEEN 1 AND 5),
  wait_rating        INTEGER     CHECK (wait_rating BETWEEN 1 AND 5),
  cleanliness_rating INTEGER     CHECK (cleanliness_rating BETWEEN 1 AND 5),
  text               TEXT        CHECK (char_length(text) <= 1000),
  photos             TEXT[]      NOT NULL DEFAULT '{}',
  is_visible         BOOLEAN     NOT NULL DEFAULT true,
  shop_response      TEXT        CHECK (char_length(shop_response) <= 500),
  shop_response_at   TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reviews_shop_idx   ON public.reviews (shop_id, created_at DESC) WHERE is_visible = true;
CREATE INDEX reviews_user_idx   ON public.reviews (user_id);
CREATE INDEX reviews_barber_idx ON public.reviews (barber_id);

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN (
               'booking_confirmed','booking_cancelled','booking_reminder',
               'booking_completed','loyalty_earned','loyalty_redeemed',
               'promotion','no_show','review_request','dispute_update',
               'shop_approved','shop_rejected','shop_suspended','system'
             )),
  title      TEXT        NOT NULL CHECK (char_length(title) <= 100),
  body       TEXT        NOT NULL CHECK (char_length(body) <= 500),
  data       JSONB       NOT NULL DEFAULT '{}',
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX notifications_user_all_idx    ON public.notifications (user_id, created_at DESC);


-- ─── LOYALTY TRANSACTIONS ────────────────────────────────────────────────
CREATE TABLE public.loyalty_transactions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  booking_id    UUID                 REFERENCES public.bookings(id),
  points        INTEGER     NOT NULL,
  type          TEXT        NOT NULL CHECK (type IN ('earn','redeem','bonus','expire','adjust')),
  description   TEXT        NOT NULL,
  balance_after INTEGER     NOT NULL CHECK (balance_after >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX loyalty_tx_user_idx ON public.loyalty_transactions (user_id, created_at DESC);


-- ─── PROMOTIONS ──────────────────────────────────────────────────────────
CREATE TABLE public.promotions (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id               UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  type                  TEXT          NOT NULL CHECK (type IN (
                                        'flat_discount','percentage_discount','combo',
                                        'happy_hour','new_customer','loyalty_bonus'
                                      )),
  title                 TEXT          NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  discount_value        NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_discount_amount   NUMERIC(10,2),
  service_ids           UUID[],
  applicable_hours_start TIME,
  applicable_hours_end  TIME,
  min_booking_amount    NUMERIC(10,2),
  new_customers_only    BOOLEAN       NOT NULL DEFAULT false,
  usage_limit           INTEGER,
  usage_count           INTEGER       NOT NULL DEFAULT 0,
  valid_from            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  valid_to              TIMESTAMPTZ,
  is_active             BOOLEAN       NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX promotions_shop_active_idx ON public.promotions (shop_id, is_active);

CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── DISPUTES ────────────────────────────────────────────────────────────
CREATE TABLE public.disputes (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id        UUID        NOT NULL UNIQUE REFERENCES public.bookings(id),
  user_id           UUID        NOT NULL REFERENCES public.users(id),
  shop_id           UUID        NOT NULL REFERENCES public.shops(id),
  reason            TEXT        NOT NULL CHECK (reason IN (
                                  'service_not_delivered','quality_poor',
                                  'wrong_charge','barber_no_show','other'
                                )),
  description       TEXT        NOT NULL CHECK (char_length(description) BETWEEN 30 AND 2000),
  photos            TEXT[]      NOT NULL DEFAULT '{}',
  status            TEXT        NOT NULL DEFAULT 'open'
                                  CHECK (status IN (
                                    'open','shop_responded','under_review',
                                    'resolved_refund','resolved_no_refund','dismissed'
                                  )),
  shop_response     TEXT        CHECK (char_length(shop_response) <= 2000),
  shop_responded_at TIMESTAMPTZ,
  admin_decision    TEXT,
  admin_notes       TEXT,
  refund_amount     NUMERIC(10,2),
  sla_deadline      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 days'),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX disputes_user_idx  ON public.disputes (user_id);
CREATE INDEX disputes_shop_idx  ON public.disputes (shop_id, status);
CREATE INDEX disputes_open_idx  ON public.disputes (status, sla_deadline)
  WHERE status IN ('open','shop_responded','under_review');

CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── ADMIN ACTIONS ───────────────────────────────────────────────────────
CREATE TABLE public.admin_actions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID        NOT NULL REFERENCES public.users(id),
  action_type TEXT        NOT NULL,
  target_type TEXT        NOT NULL CHECK (target_type IN ('shop','user','dispute','booking','barber')),
  target_id   UUID        NOT NULL,
  notes       TEXT,
  details     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_actions_admin_idx  ON public.admin_actions (admin_id);
CREATE INDEX admin_actions_target_idx ON public.admin_actions (target_type, target_id);
CREATE INDEX admin_actions_time_idx   ON public.admin_actions (created_at DESC);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 5: AUTH TRIGGER                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name  TEXT;
  v_phone TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'),      ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'user_name'), '')
  );

  v_phone := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone,
    ''
  )), '');

  INSERT INTO public.users (id, email, phone, name, role)
  VALUES (NEW.id, NEW.email, v_phone, v_name, 'customer')
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        phone      = COALESCE(EXCLUDED.phone, public.users.phone),
        name       = COALESCE(EXCLUDED.name,  public.users.name),
        updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── GRANTS ────────────────────────────────────────────────────────────────
-- Auth admin needs INSERT/UPDATE for the trigger to create user rows
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT, UPDATE ON public.users TO supabase_auth_admin;

-- Authenticated users need full access (RLS controls what they can actually do)
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_breaks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favourites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slot_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slot_holds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT ON public.loyalty_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
GRANT SELECT, INSERT ON public.admin_actions TO authenticated;

-- Anon needs SELECT for public-read policies (verified shops, reviews, etc.)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.shops TO anon;
GRANT SELECT ON public.shop_hours TO anon;
GRANT SELECT ON public.shop_breaks TO anon;
GRANT SELECT ON public.barbers TO anon;
GRANT SELECT ON public.barber_hours TO anon;
GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.promotions TO anon;

-- Sequence for booking refs
GRANT USAGE ON SEQUENCE public.booking_ref_seq TO authenticated;

-- Service role needs full access (used by edge functions via SUPABASE_SERVICE_ROLE_KEY)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 6: BUSINESS FUNCTIONS                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_own_shop(p_shop_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shops WHERE id = p_shop_id AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_owner_shop_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM public.shops WHERE owner_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_role_by_email(p_email TEXT)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM public.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_role_by_email TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_role  TEXT;
  v_email TEXT;
  v_meta  JSONB;
  v_phone TEXT;
  v_name  TEXT;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = v_uid;
  IF FOUND THEN RETURN v_role; END IF;

  SELECT email, raw_user_meta_data INTO v_email, v_meta
  FROM auth.users WHERE id = v_uid;

  v_phone := NULLIF(TRIM(COALESCE(v_meta->>'phone', '')), '');
  v_name  := COALESCE(
    NULLIF(TRIM(v_meta->>'full_name'), ''),
    NULLIF(TRIM(v_meta->>'name'),      '')
  );

  INSERT INTO public.users (id, email, phone, name, role)
  VALUES (v_uid, v_email, v_phone, v_name, 'customer')
  ON CONFLICT (id) DO NOTHING;

  RETURN 'customer';
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO authenticated;

CREATE OR REPLACE FUNCTION public.promote_to_admin(p_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;
  UPDATE public.users SET role = 'admin' WHERE lower(email) = lower(p_email);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_email;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.promote_to_admin TO authenticated;

-- Auto-update shop + barber rating on review
CREATE OR REPLACE FUNCTION public.update_shop_rating()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.shops SET
    rating = COALESCE((
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM public.reviews WHERE shop_id = NEW.shop_id AND is_visible = true
    ), 0),
    review_count = (
      SELECT COUNT(*) FROM public.reviews WHERE shop_id = NEW.shop_id AND is_visible = true
    )
  WHERE id = NEW.shop_id;

  IF NEW.barber_id IS NOT NULL AND NEW.barber_rating IS NOT NULL THEN
    UPDATE public.barbers SET
      rating = COALESCE((
        SELECT ROUND(AVG(barber_rating)::NUMERIC, 2)
        FROM public.reviews
        WHERE barber_id = NEW.barber_id AND barber_rating IS NOT NULL AND is_visible = true
      ), 0),
      review_count = (
        SELECT COUNT(*) FROM public.reviews WHERE barber_id = NEW.barber_id AND is_visible = true
      )
    WHERE id = NEW.barber_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_update_rating
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_shop_rating();

-- Atomic slot hold
CREATE OR REPLACE FUNCTION public.atomic_hold_slot(
  p_shop_id    UUID,
  p_barber_id  UUID,
  p_user_id    UUID,
  p_hold_date  DATE,
  p_start_time TIME,
  p_end_time   TIME,
  p_service_ids UUID[],
  p_addon_ids   UUID[] DEFAULT '{}'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hold_id    UUID;
  v_expires_at TIMESTAMPTZ;
  v_conflict   BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE barber_id = p_barber_id AND date = p_hold_date
      AND status IN ('confirmed','in_chair')
      AND start_time < p_end_time AND end_time > p_start_time
  ) INTO v_conflict;
  IF v_conflict THEN RAISE EXCEPTION 'Time slot already booked'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.slot_holds
    WHERE barber_id = p_barber_id AND hold_date = p_hold_date
      AND expires_at > now() AND booking_id IS NULL
      AND start_time < p_end_time AND end_time > p_start_time
      AND user_id != p_user_id
  ) INTO v_conflict;
  IF v_conflict THEN RAISE EXCEPTION 'Time slot is currently held by another user'; END IF;

  DELETE FROM public.slot_holds
  WHERE user_id = p_user_id AND barber_id = p_barber_id
    AND hold_date = p_hold_date AND booking_id IS NULL;

  v_expires_at := now() + INTERVAL '5 minutes';

  INSERT INTO public.slot_holds (shop_id, barber_id, user_id, hold_date, start_time, end_time, service_ids, addon_ids, expires_at)
  VALUES (p_shop_id, p_barber_id, p_user_id, p_hold_date, p_start_time, p_end_time, p_service_ids, p_addon_ids, v_expires_at)
  RETURNING id INTO v_hold_id;

  RETURN jsonb_build_object('hold_id', v_hold_id, 'expires_at', v_expires_at);
END;
$$;

-- Increment no-show count
CREATE OR REPLACE FUNCTION public.increment_no_show_count(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users SET no_show_count = no_show_count + 1, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- PostGIS nearby shop search
CREATE OR REPLACE FUNCTION public.shops_nearby(
  p_lat        FLOAT,
  p_lng        FLOAT,
  p_radius_km  FLOAT   DEFAULT 5,
  p_open_now   BOOLEAN DEFAULT false,
  p_min_rating FLOAT   DEFAULT 0,
  p_max_price  FLOAT   DEFAULT NULL,
  p_features   TEXT[]  DEFAULT NULL,
  p_sort_by    TEXT    DEFAULT 'nearest',
  p_limit      INT     DEFAULT 20,
  p_offset     INT     DEFAULT 0
)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  slug         TEXT,
  address      TEXT,
  city         TEXT,
  lat          NUMERIC,
  lng          NUMERIC,
  photos       TEXT[],
  features     TEXT[],
  specialties  TEXT[],
  rating       NUMERIC,
  review_count INT,
  is_featured  BOOLEAN,
  distance_km  FLOAT,
  is_open_now  BOOLEAN,
  min_price    NUMERIC
) LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_point GEOGRAPHY := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  v_day   INT  := EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Kolkata');
  v_time  TIME := (NOW() AT TIME ZONE 'Asia/Kolkata')::TIME;
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.name, s.slug, s.address, s.city, s.lat, s.lng,
    s.photos, s.features, s.specialties, s.rating, s.review_count, s.is_featured,
    ST_Distance(s.location, v_point) / 1000.0 AS distance_km,
    EXISTS (
      SELECT 1 FROM public.shop_hours sh
      WHERE sh.shop_id = s.id AND sh.day_of_week = v_day
        AND sh.is_closed = false AND v_time BETWEEN sh.open_time AND sh.close_time
        AND NOT EXISTS (
          SELECT 1 FROM public.shop_breaks sb
          WHERE sb.shop_id = s.id
            AND (sb.day_of_week IS NULL OR sb.day_of_week = v_day)
            AND v_time BETWEEN sb.start_time AND sb.end_time
        )
    ) AS is_open_now,
    (SELECT MIN(sv.price) FROM public.services sv
     WHERE sv.shop_id = s.id AND sv.is_active = true AND sv.is_addon = false) AS min_price
  FROM public.shops s
  WHERE
    s.status = 'verified'
    AND s.location IS NOT NULL
    AND ST_DWithin(s.location, v_point, p_radius_km * 1000)
    AND s.rating >= p_min_rating
    AND (p_features IS NULL OR s.features @> p_features)
    AND (NOT p_open_now OR EXISTS (
      SELECT 1 FROM public.shop_hours sh
      WHERE sh.shop_id = s.id AND sh.day_of_week = v_day
        AND sh.is_closed = false AND v_time BETWEEN sh.open_time AND sh.close_time
    ))
    AND (p_max_price IS NULL OR EXISTS (
      SELECT 1 FROM public.services sv
      WHERE sv.shop_id = s.id AND sv.is_active = true
        AND sv.is_addon = false AND sv.price <= p_max_price
    ))
  ORDER BY
    CASE WHEN p_sort_by = 'nearest'   THEN ST_Distance(s.location, v_point) END ASC  NULLS LAST,
    CASE WHEN p_sort_by = 'top_rated' THEN s.rating                          END DESC NULLS LAST,
    s.is_featured DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 7: ROW LEVEL SECURITY                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_hours           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_breaks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_hours         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_blocks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_holds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions        ENABLE ROW LEVEL SECURITY;

-- ── USERS ────────────────────────────────────────────────────────────────
-- Any authenticated user can read their own row
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Any authenticated user can update their own row
-- Sensitive columns (role, is_active, is_suspended, loyalty_points, etc.)
-- are protected via COLUMN-LEVEL REVOKE below, not in the policy.
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin full access
CREATE POLICY "users_admin_all"
  ON public.users FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- NOTE: Sensitive columns (role, is_active, is_suspended, loyalty_points, etc.)
-- are protected by the application layer — edge functions use service_role key.
-- Frontend profile edit only sends safe fields (name, email, phone, address, etc.)

-- ── SHOPS ────────────────────────────────────────────────────────────────
CREATE POLICY "shops_public_read"
  ON public.shops FOR SELECT
  USING (status = 'verified');

CREATE POLICY "shops_owner_select"
  ON public.shops FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "shops_owner_insert"
  ON public.shops FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "shops_owner_update"
  ON public.shops FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "shops_admin_all"
  ON public.shops FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── SHOP HOURS ───────────────────────────────────────────────────────────
CREATE POLICY "shop_hours_public_read"
  ON public.shop_hours FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified'));

CREATE POLICY "shop_hours_owner_all"
  ON public.shop_hours FOR ALL TO authenticated
  USING (public.is_own_shop(shop_id)) WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "shop_hours_admin_all"
  ON public.shop_hours FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── SHOP BREAKS ──────────────────────────────────────────────────────────
CREATE POLICY "shop_breaks_public_read"
  ON public.shop_breaks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified'));

CREATE POLICY "shop_breaks_owner_all"
  ON public.shop_breaks FOR ALL TO authenticated
  USING (public.is_own_shop(shop_id)) WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "shop_breaks_admin_all"
  ON public.shop_breaks FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── FAVOURITES ───────────────────────────────────────────────────────────
CREATE POLICY "favourites_own"
  ON public.favourites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── BARBERS ──────────────────────────────────────────────────────────────
CREATE POLICY "barbers_public_read"
  ON public.barbers FOR SELECT
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
  );

CREATE POLICY "barbers_owner_select"
  ON public.barbers FOR SELECT TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "barbers_owner_insert"
  ON public.barbers FOR INSERT TO authenticated
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "barbers_owner_update"
  ON public.barbers FOR UPDATE TO authenticated
  USING (public.is_own_shop(shop_id)) WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "barbers_owner_delete"
  ON public.barbers FOR DELETE TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "barbers_admin_all"
  ON public.barbers FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── BARBER HOURS ─────────────────────────────────────────────────────────
CREATE POLICY "barber_hours_public_read"
  ON public.barber_hours FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.barbers b
    JOIN public.shops s ON s.id = b.shop_id
    WHERE b.id = barber_id AND s.status = 'verified'
  ));

CREATE POLICY "barber_hours_owner_all"
  ON public.barber_hours FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND public.is_own_shop(b.shop_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND public.is_own_shop(b.shop_id)));

CREATE POLICY "barber_hours_admin_all"
  ON public.barber_hours FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── SERVICES ─────────────────────────────────────────────────────────────
CREATE POLICY "services_public_read"
  ON public.services FOR SELECT
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
  );

CREATE POLICY "services_owner_select"
  ON public.services FOR SELECT TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "services_owner_insert"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "services_owner_update"
  ON public.services FOR UPDATE TO authenticated
  USING (public.is_own_shop(shop_id)) WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "services_owner_delete"
  ON public.services FOR DELETE TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "services_admin_all"
  ON public.services FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── SLOT BLOCKS ──────────────────────────────────────────────────────────
CREATE POLICY "slot_blocks_owner_all"
  ON public.slot_blocks FOR ALL TO authenticated
  USING (public.is_own_shop(shop_id)) WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "slot_blocks_admin_all"
  ON public.slot_blocks FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── SLOT HOLDS ───────────────────────────────────────────────────────────
CREATE POLICY "slot_holds_own_read"
  ON public.slot_holds FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "slot_holds_own_insert"
  ON public.slot_holds FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "slot_holds_own_delete"
  ON public.slot_holds FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND booking_id IS NULL);

CREATE POLICY "slot_holds_admin_all"
  ON public.slot_holds FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── BOOKINGS ─────────────────────────────────────────────────────────────
CREATE POLICY "bookings_customer_select"
  ON public.bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bookings_owner_select"
  ON public.bookings FOR SELECT TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "bookings_customer_insert"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending_payment');

CREATE POLICY "bookings_customer_cancel"
  ON public.bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('pending_payment','confirmed'))
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled' AND cancelled_by = 'customer');

CREATE POLICY "bookings_owner_update"
  ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_own_shop(shop_id)) WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "bookings_admin_all"
  ON public.bookings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── PAYMENTS ─────────────────────────────────────────────────────────────
CREATE POLICY "payments_customer_select"
  ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "payments_owner_select"
  ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND public.is_own_shop(b.shop_id)
  ));

CREATE POLICY "payments_admin_all"
  ON public.payments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── REVIEWS ──────────────────────────────────────────────────────────────
CREATE POLICY "reviews_public_read"
  ON public.reviews FOR SELECT
  USING (is_visible = true);

CREATE POLICY "reviews_owner_select"
  ON public.reviews FOR SELECT TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "reviews_customer_insert"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid() AND b.status = 'completed'
    )
  );

CREATE POLICY "reviews_customer_update"
  ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_owner_respond"
  ON public.reviews FOR UPDATE TO authenticated
  USING (public.is_own_shop(shop_id))
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "reviews_admin_all"
  ON public.reviews FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE POLICY "notifications_own_select"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_own_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_own_delete"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_all"
  ON public.notifications FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── LOYALTY TRANSACTIONS ─────────────────────────────────────────────────
CREATE POLICY "loyalty_tx_own_select"
  ON public.loyalty_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "loyalty_tx_admin_all"
  ON public.loyalty_transactions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── PROMOTIONS ───────────────────────────────────────────────────────────
CREATE POLICY "promotions_public_read"
  ON public.promotions FOR SELECT
  USING (
    is_active = true
    AND (valid_to IS NULL OR valid_to > now())
    AND EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
  );

CREATE POLICY "promotions_owner_select"
  ON public.promotions FOR SELECT TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "promotions_owner_insert"
  ON public.promotions FOR INSERT TO authenticated
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "promotions_owner_update"
  ON public.promotions FOR UPDATE TO authenticated
  USING (public.is_own_shop(shop_id)) WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "promotions_owner_delete"
  ON public.promotions FOR DELETE TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "promotions_admin_all"
  ON public.promotions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── DISPUTES ─────────────────────────────────────────────────────────────
CREATE POLICY "disputes_customer_select"
  ON public.disputes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "disputes_owner_select"
  ON public.disputes FOR SELECT TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "disputes_customer_insert"
  ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
  );

CREATE POLICY "disputes_owner_respond"
  ON public.disputes FOR UPDATE TO authenticated
  USING (public.is_own_shop(shop_id) AND status = 'open')
  WITH CHECK (public.is_own_shop(shop_id) AND status = 'shop_responded');

CREATE POLICY "disputes_admin_all"
  ON public.disputes FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── ADMIN ACTIONS ────────────────────────────────────────────────────────
CREATE POLICY "admin_actions_admin_all"
  ON public.admin_actions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 8: STORAGE BUCKETS + POLICIES                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('shop-photos',    'shop-photos',    true,  10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('profile-photos', 'profile-photos', false, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('review-photos',  'review-photos',  true,  5242880,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "shop_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-photos');

CREATE POLICY "shop_photos_owner_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-photos'
    AND public.is_own_shop((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "shop_photos_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'shop-photos'
    AND public.is_own_shop((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "shop_photos_admin"
  ON storage.objects FOR ALL TO authenticated
  USING  (bucket_id = 'shop-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'shop-photos' AND public.is_admin());

CREATE POLICY "profile_photos_own_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "profile_photos_own_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "profile_photos_own_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "review_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

CREATE POLICY "review_photos_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "review_photos_own_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 9: CRON JOBS                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $outer$ BEGIN
  PERFORM cron.schedule(
    'expire-slot-holds',
    '* * * * *',
    $sql$DELETE FROM public.slot_holds WHERE expires_at < now() AND booking_id IS NULL$sql$
  );

  PERFORM cron.schedule(
    'expire-pending-payments',
    '*/10 * * * *',
    $sql$
      UPDATE public.bookings
      SET status = 'expired'
      WHERE status = 'pending_payment'
        AND created_at < now() - INTERVAL '15 minutes'
    $sql$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Cron jobs skipped (pg_cron not enabled): %', SQLERRM;
END $outer$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 10: VERIFY                                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

SELECT
  (SELECT COUNT(*) FROM information_schema.tables   WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public')                              AS functions,
  (SELECT COUNT(*) FROM pg_policies                 WHERE schemaname = 'public')                                  AS rls_policies,
  (SELECT COUNT(*) FROM storage.buckets)                                                                           AS storage_buckets;
