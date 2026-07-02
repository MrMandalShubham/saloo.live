-- Per-barber price override for a service (NULL = use the shop's default service price)
ALTER TABLE public.barber_services ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) CHECK (price IS NULL OR price >= 0);
