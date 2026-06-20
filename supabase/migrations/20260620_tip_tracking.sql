-- Tip tracking per booking (cash tips recorded by the shop, attributed to the booking's barber)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tip_amount >= 0);
