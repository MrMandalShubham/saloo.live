-- Dual completion: both owner and customer must confirm service is done
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS owner_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_completed BOOLEAN NOT NULL DEFAULT false;
