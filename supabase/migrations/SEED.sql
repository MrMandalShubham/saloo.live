-- ════════════════════════════════════════════════════════════════════════════
-- OnO — SEED SCRIPT (test accounts)
-- Run this in Supabase SQL Editor AFTER BUILD.sql.
-- ────────────────────────────────────────────────────────────────────────────
-- Test credentials (all three accounts):
--   Password: Test@1234
--
--   customer@ono.test  → role: customer
--   owner@ono.test     → role: shop_owner  (+ a seeded verified shop)
--   admin@ono.test     → role: admin
-- ════════════════════════════════════════════════════════════════════════════

DO $seed$
DECLARE
  v_customer_id UUID := gen_random_uuid();
  v_owner_id    UUID := gen_random_uuid();
  v_admin_id    UUID := gen_random_uuid();
  v_shop_id     UUID := gen_random_uuid();
  v_barber1_id  UUID := gen_random_uuid();
  v_barber2_id  UUID := gen_random_uuid();
BEGIN

  -- ── 1. AUTH USERS ─────────────────────────────────────────────────────────

  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES
    (
      v_customer_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'customer@ono.test',
      crypt('Test@1234', gen_salt('bf')),
      now(),
      '{"full_name": "Ravi Kumar"}'::jsonb,
      now(), now(), '', '', '', ''
    ),
    (
      v_owner_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'owner@ono.test',
      crypt('Test@1234', gen_salt('bf')),
      now(),
      '{"full_name": "Suresh Sharma"}'::jsonb,
      now(), now(), '', '', '', ''
    ),
    (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'admin@ono.test',
      crypt('Test@1234', gen_salt('bf')),
      now(),
      '{"full_name": "OnO Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );

  -- ── 2. AUTH IDENTITIES (email provider) ──────────────────────────────────

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES
    (
      gen_random_uuid(), v_customer_id,
      json_build_object('sub', v_customer_id::text, 'email', 'customer@ono.test'),
      'email', v_customer_id::text,
      now(), now(), now()
    ),
    (
      gen_random_uuid(), v_owner_id,
      json_build_object('sub', v_owner_id::text, 'email', 'owner@ono.test'),
      'email', v_owner_id::text,
      now(), now(), now()
    ),
    (
      gen_random_uuid(), v_admin_id,
      json_build_object('sub', v_admin_id::text, 'email', 'admin@ono.test'),
      'email', v_admin_id::text,
      now(), now(), now()
    );

  -- ── 3. PUBLIC.USERS — trigger already created rows with role='customer'.
  --        Use explicit UPDATE to set the correct roles (more reliable than ON CONFLICT).

  UPDATE public.users SET name = 'Ravi Kumar',   role = 'customer'   WHERE id = v_customer_id;
  UPDATE public.users SET name = 'Suresh Sharma', role = 'shop_owner' WHERE id = v_owner_id;
  UPDATE public.users SET name = 'OnO Admin',     role = 'admin'      WHERE id = v_admin_id;

  -- ── 4. TEST SHOP (owned by shop owner, status = verified) ─────────────────

  INSERT INTO public.shops (
    id, owner_id, name, slug, description,
    phone, email, address, city, state, pincode,
    lat, lng, location,
    status, features, specialties,
    advance_percentage, auto_confirm_bookings, slot_buffer_min,
    rating, review_count, is_featured
  ) VALUES (
    v_shop_id,
    v_owner_id,
    'Sharma''s Classic Cuts',
    'sharmas-classic-cuts',
    'Premium barbershop in the heart of Bangalore. Expert haircuts, beard grooming, and skin care since 2015.',
    '9876543210',
    'owner@ono.test',
    '12, MG Road, Near Trinity Metro Station',
    'Bangalore',
    'Karnataka',
    '560001',
    12.9716,
    77.5946,
    ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326),
    'verified',
    ARRAY['ac', 'wifi', 'parking', 'card_payment'],
    ARRAY['haircut', 'beard', 'skin'],
    30,
    false,
    10,
    4.5,
    28,
    true
  );

  -- ── 5. SHOP HOURS (Mon–Sat 9am–8pm, Sunday closed) ────────────────────────

  INSERT INTO public.shop_hours (shop_id, day_of_week, open_time, close_time, is_closed)
  VALUES
    (v_shop_id, 0, '09:00', '20:00', true),   -- Sunday  closed
    (v_shop_id, 1, '09:00', '20:00', false),  -- Monday
    (v_shop_id, 2, '09:00', '20:00', false),  -- Tuesday
    (v_shop_id, 3, '09:00', '20:00', false),  -- Wednesday
    (v_shop_id, 4, '09:00', '20:00', false),  -- Thursday
    (v_shop_id, 5, '09:00', '21:00', false),  -- Friday (late)
    (v_shop_id, 6, '09:00', '21:00', false);  -- Saturday (late)

  -- ── 6. LUNCH BREAK ────────────────────────────────────────────────────────

  INSERT INTO public.shop_breaks (shop_id, day_of_week, start_time, end_time, label)
  VALUES (v_shop_id, NULL, '13:30', '14:00', 'Lunch Break');

  -- ── 7. BARBERS ────────────────────────────────────────────────────────────

  INSERT INTO public.barbers (id, shop_id, name, phone, bio, specialties, rating, review_count, is_active, invite_status)
  VALUES
    (
      v_barber1_id, v_shop_id,
      'Arjun Nair',
      '9123456780',
      'Senior barber with 8 years of experience. Specialises in fades and modern haircuts.',
      ARRAY['fade', 'modern_cuts', 'beard_styling'],
      4.7, 19, true, 'accepted'
    ),
    (
      v_barber2_id, v_shop_id,
      'Deepak Reddy',
      '9123456781',
      'Expert in classic cuts and traditional straight razor shaves.',
      ARRAY['classic_cuts', 'straight_razor', 'skin_fade'],
      4.3, 11, true, 'accepted'
    );

  -- ── 8. BARBER HOURS (same as shop hours) ──────────────────────────────────

  INSERT INTO public.barber_hours (barber_id, day_of_week, open_time, close_time, is_off)
  SELECT v_barber1_id, day_of_week, open_time, close_time, is_closed
  FROM public.shop_hours WHERE shop_id = v_shop_id;

  INSERT INTO public.barber_hours (barber_id, day_of_week, open_time, close_time, is_off)
  SELECT v_barber2_id, day_of_week, open_time, close_time, is_closed
  FROM public.shop_hours WHERE shop_id = v_shop_id;

  -- ── 9. SERVICES ───────────────────────────────────────────────────────────

  INSERT INTO public.services (shop_id, name, category, duration_min, price, description, is_active, sort_order)
  VALUES
    (v_shop_id, 'Classic Haircut',          'hair',  30,  250,  'Scissor or clipper cut with wash and blow dry.',             true, 1),
    (v_shop_id, 'Skin Fade',                'hair',  45,  350,  'Smooth skin fade — zero to any length on top.',              true, 2),
    (v_shop_id, 'Beard Trim & Shape',       'beard', 30,  200,  'Precise trim and shaping with hot towel finish.',            true, 3),
    (v_shop_id, 'Full Beard Grooming',      'beard', 45,  350,  'Trim, shape, oil treatment, and straight razor neck line.',  true, 4),
    (v_shop_id, 'Hair + Beard Combo',       'combo', 60,  500,  'Classic haircut and full beard grooming — best value.',      true, 5),
    (v_shop_id, 'Kids Haircut (under 12)',  'kids',  30,  180,  'Gentle, fun haircut for children.',                          true, 6),
    (v_shop_id, 'De-Tan Face Pack',         'skin',  30,  300,  'Remove tan and refresh skin — complements any haircut.',     true, 7),
    (v_shop_id, 'Wash & Blow Dry',          'hair',  15,  100,  'Shampoo, condition, and style.',                             true, 8),
    (v_shop_id, 'Hot Towel Neck Shave',     'beard', 15,  100,  'Add-on: hot towel straight razor neck and line clean-up.',   true, 9);

  -- ── 10. ACTIVE PROMOTION ──────────────────────────────────────────────────

  INSERT INTO public.promotions (
    shop_id, type, title, discount_value, max_discount_amount,
    new_customers_only, usage_limit, valid_from, valid_to, is_active
  ) VALUES (
    v_shop_id,
    'percentage_discount',
    'New Customer Welcome Offer',
    20,
    100,
    true,
    50,
    now(),
    now() + INTERVAL '30 days',
    true
  );

  RAISE NOTICE '─────────────────────────────────────────────';
  RAISE NOTICE 'SEED COMPLETE';
  RAISE NOTICE '';
  RAISE NOTICE 'Test accounts (password: Test@1234)';
  RAISE NOTICE '  Customer  → customer@ono.test';
  RAISE NOTICE '  Shop Owner → owner@ono.test';
  RAISE NOTICE '  Admin      → admin@ono.test';
  RAISE NOTICE '';
  RAISE NOTICE 'Test shop: Sharma''s Classic Cuts (Bangalore, verified)';
  RAISE NOTICE '─────────────────────────────────────────────';

END $seed$;
