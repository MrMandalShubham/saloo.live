-- ─── Seed Data — Development Only ────────────────────────────────────────────
-- 2 verified shops in Indore with barbers, services, hours

-- NOTE: User IDs below are placeholders. After running `supabase start`,
-- create a test user via phone OTP and replace these UUIDs.

DO $$
DECLARE
  v_owner1  UUID := '00000000-0000-0000-0000-000000000001';
  v_shop1   UUID := '00000000-0000-0000-0000-000000000010';
  v_shop2   UUID := '00000000-0000-0000-0000-000000000020';
  v_barber1 UUID := '00000000-0000-0000-0000-000000000101';
  v_barber2 UUID := '00000000-0000-0000-0000-000000000102';
  v_barber3 UUID := '00000000-0000-0000-0000-000000000103';
  v_barber4 UUID := '00000000-0000-0000-0000-000000000104';
BEGIN

-- ── Shop 1: The Sharp Lounge ──────────────────────────────────────────────────
INSERT INTO public.shops (id, owner_id, name, slug, description, phone, address, city, state, pincode, location, lat, lng, status, photos, features, specialties, rating, review_count)
VALUES (
  v_shop1, v_owner1,
  'The Sharp Lounge', 'the-sharp-lounge',
  'Premium grooming experience in the heart of Arera Colony. Specialists in skin fades, beard art, and kids cuts.',
  '+919876543210',
  '12, Zone-2, M.P. Nagar, Arera Colony', 'Indore', 'Madhya Pradesh', '452016',
  ST_SetSRID(ST_MakePoint(75.8577, 22.7196), 4326), 22.7196, 75.8577,
  'verified',
  ARRAY[
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800'
  ],
  ARRAY['ac','wifi','card','parking'],
  ARRAY['Fades specialist','Beard art','Kids cuts'],
  4.8, 142
);

-- Shop 1 hours (Mon–Sat 9AM–9PM, Sun closed)
INSERT INTO public.shop_hours (shop_id, day_of_week, open_time, close_time, is_closed) VALUES
  (v_shop1, 0, '09:00', '21:00', true),   -- Sun
  (v_shop1, 1, '09:00', '21:00', false),  -- Mon
  (v_shop1, 2, '09:00', '21:00', false),  -- Tue
  (v_shop1, 3, '09:00', '21:00', false),  -- Wed
  (v_shop1, 4, '09:00', '21:00', false),  -- Thu
  (v_shop1, 5, '09:00', '21:00', false),  -- Fri
  (v_shop1, 6, '09:00', '22:00', false);  -- Sat

-- Barbers for Shop 1
INSERT INTO public.barbers (id, shop_id, name, phone, specialties, rating, review_count, is_active)
VALUES
  (v_barber1, v_shop1, 'Arjun Kumar', '+919812345678', ARRAY['Skin fade','Side part','Kids cuts'], 4.9, 89, true),
  (v_barber2, v_shop1, 'Ravi Sharma', '+919823456789', ARRAY['Beard trim','Classic shave','Beard art'], 4.7, 53, true);

-- Services for Shop 1
INSERT INTO public.services (shop_id, name, category, duration_min, price, description, sort_order) VALUES
  (v_shop1, 'Premium Haircut',   'hair',  30, 299, 'Includes wash, cut, blow-dry and styling', 1),
  (v_shop1, 'Classic Cut',       'hair',  20, 199, 'Clean classic haircut', 2),
  (v_shop1, 'Skin Fade',         'hair',  45, 349, 'Precise skin fade with styling', 3),
  (v_shop1, 'Kids Cut',          'kids',  20, 149, 'Gentle cut for kids under 12', 4),
  (v_shop1, 'Beard Trim',        'beard', 20, 149, 'Shape and trim with hot towel', 5),
  (v_shop1, 'Beard Art',         'beard', 45, 399, 'Creative beard design and line-up', 6),
  (v_shop1, 'Classic Shave',     'beard', 20, 199, 'Straight razor shave with hot towel', 7),
  (v_shop1, 'Hot Towel',         'beard', 10,  49, 'Hot towel treatment add-on', 8),
  (v_shop1, 'Hair Wash',         'hair',  10,  49, 'Shampoo and conditioner wash add-on', 9),
  (v_shop1, 'Styling',           'hair',  10,  79, 'Professional product styling add-on', 10);

UPDATE public.services SET is_addon = true WHERE shop_id = v_shop1 AND name IN ('Hot Towel','Hair Wash','Styling');

-- ── Shop 2: Blade & Style ────────────────────────────────────────────────────
INSERT INTO public.shops (id, owner_id, name, slug, description, phone, address, city, state, pincode, location, lat, lng, status, photos, features, specialties, rating, review_count)
VALUES (
  v_shop2, v_owner1,
  'Blade & Style', 'blade-and-style',
  'Modern barbershop with expert stylists. Walk-ins welcome. Serving Vijay Nagar since 2018.',
  '+919834567890',
  '45, Scheme 54, Vijay Nagar', 'Indore', 'Madhya Pradesh', '452010',
  ST_SetSRID(ST_MakePoint(75.8874, 22.7534), 4326), 22.7534, 75.8874,
  'verified',
  ARRAY[
    'https://images.unsplash.com/photo-1512690459411-b9245aed614d?w=800',
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800'
  ],
  ARRAY['ac','card','wifi'],
  ARRAY['Modern cuts','Colour','Premium products'],
  4.5, 78
);

-- Shop 2 hours (Mon–Sun 10AM–9PM)
INSERT INTO public.shop_hours (shop_id, day_of_week, open_time, close_time, is_closed) VALUES
  (v_shop2, 0, '10:00', '20:00', false),
  (v_shop2, 1, '10:00', '21:00', false),
  (v_shop2, 2, '10:00', '21:00', false),
  (v_shop2, 3, '10:00', '21:00', false),
  (v_shop2, 4, '10:00', '21:00', false),
  (v_shop2, 5, '10:00', '21:00', false),
  (v_shop2, 6, '10:00', '21:00', false);

-- Barbers for Shop 2
INSERT INTO public.barbers (id, shop_id, name, phone, specialties, rating, review_count, is_active)
VALUES
  (v_barber3, v_shop2, 'Deepak Patel',  '+919845678901', ARRAY['Modern cuts','Hair colour','Texture'], 4.6, 41, true),
  (v_barber4, v_shop2, 'Suresh Mishra', '+919856789012', ARRAY['Classic cuts','Shave','Kids'], 4.4, 37, true);

-- Services for Shop 2
INSERT INTO public.services (shop_id, name, category, duration_min, price, description, sort_order) VALUES
  (v_shop2, 'Classic Cut',       'hair',  20, 179, 'Clean and precise classic haircut', 1),
  (v_shop2, 'Premium Cut',       'hair',  30, 249, 'Premium cut with styling', 2),
  (v_shop2, 'Beard Trim',        'beard', 20, 129, 'Shape and trim', 3),
  (v_shop2, 'Shave',             'beard', 20, 169, 'Straight razor shave', 4),
  (v_shop2, 'Kids Cut',          'kids',  15, 129, 'Quick cut for children', 5),
  (v_shop2, 'Hair Wash',         'hair',  10,  49, 'Wash add-on', 6),
  (v_shop2, 'Hot Towel',         'beard', 10,  39, 'Hot towel add-on', 7);

UPDATE public.services SET is_addon = true WHERE shop_id = v_shop2 AND name IN ('Hair Wash','Hot Towel');

END $$;
