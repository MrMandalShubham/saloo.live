-- Payout settings on shops
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_method TEXT CHECK (payout_method IN ('upi', 'bank', 'phone')) DEFAULT NULL;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_upi_id TEXT DEFAULT NULL;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_bank_account TEXT DEFAULT NULL;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_bank_ifsc TEXT DEFAULT NULL;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_bank_name TEXT DEFAULT NULL;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_phone TEXT DEFAULT NULL;

-- Track total withdrawn in wallet
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('upi', 'bank', 'phone')),
  payout_details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY wr_owner_select ON public.withdrawal_requests FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY wr_admin_all ON public.withdrawal_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
