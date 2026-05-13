-- ═══════════════════════════════════════════════════════════════════════════════
-- 0002_schema.sql — Core table definitions
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Shared: auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── USERS ────────────────────────────────────────────────────────────────────
-- One row per auth.users entry. Created automatically via trigger on sign-up.
-- Role is the single source of truth for access control.

CREATE TABLE public.users (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT        UNIQUE,                          -- synced from auth.users
  phone          TEXT,                                        -- nullable; partial unique below
  name           TEXT,
  avatar_url     TEXT,
  role           TEXT        NOT NULL DEFAULT 'customer'
                               CHECK (role IN ('customer', 'barber', 'shop_owner', 'admin')),
  loyalty_points INTEGER     NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  loyalty_tier   TEXT        NOT NULL DEFAULT 'bronze'
                               CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  no_show_count  INTEGER     NOT NULL DEFAULT 0 CHECK (no_show_count >= 0),
  fcm_token      TEXT,                                        -- Firebase push token
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  is_suspended   BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phone unique only when non-null and non-empty (allows many email-only users)
CREATE UNIQUE INDEX users_phone_unique
  ON public.users (phone)
  WHERE phone IS NOT NULL AND phone != '';

CREATE INDEX users_role_idx        ON public.users (role);
CREATE INDEX users_email_lower_idx ON public.users (lower(email));

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-update loyalty tier when points change
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

CREATE TRIGGER users_loyalty_tier
  BEFORE UPDATE OF loyalty_points ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_loyalty_tier();

-- ─── SHOPS ────────────────────────────────────────────────────────────────────

CREATE TABLE public.shops (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id               UUID        NOT NULL REFERENCES public.users(id),
  name                   TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  slug                   TEXT        UNIQUE,
  description            TEXT        CHECK (char_length(description) <= 500),
  phone                  TEXT        NOT NULL,
  email                  TEXT,
  address                TEXT        NOT NULL,
  city                   TEXT        NOT NULL,
  state                  TEXT        NOT NULL,
  pincode                TEXT        NOT NULL CHECK (pincode ~ '^\d{6}$'),
  location               GEOGRAPHY(POINT, 4326),             -- PostGIS (lng, lat)
  lat                    NUMERIC(10,7),
  lng                    NUMERIC(10,7),
  status                 TEXT        NOT NULL DEFAULT 'pending'
                                       CHECK (status IN ('pending','verified','rejected','suspended')),
  photos                 TEXT[]      NOT NULL DEFAULT '{}',
  features               TEXT[]      NOT NULL DEFAULT '{}',  -- ['wifi','parking','ac',...]
  specialties            TEXT[]      NOT NULL DEFAULT '{}',
  social_instagram       TEXT,
  social_facebook        TEXT,
  gst_number             TEXT,
  razorpay_account_id    TEXT,                               -- linked payout account
  advance_percentage     INTEGER     NOT NULL DEFAULT 30
                                       CHECK (advance_percentage BETWEEN 0 AND 100),
  auto_confirm_bookings  BOOLEAN     NOT NULL DEFAULT false,
  slot_buffer_min        INTEGER     NOT NULL DEFAULT 10
                                       CHECK (slot_buffer_min IN (0,5,10,15)),
  rating                 NUMERIC(3,2) NOT NULL DEFAULT 0
                                       CHECK (rating BETWEEN 0 AND 5),
  review_count           INTEGER     NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  is_featured            BOOLEAN     NOT NULL DEFAULT false,
  rejection_reason       TEXT,                               -- set by admin on rejection
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shops_location_idx   ON public.shops USING GIST (location);
CREATE INDEX shops_status_city_idx ON public.shops (status, city);
CREATE INDEX shops_owner_idx      ON public.shops (owner_id);
CREATE INDEX shops_rating_idx     ON public.shops (rating DESC) WHERE status = 'verified';
CREATE INDEX shops_name_trgm_idx  ON public.shops USING GIN (name gin_trgm_ops);

CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── SHOP HOURS ───────────────────────────────────────────────────────────────

CREATE TABLE public.shop_hours (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID    NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  open_time   TIME    NOT NULL,
  close_time  TIME    NOT NULL,
  is_closed   BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (shop_id, day_of_week),
  CHECK (close_time > open_time)
);

CREATE INDEX shop_hours_shop_idx ON public.shop_hours (shop_id);

-- ─── SHOP BREAKS (recurring, e.g., lunch break) ───────────────────────────────

CREATE TABLE public.shop_breaks (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID    NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- NULL = applies every day
  start_time  TIME    NOT NULL,
  end_time    TIME    NOT NULL,
  label       TEXT,
  CHECK (end_time > start_time)
);

CREATE INDEX shop_breaks_shop_idx ON public.shop_breaks (shop_id);

-- ─── FAVOURITES ───────────────────────────────────────────────────────────────

CREATE TABLE public.favourites (
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id    UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shop_id)
);

CREATE INDEX favourites_user_idx ON public.favourites (user_id);

-- ─── BARBERS (shop staff) ─────────────────────────────────────────────────────

CREATE TABLE public.barbers (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id       UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES public.users(id),      -- NULL until invite accepted
  name          TEXT        NOT NULL CHECK (char_length(name) >= 2),
  phone         TEXT,                                          -- optional at creation
  email         TEXT,                                          -- for invite email
  avatar_url    TEXT,
  bio           TEXT        CHECK (char_length(bio) <= 300),
  specialties   TEXT[]      NOT NULL DEFAULT '{}',
  rating        NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  review_count  INTEGER     NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  invite_status TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (invite_status IN ('pending','accepted','declined')),
  invite_token  TEXT        UNIQUE,                            -- one-time invite token
  invite_expires_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX barbers_shop_idx ON public.barbers (shop_id);
CREATE INDEX barbers_user_idx ON public.barbers (user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER barbers_updated_at
  BEFORE UPDATE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── BARBER HOURS (overrides shop hours for individual barbers) ───────────────

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

-- ─── SERVICES ─────────────────────────────────────────────────────────────────

CREATE TABLE public.services (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id      UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  category     TEXT        NOT NULL
                             CHECK (category IN ('hair','beard','skin','combo','kids','other')),
  duration_min INTEGER     NOT NULL CHECK (duration_min IN (15,30,45,60,90,120)),
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 1 AND price <= 99999),
  description  TEXT        CHECK (char_length(description) <= 300),
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  is_addon     BOOLEAN     NOT NULL DEFAULT false,  -- addon to a main service
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX services_shop_active_idx ON public.services (shop_id, is_active);
CREATE INDEX services_name_trgm_idx   ON public.services USING GIN (name gin_trgm_ops);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── SLOT BLOCKS (manual blocks: holidays, breaks, etc.) ──────────────────────

CREATE TABLE public.slot_blocks (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID    NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  barber_id   UUID    REFERENCES public.barbers(id) ON DELETE CASCADE, -- NULL = whole shop
  block_date  DATE,                         -- NULL = recurring (day_of_week applies)
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME    NOT NULL,
  end_time    TIME    NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (block_date IS NOT NULL OR day_of_week IS NOT NULL) -- must have one or the other
);

CREATE INDEX slot_blocks_shop_date_idx ON public.slot_blocks (shop_id, block_date);
CREATE INDEX slot_blocks_barber_idx    ON public.slot_blocks (barber_id, block_date);

-- ─── BOOKING REFERENCE ────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS booking_ref_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_booking_ref()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'ONO-' || LPAD(nextval('booking_ref_seq')::TEXT, 6, '0');
END;
$$;

-- ─── SLOT HOLDS (5-min lock during checkout to prevent double-booking) ────────

CREATE TABLE public.slot_holds (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id)    ON DELETE CASCADE,
  barber_id   UUID        NOT NULL REFERENCES public.barbers(id)  ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  hold_date   DATE        NOT NULL,
  start_time  TIME        NOT NULL,
  end_time    TIME        NOT NULL,
  service_ids UUID[]      NOT NULL,
  addon_ids   UUID[]      NOT NULL DEFAULT '{}',
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  booking_id  UUID,                                              -- set after payment confirmed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX slot_holds_slot_idx   ON public.slot_holds (barber_id, hold_date, start_time, end_time);
CREATE INDEX slot_holds_user_idx   ON public.slot_holds (user_id);
CREATE INDEX slot_holds_expiry_idx ON public.slot_holds (expires_at) WHERE booking_id IS NULL;

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────

CREATE TABLE public.bookings (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref         TEXT        UNIQUE NOT NULL DEFAULT public.generate_booking_ref(),
  user_id             UUID        NOT NULL REFERENCES public.users(id),
  shop_id             UUID        NOT NULL REFERENCES public.shops(id),
  barber_id           UUID        REFERENCES public.barbers(id),
  service_ids         UUID[]      NOT NULL CHECK (cardinality(service_ids) > 0),
  addon_ids           UUID[]      NOT NULL DEFAULT '{}',
  date                DATE        NOT NULL,
  start_time          TIME        NOT NULL,
  end_time            TIME        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending_payment'
                                    CHECK (status IN (
                                      'pending_payment','confirmed','in_chair',
                                      'completed','cancelled','no_show',
                                      'disputed','expired'
                                    )),
  total_amount        NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  advance_amount      NUMERIC(10,2) NOT NULL CHECK (advance_amount >= 0),
  instructions        TEXT        CHECK (char_length(instructions) <= 500),
  reference_photo_url TEXT,
  cancel_reason       TEXT,
  cancelled_by        TEXT        CHECK (cancelled_by IN ('customer','shop','system','admin')),
  no_show_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (advance_amount <= total_amount)
);

CREATE INDEX bookings_user_idx        ON public.bookings (user_id, created_at DESC);
CREATE INDEX bookings_shop_date_idx   ON public.bookings (shop_id, date);
CREATE INDEX bookings_barber_date_idx ON public.bookings (barber_id, date);
CREATE INDEX bookings_status_idx      ON public.bookings (status);
-- Composite for conflict detection
CREATE INDEX bookings_conflict_idx    ON public.bookings (barber_id, date, start_time, end_time)
  WHERE status IN ('confirmed','in_chair');

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Back-reference from slot_holds → bookings
ALTER TABLE public.slot_holds
  ADD CONSTRAINT slot_holds_booking_fk
  FOREIGN KEY (booking_id) REFERENCES public.bookings(id);

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────

CREATE TABLE public.payments (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          UUID        NOT NULL REFERENCES public.bookings(id),
  user_id             UUID        NOT NULL REFERENCES public.users(id),
  amount              NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  type                TEXT        NOT NULL CHECK (type IN ('advance','balance','refund','compensation')),
  method              TEXT        CHECK (method IN ('razorpay','cash','wallet','loyalty')),
  status              TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','captured','failed','refunded')),
  razorpay_order_id   TEXT        UNIQUE,
  razorpay_payment_id TEXT        UNIQUE,
  razorpay_signature  TEXT,
  refund_id           TEXT        UNIQUE,
  failure_reason      TEXT,
  metadata            JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_booking_idx ON public.payments (booking_id);
CREATE INDEX payments_user_idx    ON public.payments (user_id);
CREATE INDEX payments_status_idx  ON public.payments (status) WHERE status = 'pending';

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── REVIEWS ──────────────────────────────────────────────────────────────────

CREATE TABLE public.reviews (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id         UUID        NOT NULL UNIQUE REFERENCES public.bookings(id),
  user_id            UUID        NOT NULL REFERENCES public.users(id),
  shop_id            UUID        NOT NULL REFERENCES public.shops(id),
  barber_id          UUID        REFERENCES public.barbers(id),
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

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

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
  data       JSONB       NOT NULL DEFAULT '{}',  -- e.g. {booking_id: "..."}
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;
CREATE INDEX notifications_user_all_idx    ON public.notifications (user_id, created_at DESC);

-- ─── LOYALTY TRANSACTIONS ─────────────────────────────────────────────────────

CREATE TABLE public.loyalty_transactions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  booking_id    UUID        REFERENCES public.bookings(id),
  points        INTEGER     NOT NULL,                -- positive = earn, negative = redeem/expire
  type          TEXT        NOT NULL CHECK (type IN ('earn','redeem','bonus','expire','adjust')),
  description   TEXT        NOT NULL,
  balance_after INTEGER     NOT NULL CHECK (balance_after >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX loyalty_tx_user_idx ON public.loyalty_transactions (user_id, created_at DESC);

-- ─── PROMOTIONS ───────────────────────────────────────────────────────────────

CREATE TABLE public.promotions (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id                UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  type                   TEXT        NOT NULL CHECK (type IN (
                                       'flat_discount','percentage_discount','combo',
                                       'happy_hour','new_customer','loyalty_bonus'
                                     )),
  title                  TEXT        NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  discount_value         NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_discount_amount    NUMERIC(10,2),                       -- cap for percentage discounts
  service_ids            UUID[],                              -- NULL = applies to all services
  applicable_hours_start TIME,                                -- for happy_hour type
  applicable_hours_end   TIME,
  min_booking_amount     NUMERIC(10,2),
  new_customers_only     BOOLEAN     NOT NULL DEFAULT false,
  usage_limit            INTEGER,                             -- NULL = unlimited
  usage_count            INTEGER     NOT NULL DEFAULT 0,
  valid_from             TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to               TIMESTAMPTZ,
  is_active              BOOLEAN     NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX promotions_shop_active_idx ON public.promotions (shop_id, is_active);

CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── DISPUTES ─────────────────────────────────────────────────────────────────

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

CREATE INDEX disputes_user_idx    ON public.disputes (user_id);
CREATE INDEX disputes_shop_idx    ON public.disputes (shop_id, status);
CREATE INDEX disputes_open_idx    ON public.disputes (status, sla_deadline)
  WHERE status IN ('open','shop_responded','under_review');

CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── ADMIN ACTIONS (audit log) ────────────────────────────────────────────────

CREATE TABLE public.admin_actions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID        NOT NULL REFERENCES public.users(id),
  action_type TEXT        NOT NULL,  -- 'approve_shop','reject_shop','suspend_user','resolve_dispute',...
  target_type TEXT        NOT NULL CHECK (target_type IN ('shop','user','dispute','booking','barber')),
  target_id   UUID        NOT NULL,
  notes       TEXT,
  details     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_actions_admin_idx   ON public.admin_actions (admin_id);
CREATE INDEX admin_actions_target_idx  ON public.admin_actions (target_type, target_id);
CREATE INDEX admin_actions_time_idx    ON public.admin_actions (created_at DESC);
