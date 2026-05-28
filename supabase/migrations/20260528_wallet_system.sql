-- Shop Owner Wallet System
-- Hold → Release (on confirm/complete) or Cancel (on cancel/no-show/refund)

-- Wallet per shop
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,        -- available (released) balance
  hold_amount NUMERIC(10,2) NOT NULL DEFAULT 0,    -- pending confirmation
  total_released NUMERIC(10,2) NOT NULL DEFAULT 0, -- lifetime released
  total_cancelled NUMERIC(10,2) NOT NULL DEFAULT 0,-- lifetime cancelled/refunded
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);

-- Transaction ledger
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id),
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hold','release','cancel','withdrawal','adjustment')),
  description TEXT,
  balance_after NUMERIC(10,2) NOT NULL DEFAULT 0,
  hold_after NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Owner can view own wallet
CREATE POLICY wallets_owner_select ON public.wallets FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Admin can view all
CREATE POLICY wallets_admin_all ON public.wallets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Owner can view own transactions
CREATE POLICY wallet_tx_owner_select ON public.wallet_transactions FOR SELECT
  USING (wallet_id IN (
    SELECT w.id FROM public.wallets w
    JOIN public.shops s ON s.id = w.shop_id
    WHERE s.owner_id = auth.uid()
  ));

-- Admin can view all transactions
CREATE POLICY wallet_tx_admin_all ON public.wallet_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Index
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_booking_id ON public.wallet_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallets_shop_id ON public.wallets(shop_id);
