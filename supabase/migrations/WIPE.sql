-- ════════════════════════════════════════════════════════════════════════════
-- OnO — WIPE SCRIPT
-- Run this FIRST in Supabase SQL Editor to drop everything cleanly.
-- ════════════════════════════════════════════════════════════════════════════

-- Drop auth trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all public table triggers
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

-- Drop all tables (child → parent to respect FK order)
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

-- Drop sequence
DROP SEQUENCE IF EXISTS public.booking_ref_seq;

-- Drop all functions
DROP FUNCTION IF EXISTS public.set_updated_at()                                                                CASCADE;
DROP FUNCTION IF EXISTS public.update_loyalty_tier()                                                           CASCADE;
DROP FUNCTION IF EXISTS public.generate_booking_ref()                                                          CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()                                                               CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role()                                                                 CASCADE;
DROP FUNCTION IF EXISTS public.is_admin()                                                                      CASCADE;
DROP FUNCTION IF EXISTS public.is_own_shop(UUID)                                                               CASCADE;
DROP FUNCTION IF EXISTS public.get_owner_shop_id()                                                             CASCADE;
DROP FUNCTION IF EXISTS public.get_role_by_email(TEXT)                                                         CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_profile()                                                           CASCADE;
DROP FUNCTION IF EXISTS public.request_shop_owner()                                                            CASCADE;
DROP FUNCTION IF EXISTS public.promote_to_admin(TEXT)                                                          CASCADE;
DROP FUNCTION IF EXISTS public.update_shop_rating()                                                            CASCADE;
DROP FUNCTION IF EXISTS public.shops_nearby(FLOAT,FLOAT,FLOAT,BOOLEAN,FLOAT,FLOAT,TEXT[],TEXT,INT,INT)        CASCADE;

-- Drop storage policies
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

-- Drop cron jobs (ignore errors if pg_cron not enabled)
DO $$ BEGIN
  PERFORM cron.unschedule('expire-slot-holds');
  PERFORM cron.unschedule('expire-pending-payments');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT 'WIPE COMPLETE — now run BUILD.sql' AS status;
