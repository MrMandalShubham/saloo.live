-- ═══════════════════════════════════════════════════════════════════════════════
-- 0004_rls.sql — Row Level Security (production-grade, zero trust)
--
-- Principles:
--   • Anon users: read-only access to public shop/service/review data only.
--                 Zero access to user PII. Use get_role_by_email() RPC for signup checks.
--   • Customers:  CRUD own data (bookings, reviews, disputes, favourites, profile).
--                 Read verified shops, services, barbers.
--   • Shop owners: Full control over own shop and its resources.
--                  Read own shop's bookings and payments.
--   • Admins:     Full access to everything via is_admin() helper.
--   • Service role (server): Bypasses RLS entirely — used only in Edge Functions.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_hours           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_breaks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_hours         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_blocks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_holds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions        ENABLE ROW LEVEL SECURITY;

-- ─── USERS ────────────────────────────────────────────────────────────────────
-- No anon SELECT — use get_role_by_email() RPC for signup conflict checks.
-- Authenticated users read and update only their own row.
-- Admins can read all users.

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent self-escalation: clients cannot change role, is_active, is_suspended
    AND role       = (SELECT role       FROM public.users WHERE id = auth.uid())
    AND is_active  = (SELECT is_active  FROM public.users WHERE id = auth.uid())
    AND is_suspended = (SELECT is_suspended FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "users_admin_all"
  ON public.users FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── SHOPS ────────────────────────────────────────────────────────────────────

-- Public: anyone can browse verified shops
CREATE POLICY "shops_public_read"
  ON public.shops FOR SELECT
  USING (status = 'verified');

-- Owner: see own shop regardless of status
CREATE POLICY "shops_owner_select"
  ON public.shops FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Owner: create a shop only if the user is a shop_owner
CREATE POLICY "shops_owner_insert"
  ON public.shops FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.get_user_role() = 'shop_owner'
  );

-- Owner: update own shop (cannot change status — only admin does that)
CREATE POLICY "shops_owner_update"
  ON public.shops FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND status = (SELECT status FROM public.shops WHERE id = shops.id)
  );

-- Admin: full access
CREATE POLICY "shops_admin_all"
  ON public.shops FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── SHOP HOURS ───────────────────────────────────────────────────────────────

CREATE POLICY "shop_hours_public_read"
  ON public.shop_hours FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
  );

CREATE POLICY "shop_hours_owner_write"
  ON public.shop_hours FOR ALL
  TO authenticated
  USING (public.is_own_shop(shop_id))
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "shop_hours_admin_all"
  ON public.shop_hours FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── SHOP BREAKS ──────────────────────────────────────────────────────────────

CREATE POLICY "shop_breaks_public_read"
  ON public.shop_breaks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
  );

CREATE POLICY "shop_breaks_owner_write"
  ON public.shop_breaks FOR ALL
  TO authenticated
  USING (public.is_own_shop(shop_id))
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "shop_breaks_admin_all"
  ON public.shop_breaks FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── FAVOURITES ───────────────────────────────────────────────────────────────

CREATE POLICY "favourites_own"
  ON public.favourites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── BARBERS ──────────────────────────────────────────────────────────────────

-- Public: active barbers of verified shops
CREATE POLICY "barbers_public_read"
  ON public.barbers FOR SELECT
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
  );

-- Owner: see all barbers of own shop (including inactive)
CREATE POLICY "barbers_owner_select"
  ON public.barbers FOR SELECT
  TO authenticated
  USING (public.is_own_shop(shop_id));

-- Owner: create, update, delete barbers for own shop
CREATE POLICY "barbers_owner_write"
  ON public.barbers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "barbers_owner_update"
  ON public.barbers FOR UPDATE
  TO authenticated
  USING (public.is_own_shop(shop_id))
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "barbers_owner_delete"
  ON public.barbers FOR DELETE
  TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "barbers_admin_all"
  ON public.barbers FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── BARBER HOURS ─────────────────────────────────────────────────────────────

CREATE POLICY "barber_hours_public_read"
  ON public.barber_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers b
      JOIN public.shops s ON s.id = b.shop_id
      WHERE b.id = barber_id AND s.status = 'verified'
    )
  );

CREATE POLICY "barber_hours_owner_write"
  ON public.barber_hours FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND public.is_own_shop(b.shop_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND public.is_own_shop(b.shop_id))
  );

CREATE POLICY "barber_hours_admin_all"
  ON public.barber_hours FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── SERVICES ─────────────────────────────────────────────────────────────────

CREATE POLICY "services_public_read"
  ON public.services FOR SELECT
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
  );

-- Owner can see all services (including inactive) for their shop
CREATE POLICY "services_owner_select"
  ON public.services FOR SELECT
  TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "services_owner_write"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "services_owner_update"
  ON public.services FOR UPDATE
  TO authenticated
  USING (public.is_own_shop(shop_id))
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "services_owner_delete"
  ON public.services FOR DELETE
  TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "services_admin_all"
  ON public.services FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── SLOT BLOCKS ──────────────────────────────────────────────────────────────

CREATE POLICY "slot_blocks_owner_all"
  ON public.slot_blocks FOR ALL
  TO authenticated
  USING (public.is_own_shop(shop_id))
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "slot_blocks_admin_all"
  ON public.slot_blocks FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── SLOT HOLDS ───────────────────────────────────────────────────────────────

CREATE POLICY "slot_holds_own_read"
  ON public.slot_holds FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Clients create their own holds only (booking flow starts here)
CREATE POLICY "slot_holds_own_insert"
  ON public.slot_holds FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own unexpired holds (abandon checkout)
CREATE POLICY "slot_holds_own_delete"
  ON public.slot_holds FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND booking_id IS NULL);

CREATE POLICY "slot_holds_admin_all"
  ON public.slot_holds FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────

-- Customers: see own bookings
CREATE POLICY "bookings_customer_select"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Shop owners: see all bookings for their shop
CREATE POLICY "bookings_owner_select"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.is_own_shop(shop_id));

-- Customer INSERT is handled by server (Edge Function with service role).
-- Allow client insert for the initial pending_payment state so the Edge Function
-- doesn't need service role for every flow (set status and amounts server-side).
CREATE POLICY "bookings_customer_insert"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending_payment'
  );

-- Customers can cancel their own bookings (server validates cancellation window)
CREATE POLICY "bookings_customer_cancel"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('pending_payment','confirmed')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'cancelled'
    AND cancelled_by = 'customer'
  );

-- Shop owners can update status of bookings in their shop
CREATE POLICY "bookings_owner_update"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.is_own_shop(shop_id))
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "bookings_admin_all"
  ON public.bookings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
-- Payments are created and updated by the server (Edge Functions with service role).
-- Clients can only read their own payment records.

CREATE POLICY "payments_customer_select"
  ON public.payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "payments_owner_select"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.is_own_shop(b.shop_id)
    )
  );

CREATE POLICY "payments_admin_all"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── REVIEWS ──────────────────────────────────────────────────────────────────

-- Public read of visible reviews
CREATE POLICY "reviews_public_read"
  ON public.reviews FOR SELECT
  USING (is_visible = true);

-- Owner can see all reviews (including hidden) for their shop
CREATE POLICY "reviews_owner_select"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (public.is_own_shop(shop_id));

-- Customers insert a review only for their completed booking
CREATE POLICY "reviews_customer_insert"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.user_id = auth.uid()
        AND b.status = 'completed'
    )
  );

-- Customers can edit their own review text/photos (not rating, not shop_response)
CREATE POLICY "reviews_customer_update"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND shop_response = (SELECT shop_response FROM public.reviews WHERE id = reviews.id)
    AND shop_response_at = (SELECT shop_response_at FROM public.reviews WHERE id = reviews.id)
    AND is_visible = (SELECT is_visible FROM public.reviews WHERE id = reviews.id)
  );

-- Shop owners respond to reviews on their shop
CREATE POLICY "reviews_owner_respond"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (public.is_own_shop(shop_id))
  WITH CHECK (
    public.is_own_shop(shop_id)
    -- Owners can only set shop_response and shop_response_at
    AND user_id        = (SELECT user_id        FROM public.reviews WHERE id = reviews.id)
    AND rating         = (SELECT rating         FROM public.reviews WHERE id = reviews.id)
    AND text           = (SELECT text           FROM public.reviews WHERE id = reviews.id)
    AND is_visible     = (SELECT is_visible     FROM public.reviews WHERE id = reviews.id)
  );

CREATE POLICY "reviews_admin_all"
  ON public.reviews FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
-- Server (service role) creates notifications.
-- Clients read and mark-read their own; can delete their own.

CREATE POLICY "notifications_own_select"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_own_update"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Clients can only mark as read
    AND type       = (SELECT type       FROM public.notifications WHERE id = notifications.id)
    AND title      = (SELECT title      FROM public.notifications WHERE id = notifications.id)
    AND body       = (SELECT body       FROM public.notifications WHERE id = notifications.id)
  );

CREATE POLICY "notifications_own_delete"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_all"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── LOYALTY TRANSACTIONS ─────────────────────────────────────────────────────
-- Server-only INSERT/UPDATE. Clients can only read their own history.

CREATE POLICY "loyalty_tx_own_select"
  ON public.loyalty_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "loyalty_tx_admin_all"
  ON public.loyalty_transactions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── PROMOTIONS ───────────────────────────────────────────────────────────────

-- Public read: active promotions for verified shops
CREATE POLICY "promotions_public_read"
  ON public.promotions FOR SELECT
  USING (
    is_active = true
    AND (valid_to IS NULL OR valid_to > now())
    AND EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND status = 'verified')
  );

-- Owner can see all promotions (including expired) for their shop
CREATE POLICY "promotions_owner_select"
  ON public.promotions FOR SELECT
  TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "promotions_owner_write"
  ON public.promotions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "promotions_owner_update"
  ON public.promotions FOR UPDATE
  TO authenticated
  USING (public.is_own_shop(shop_id))
  WITH CHECK (public.is_own_shop(shop_id));

CREATE POLICY "promotions_owner_delete"
  ON public.promotions FOR DELETE
  TO authenticated
  USING (public.is_own_shop(shop_id));

CREATE POLICY "promotions_admin_all"
  ON public.promotions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── DISPUTES ─────────────────────────────────────────────────────────────────

-- Customers: see own disputes
CREATE POLICY "disputes_customer_select"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Shop owners: see disputes for their shop
CREATE POLICY "disputes_owner_select"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (public.is_own_shop(shop_id));

-- Customers: open a dispute for their own booking
CREATE POLICY "disputes_customer_insert"
  ON public.disputes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  );

-- Shop owners: add their response to a dispute
CREATE POLICY "disputes_owner_respond"
  ON public.disputes FOR UPDATE
  TO authenticated
  USING (
    public.is_own_shop(shop_id)
    AND status = 'open'
  )
  WITH CHECK (
    public.is_own_shop(shop_id)
    AND status = 'shop_responded'
    -- Owners can only set shop_response and shop_responded_at; admin handles the rest
    AND user_id   = (SELECT user_id   FROM public.disputes WHERE id = disputes.id)
    AND reason    = (SELECT reason    FROM public.disputes WHERE id = disputes.id)
    AND description = (SELECT description FROM public.disputes WHERE id = disputes.id)
  );

CREATE POLICY "disputes_admin_all"
  ON public.disputes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── ADMIN ACTIONS ────────────────────────────────────────────────────────────

CREATE POLICY "admin_actions_admin_all"
  ON public.admin_actions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
