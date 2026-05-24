-- Phase 1: Rich Barber Profiles — portfolio, barber-services link, enhanced profile fields
-- Run against Supabase DB

-- 1. Add new columns to barbers table
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'junior'
    CHECK (experience_level IN ('junior','mid','senior','master'));

-- 2. Barber portfolio — happy customer pics, before/after shots
CREATE TABLE IF NOT EXISTS public.barber_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_before_after BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barber_portfolio_barber ON public.barber_portfolio(barber_id);

-- 3. Barber-services junction — which barber offers which services
CREATE TABLE IF NOT EXISTS public.barber_services (
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (barber_id, service_id)
);

-- 4. Grant permissions (edge functions use service_role but GRANTs still needed)
GRANT ALL ON public.barber_portfolio TO authenticated, service_role;
GRANT ALL ON public.barber_services TO authenticated, service_role;

-- 5. Storage bucket for barber portfolio images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('barber-portfolio', 'barber-portfolio', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies for barber-portfolio bucket
-- Shop owners can upload portfolio pics for their barbers
-- Path: {barber_id}/{filename}
CREATE POLICY "barber_portfolio_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'barber-portfolio'
    AND EXISTS (
      SELECT 1 FROM public.barbers b
      JOIN public.shops s ON s.id = b.shop_id
      WHERE b.id = (storage.foldername(storage.objects.name))[1]::uuid
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "barber_portfolio_public_read" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'barber-portfolio');

CREATE POLICY "barber_portfolio_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'barber-portfolio'
    AND EXISTS (
      SELECT 1 FROM public.barbers b
      JOIN public.shops s ON s.id = b.shop_id
      WHERE b.id = (storage.foldername(storage.objects.name))[1]::uuid
        AND s.owner_id = auth.uid()
    )
  );

-- 7. RLS on new tables
ALTER TABLE public.barber_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;

-- Everyone can read portfolio and barber_services
CREATE POLICY "barber_portfolio_select" ON public.barber_portfolio FOR SELECT USING (true);
CREATE POLICY "barber_services_select" ON public.barber_services FOR SELECT USING (true);

-- Shop owners can manage their barbers' portfolio/services
CREATE POLICY "barber_portfolio_manage" ON public.barber_portfolio
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers b
      JOIN public.shops s ON s.id = b.shop_id
      WHERE b.id = barber_portfolio.barber_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.barbers b
      JOIN public.shops s ON s.id = b.shop_id
      WHERE b.id = barber_portfolio.barber_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "barber_services_manage" ON public.barber_services
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers b
      JOIN public.shops s ON s.id = b.shop_id
      WHERE b.id = barber_services.barber_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.barbers b
      JOIN public.shops s ON s.id = b.shop_id
      WHERE b.id = barber_services.barber_id AND s.owner_id = auth.uid()
    )
  );
