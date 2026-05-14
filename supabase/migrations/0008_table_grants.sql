-- ═══════════════════════════════════════════════════════════════════════════════
-- 0008_table_grants.sql — Grant table-level permissions to authenticated & anon
-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS policies existed but the base GRANT was missing, causing
-- "permission denied for table users" errors on client-side updates.
-- RLS still enforces row-level access — these just unlock the table-level gate.

-- ─── USERS ──────────────────────────────────────────────────────────────────
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- ─── SHOPS (public read, owner write handled by RLS) ────────────────────────
GRANT SELECT ON public.shops TO anon, authenticated;
GRANT INSERT, UPDATE ON public.shops TO authenticated;

-- ─── SHOP_HOURS / SHOP_BREAKS ───────────────────────────────────────────────
GRANT SELECT ON public.shop_hours TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_hours TO authenticated;

GRANT SELECT ON public.shop_breaks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_breaks TO authenticated;

-- ─── BARBERS ────────────────────────────────────────────────────────────────
GRANT SELECT ON public.barbers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.barbers TO authenticated;

-- ─── BARBER_HOURS ───────────────────────────────────────────────────────────
GRANT SELECT ON public.barber_hours TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.barber_hours TO authenticated;

-- ─── SERVICES ───────────────────────────────────────────────────────────────
GRANT SELECT ON public.services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;

-- ─── BOOKINGS ───────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;

-- ─── SLOT_HOLDS ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slot_holds TO authenticated;

-- ─── REVIEWS ────────────────────────────────────────────────────────────────
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

-- ─── FAVOURITES ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON public.favourites TO authenticated;

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- ─── PROMOTIONS ─────────────────────────────────────────────────────────────
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;

-- ─── LOYALTY_TRANSACTIONS ───────────────────────────────────────────────────
GRANT SELECT ON public.loyalty_transactions TO authenticated;

-- ─── DISPUTES ───────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
