-- ═══════════════════════════════════════════════════════════════════════════
-- Hairstyle inspiration gallery (admin-curated) + barber cut-type tags + saves
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hairstyles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  image_url   TEXT        NOT NULL,
  description TEXT,
  gender      TEXT        NOT NULL DEFAULT 'men' CHECK (gender IN ('men','women','kids','unisex')),
  face_shapes TEXT[]      NOT NULL DEFAULT '{}',
  hair_types  TEXT[]      NOT NULL DEFAULT '{}',
  tags        TEXT[]      NOT NULL DEFAULT '{}',   -- cut keywords (fade, pompadour, ...)
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INT         NOT NULL DEFAULT 0,
  view_count  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hairstyles_active_idx ON public.hairstyles(is_active, sort_order);
CREATE INDEX IF NOT EXISTS hairstyles_tags_idx   ON public.hairstyles USING GIN(tags);
CREATE INDEX IF NOT EXISTS hairstyles_face_idx   ON public.hairstyles USING GIN(face_shapes);

ALTER TABLE public.hairstyles ENABLE ROW LEVEL SECURITY;
CREATE POLICY hs_public_read ON public.hairstyles FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY hs_admin_all   ON public.hairstyles FOR ALL    USING (public.is_admin());
GRANT ALL ON public.hairstyles TO authenticated, service_role;
GRANT SELECT ON public.hairstyles TO anon;

-- Barber cut-type keywords (what styles they do → matched to hairstyle tags)
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS haircut_tags TEXT[] NOT NULL DEFAULT '{}';

-- Saved / bookmarked styles
CREATE TABLE IF NOT EXISTS public.favourite_hairstyles (
  user_id      UUID        NOT NULL REFERENCES public.users(id)      ON DELETE CASCADE,
  hairstyle_id UUID        NOT NULL REFERENCES public.hairstyles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hairstyle_id)
);
ALTER TABLE public.favourite_hairstyles ENABLE ROW LEVEL SECURITY;
CREATE POLICY fav_hs_select ON public.favourite_hairstyles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY fav_hs_insert ON public.favourite_hairstyles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY fav_hs_delete ON public.favourite_hairstyles FOR DELETE USING (user_id = auth.uid());
GRANT ALL ON public.favourite_hairstyles TO authenticated, service_role;

-- Storage bucket for hairstyle photos (public read; admin write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hairstyles', 'hairstyles', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "hairstyles_storage_read"   ON storage.objects;
DROP POLICY IF EXISTS "hairstyles_storage_write"  ON storage.objects;
DROP POLICY IF EXISTS "hairstyles_storage_delete" ON storage.objects;
CREATE POLICY "hairstyles_storage_read"   ON storage.objects FOR SELECT USING (bucket_id = 'hairstyles');
CREATE POLICY "hairstyles_storage_write"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hairstyles' AND public.is_admin());
CREATE POLICY "hairstyles_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hairstyles' AND public.is_admin());
