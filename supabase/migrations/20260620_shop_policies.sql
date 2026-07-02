-- Owner-editable shop policies (free text shown on the shop profile)
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS policies TEXT;
