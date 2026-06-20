-- ═══════════════════════════════════════════════════════════════════════════
-- Personalization: haircut memory profile + saved cut photos
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── GROOMING PROFILE (one per customer) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grooming_profiles (
  user_id      UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  fade_level   TEXT,   -- none / low / mid / high / skin
  beard_style  TEXT,   -- clean / stubble / short / medium / long / goatee
  guard_number TEXT,   -- sides clipper guard, e.g. "2", "3", "scissor"
  neckline     TEXT,   -- rounded / squared / tapered
  top_length   TEXT,   -- short / medium / long / textured ...
  talk_level   TEXT,   -- silent / casual / consult
  style_notes  TEXT,
  allergy_notes TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grooming_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY grooming_select ON public.grooming_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY grooming_insert ON public.grooming_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY grooming_update ON public.grooming_profiles FOR UPDATE USING (user_id = auth.uid());
GRANT ALL ON public.grooming_profiles TO authenticated, service_role;

-- ─── SAVED CUT PHOTOS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cut_photos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  image_url  TEXT        NOT NULL,
  caption    TEXT,
  booking_id UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cut_photos_user_idx ON public.cut_photos (user_id, created_at DESC);

ALTER TABLE public.cut_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY cut_photos_select ON public.cut_photos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY cut_photos_insert ON public.cut_photos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY cut_photos_delete ON public.cut_photos FOR DELETE USING (user_id = auth.uid());
GRANT ALL ON public.cut_photos TO authenticated, service_role;

-- ─── STORAGE: cut-photos bucket (public read; upload/delete scoped to own folder) ─
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cut-photos', 'cut-photos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cut_photos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "cut_photos_own_upload"   ON storage.objects;
DROP POLICY IF EXISTS "cut_photos_own_delete"   ON storage.objects;

-- Expected path: cut-photos/{user_id}/{filename}
CREATE POLICY "cut_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cut-photos');

CREATE POLICY "cut_photos_own_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cut-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "cut_photos_own_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cut-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
