-- Group booking: link multiple bookings made together (father-son, friends, etc.)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS group_id    UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS group_label TEXT;
CREATE INDEX IF NOT EXISTS bookings_group_idx ON public.bookings (group_id) WHERE group_id IS NOT NULL;
