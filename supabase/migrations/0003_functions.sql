-- ═══════════════════════════════════════════════════════════════════════════════
-- 0003_functions.sql — Auth trigger, role helpers, business logic functions
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── handle_new_user trigger ──────────────────────────────────────────────────
-- Fires on every auth.users INSERT (signup OR OAuth).
-- Maps signup metadata → correct DB role.
-- Uses EXCEPTION block so a constraint bug never blocks auth signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role  TEXT;
  v_phone TEXT;
  v_name  TEXT;
BEGIN
  -- Map frontend role value → DB role
  v_role := CASE COALESCE(NEW.raw_user_meta_data->>'role', '')
    WHEN 'owner' THEN 'shop_owner'
    WHEN 'admin' THEN 'customer'  -- admin is never set via signup
    ELSE 'customer'
  END;

  -- Phone: owner sends it in metadata; OTP flow has it on auth row
  v_phone := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone,
    ''
  )), '');

  -- Name: signup sends 'full_name'; fallback to 'name' for OAuth
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'),      ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'user_name'), '')
  );

  INSERT INTO public.users (id, email, phone, name, role)
  VALUES (NEW.id, NEW.email, v_phone, v_name, v_role)
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        phone      = COALESCE(EXCLUDED.phone, public.users.phone),
        name       = COALESCE(EXCLUDED.name,  public.users.name),
        updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log to Postgres log (visible in supabase logs) but never block auth
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Role & ownership helpers (SECURITY DEFINER bypasses RLS) ────────────────

-- Returns the DB role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Returns true if the current user has the 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

-- Returns true if the current user is the owner of the given shop
CREATE OR REPLACE FUNCTION public.is_own_shop(p_shop_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shops WHERE id = p_shop_id AND owner_id = auth.uid());
$$;

-- Returns the shop_id for the current shop_owner (NULL if not an owner or no shop)
CREATE OR REPLACE FUNCTION public.get_owner_shop_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM public.shops WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- Safe role lookup by email — returns ONLY the role string, no PII.
-- Used during sign-up to detect role conflicts. Callable by anon.
CREATE OR REPLACE FUNCTION public.get_role_by_email(p_email TEXT)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM public.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_role_by_email TO anon, authenticated;

-- Called from client on sign-in as a safety net if the trigger row is missing.
-- Auto-creates the profile from auth metadata and returns the role.
--
-- SECURITY NOTE: Once a row exists in public.users the DB role is authoritative.
-- We never update role from user-controlled auth metadata — that would allow
-- any user to escalate privileges by calling supabase.auth.updateUser().
-- To fix an incorrectly-assigned role, use the admin SQL in the comments below.
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
  -- Row already exists: trust the DB value, never override from metadata
  SELECT role INTO v_role FROM public.users WHERE id = v_uid;
  IF FOUND THEN RETURN v_role; END IF;

  -- Row is missing (trigger didn't fire): create it from auth metadata.
  -- This only runs for brand-new accounts on their first sign-in.
  SELECT email, raw_user_meta_data INTO v_email, v_meta
  FROM auth.users WHERE id = v_uid;

  v_role := CASE COALESCE(v_meta->>'role', '')
    WHEN 'owner' THEN 'shop_owner'
    ELSE 'customer'
  END;

  v_phone := NULLIF(TRIM(COALESCE(v_meta->>'phone', '')), '');
  v_name  := COALESCE(
    NULLIF(TRIM(v_meta->>'full_name'), ''),
    NULLIF(TRIM(v_meta->>'name'),      '')
  );

  INSERT INTO public.users (id, email, phone, name, role)
  VALUES (v_uid, v_email, v_phone, v_name, v_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN v_role;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO authenticated;

-- ─── Admin helper: fix accounts where trigger assigned the wrong role ──────────
-- Run manually in SQL Editor when a shop_owner signed up but got 'customer':
--
--   UPDATE public.users u
--   SET role = 'shop_owner', updated_at = now()
--   FROM auth.users a
--   WHERE u.id = a.id
--     AND u.role = 'customer'
--     AND a.raw_user_meta_data->>'role' = 'owner';
--
-- This is safe because it runs with service-role credentials, not from the client.

-- ─── Update shop rating after review insert/update ────────────────────────────

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

-- ─── Self-upgrade: customer → shop_owner ─────────────────────────────────────
-- Called when a customer clicks "Open My Shop" and agrees to ToC.
-- Any authenticated customer can call this — the SHOP itself still needs admin
-- approval before it goes live. Admin role is never touched.

CREATE OR REPLACE FUNCTION public.request_shop_owner()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = v_uid;
  IF v_role IS NULL THEN RAISE EXCEPTION 'User profile not found'; END IF;
  IF v_role = 'admin'      THEN RETURN v_role; END IF;  -- never touch admin
  IF v_role = 'shop_owner' THEN RETURN v_role; END IF;  -- already owner
  UPDATE public.users SET role = 'shop_owner', updated_at = now() WHERE id = v_uid;
  RETURN 'shop_owner';
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_shop_owner TO authenticated;

-- ─── Admin: promote a user to admin role ─────────────────────────────────────
-- Only existing admins (or service role) can call this.
-- First admin must be set directly via SQL: UPDATE public.users SET role='admin' WHERE email='...';

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

-- ─── Nearby shops (PostGIS spatial query) ────────────────────────────────────

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
      WHERE sh.shop_id = s.id
        AND sh.day_of_week = v_day
        AND sh.is_closed = false
        AND v_time BETWEEN sh.open_time AND sh.close_time
        AND NOT EXISTS (
          SELECT 1 FROM public.shop_breaks sb
          WHERE sb.shop_id = s.id
            AND (sb.day_of_week IS NULL OR sb.day_of_week = v_day)
            AND v_time BETWEEN sb.start_time AND sb.end_time
        )
    ) AS is_open_now,
    (SELECT MIN(price) FROM public.services sv WHERE sv.shop_id = s.id AND sv.is_active = true AND sv.is_addon = false) AS min_price
  FROM public.shops s
  WHERE
    s.status = 'verified'
    AND (s.location IS NOT NULL)
    AND ST_DWithin(s.location, v_point, p_radius_km * 1000)
    AND s.rating >= p_min_rating
    AND (p_features IS NULL OR s.features @> p_features)
    AND (
      NOT p_open_now OR EXISTS (
        SELECT 1 FROM public.shop_hours sh
        WHERE sh.shop_id = s.id AND sh.day_of_week = v_day
          AND sh.is_closed = false AND v_time BETWEEN sh.open_time AND sh.close_time
      )
    )
    AND (
      p_max_price IS NULL OR EXISTS (
        SELECT 1 FROM public.services sv
        WHERE sv.shop_id = s.id AND sv.is_active = true
          AND sv.is_addon = false AND sv.price <= p_max_price
      )
    )
  ORDER BY
    CASE WHEN p_sort_by = 'nearest'   THEN ST_Distance(s.location, v_point) END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'top_rated' THEN s.rating END DESC NULLS LAST,
    s.is_featured DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
