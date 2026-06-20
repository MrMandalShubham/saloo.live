-- ═══════════════════════════════════════════════════════════════════════════
-- Referral program + milestone rewards (built on loyalty points)
-- ═══════════════════════════════════════════════════════════════════════════

-- Referral columns (0009 only partially applied on remote — ensure they exist)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON public.users (referral_code);

-- Track whether a referred user's first-booking reward has been paid out
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_rewarded BOOLEAN NOT NULL DEFAULT false;

-- Auto-generate a referral code for every new user (existing rows were backfilled in 0009)
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(md5(NEW.id::text || now()::text || random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_referral_code ON public.users;
CREATE TRIGGER users_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- Backfill any stragglers
UPDATE public.users
  SET referral_code = upper(substr(md5(id::text || now()::text || random()::text), 1, 8))
  WHERE referral_code IS NULL;
