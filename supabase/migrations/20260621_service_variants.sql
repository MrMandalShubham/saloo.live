-- Service variants: a variant is a child service of a parent (e.g. Hair Color → Roots / Full)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS parent_service_id UUID REFERENCES public.services(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS services_parent_idx ON public.services(parent_service_id) WHERE parent_service_id IS NOT NULL;
