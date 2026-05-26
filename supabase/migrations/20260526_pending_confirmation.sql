-- Add 'pending_confirmation' status to bookings
-- After payment, booking goes to pending_confirmation → barber confirms → confirmed

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending_payment','pending_confirmation','confirmed','in_chair',
    'completed','cancelled','no_show','disputed','expired'
  ));

-- Add 'booking_pending' notification type for shop owners
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'booking_pending','booking_confirmed','booking_cancelled','booking_reminder',
    'booking_completed','booking_rejected','loyalty_earned','loyalty_redeemed',
    'promotion','no_show','review_request','dispute_update',
    'shop_approved','shop_rejected','shop_suspended','system'
  ));
