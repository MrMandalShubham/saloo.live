-- ═══════════════════════════════════════════════════════════════════════════
-- Repurpose the store for B2B: LooksOn sells supplies to SHOP OWNERS.
-- Products become an admin-managed platform catalog; shops are the buyers;
-- admin fulfils; LooksOn keeps the full payment (margin = price - cost).
-- (store_* tables have no real data yet, so this is a clean repurpose.)
-- ═══════════════════════════════════════════════════════════════════════════

-- Products are now platform-level (admin catalog). shop_id no longer required.
ALTER TABLE public.store_products ALTER COLUMN shop_id DROP NOT NULL;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2); -- what LooksOn paid the supplier (margin tracking)

-- Orders gain shipping statuses + a payment method
ALTER TABLE public.store_orders DROP CONSTRAINT IF EXISTS store_orders_status_check;
ALTER TABLE public.store_orders ADD CONSTRAINT store_orders_status_check
  CHECK (status IN ('pending_payment','paid','shipped','delivered','cancelled','refunded'));
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'razorpay'
  CHECK (payment_method IN ('razorpay','wallet'));

-- Wallet: shop can spend earned balance on supplies ('purchase')
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('hold','release','cancel','withdrawal','adjustment','purchase'));

-- RLS: active platform products readable by authenticated buyers; admin manages
DROP POLICY IF EXISTS store_products_public_read ON public.store_products;
DROP POLICY IF EXISTS store_products_owner_all   ON public.store_products;
CREATE POLICY store_products_read      ON public.store_products FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY store_products_admin_all ON public.store_products FOR ALL    USING (public.is_admin());
