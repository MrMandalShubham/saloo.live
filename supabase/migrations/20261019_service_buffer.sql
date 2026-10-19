-- Per-service buffer / cleanup time (minutes) reserved after a booking of this
-- service before the next slot can start. Previously buffer was shop-wide only
-- (shops.slot_buffer_min); this lets e.g. a facial reserve more reset time than
-- a quick trim. Existing rows default to 10 (matches the old shop default).
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS buffer_time_minutes INTEGER NOT NULL DEFAULT 10
  CHECK (buffer_time_minutes >= 0 AND buffer_time_minutes <= 120);
