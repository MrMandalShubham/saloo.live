-- ═══════════════════════════════════════════════════════════════════════════════
-- 0010_backend_fixes.sql — Fix missing functions, grants, and column names
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. increment_no_show_count RPC (used by owner-bookings-update) ─────────
CREATE OR REPLACE FUNCTION public.increment_no_show_count(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users
  SET no_show_count = no_show_count + 1
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_no_show_count TO service_role;

-- ─── 2. Missing table grants ────────────────────────────────────────────────

-- slot_blocks — needed for availability queries
GRANT SELECT ON public.slot_blocks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.slot_blocks TO authenticated;

-- notifications — DELETE grant (RLS policy exists but table grant was missing)
GRANT DELETE ON public.notifications TO authenticated;

-- payments — read-only for authenticated (inserts via service_role only)
GRANT SELECT ON public.payments TO authenticated;
