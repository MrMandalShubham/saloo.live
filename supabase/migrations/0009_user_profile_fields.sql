-- ═══════════════════════════════════════════════════════════════════════════════
-- 0009_user_profile_fields.sql — Additional profile fields for users
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS date_of_birth    DATE,
  ADD COLUMN IF NOT EXISTS gender           TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS city             TEXT,
  ADD COLUMN IF NOT EXISTS pincode          TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'pa')),
  ADD COLUMN IF NOT EXISTS referral_code    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by      UUID REFERENCES public.users(id);

-- Generate unique referral codes for existing users who don't have one
UPDATE public.users
  SET referral_code = upper(substr(md5(id::text || now()::text), 1, 8))
  WHERE referral_code IS NULL;

-- Index for referral lookups
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON public.users (referral_code);
CREATE INDEX IF NOT EXISTS users_city_idx ON public.users (lower(city)) WHERE city IS NOT NULL;
