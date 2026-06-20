-- Apply shop promotions at checkout: record which promo + discount on the booking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);
