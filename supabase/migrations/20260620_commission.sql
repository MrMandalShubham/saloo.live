-- Per-barber commission rate (% of service revenue the barber earns)
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS commission_rate INT NOT NULL DEFAULT 40 CHECK (commission_rate BETWEEN 0 AND 100);
