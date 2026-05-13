-- ═══════════════════════════════════════════════════════════════════════════════
-- 0005_storage.sql — Supabase Storage buckets + RLS policies
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Public bucket: shop cover photos visible to everyone
  ('shop-photos',    'shop-photos',    true,  10485760,  -- 10 MB
   ARRAY['image/jpeg','image/png','image/webp']),

  -- Private bucket: user avatar photos (read scoped to owner)
  ('profile-photos', 'profile-photos', false, 5242880,   -- 5 MB
   ARRAY['image/jpeg','image/png','image/webp']),

  -- Public bucket: review photos
  ('review-photos',  'review-photos',  true,  5242880,   -- 5 MB
   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ─── Drop any pre-existing storage policies (idempotent) ─────────────────────
DROP POLICY IF EXISTS "shop_photos_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "shop_photos_owner_upload"   ON storage.objects;
DROP POLICY IF EXISTS "shop_photos_owner_delete"   ON storage.objects;
DROP POLICY IF EXISTS "shop_photos_admin"          ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_own_read"    ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_own_upload"  ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_own_delete"  ON storage.objects;
DROP POLICY IF EXISTS "review_photos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "review_photos_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "review_photos_own_delete"   ON storage.objects;

-- ─── shop-photos ──────────────────────────────────────────────────────────────
-- Public read. Only verified shop owners may upload to their own shop folder.
-- Expected path: shop-photos/{shop_id}/{filename}

CREATE POLICY "shop_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-photos');

CREATE POLICY "shop_photos_owner_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shop-photos'
    AND public.is_own_shop((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "shop_photos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'shop-photos'
    AND public.is_own_shop((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "shop_photos_admin"
  ON storage.objects FOR ALL
  TO authenticated
  USING  (bucket_id = 'shop-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'shop-photos' AND public.is_admin());

-- ─── profile-photos ───────────────────────────────────────────────────────────
-- Private. Each user accesses only their own folder.
-- Expected path: profile-photos/{user_id}/{filename}

CREATE POLICY "profile_photos_own_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "profile_photos_own_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "profile_photos_own_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ─── review-photos ────────────────────────────────────────────────────────────
-- Public read. Authenticated users upload to their own user folder.
-- Expected path: review-photos/{user_id}/{filename}

CREATE POLICY "review_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

CREATE POLICY "review_photos_auth_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "review_photos_own_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
