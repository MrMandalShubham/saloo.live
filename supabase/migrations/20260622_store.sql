-- ═══════════════════════════════════════════════════════════════════════════
-- STORE — shop retail on commission (additive; does not touch booking/payments)
-- Customer buys a shop's products online → shop wallet credited (minus LooksOn
-- commission) as a hold → released on fulfillment.
-- ═══════════════════════════════════════════════════════════════════════════

-- Shop store settings
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS store_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS store_commission_rate INT NOT NULL DEFAULT 10 CHECK (store_commission_rate BETWEEN 0 AND 100);

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_products (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url   TEXT,
  category    TEXT,
  stock       INT         NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_products_shop_idx ON public.store_products(shop_id, is_active);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_products_public_read ON public.store_products FOR SELECT
  USING (is_active OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
CREATE POLICY store_products_owner_all ON public.store_products FOR ALL
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
GRANT ALL ON public.store_products TO authenticated, service_role;
GRANT SELECT ON public.store_products TO anon;

-- ─── ORDER REFERENCE ─────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS store_order_ref_seq START 1;
CREATE OR REPLACE FUNCTION public.gen_store_order_ref()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'ORD-' || LPAD(nextval('store_order_ref_seq')::TEXT, 6, '0');
END;
$$;

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_orders (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref          TEXT          UNIQUE NOT NULL DEFAULT public.gen_store_order_ref(),
  user_id            UUID          NOT NULL REFERENCES public.users(id),
  shop_id            UUID          NOT NULL REFERENCES public.shops(id),
  status             TEXT          NOT NULL DEFAULT 'pending_payment'
                                     CHECK (status IN ('pending_payment','paid','ready','completed','cancelled','refunded')),
  subtotal           NUMERIC(10,2) NOT NULL,
  commission_rate    INT           NOT NULL DEFAULT 10,
  commission_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  shop_net           NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount       NUMERIC(10,2) NOT NULL,
  fulfillment        TEXT          NOT NULL DEFAULT 'pickup' CHECK (fulfillment IN ('pickup','delivery')),
  customer_note      TEXT,
  razorpay_order_id  TEXT,
  razorpay_payment_id TEXT,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_orders_user_idx ON public.store_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS store_orders_shop_idx ON public.store_orders(shop_id, created_at DESC);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_orders_select ON public.store_orders FOR SELECT
  USING (user_id = auth.uid() OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
GRANT ALL ON public.store_orders TO authenticated, service_role;

-- ─── ORDER ITEMS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_order_items (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID          NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id UUID          REFERENCES public.store_products(id),
  name       TEXT          NOT NULL,
  price      NUMERIC(10,2) NOT NULL,
  quantity   INT           NOT NULL CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS store_order_items_order_idx ON public.store_order_items(order_id);

ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_order_items_select ON public.store_order_items FOR SELECT
  USING (order_id IN (SELECT id FROM public.store_orders WHERE user_id = auth.uid()
                       OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())));
GRANT ALL ON public.store_order_items TO authenticated, service_role;

-- Link wallet movements to store orders (products, not bookings)
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS store_order_id UUID REFERENCES public.store_orders(id);

-- Storage bucket for product photos (public read; shop owners write to their folder)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('store-products', 'store-products', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "store_products_img_read"   ON storage.objects;
DROP POLICY IF EXISTS "store_products_img_write"  ON storage.objects;
DROP POLICY IF EXISTS "store_products_img_delete" ON storage.objects;
CREATE POLICY "store_products_img_read"   ON storage.objects FOR SELECT USING (bucket_id = 'store-products');
CREATE POLICY "store_products_img_write"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-products' AND public.is_own_shop((storage.foldername(name))[1]::UUID));
CREATE POLICY "store_products_img_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store-products' AND public.is_own_shop((storage.foldername(name))[1]::UUID));
