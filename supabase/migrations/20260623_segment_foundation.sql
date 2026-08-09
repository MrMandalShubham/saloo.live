-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 0 — Men/Women segmentation foundation (additive; everything → men)
-- Adds a "segment" to users (audience) and shops (who they serve), and expands
-- service categories for women's salon services. No UI/behaviour change yet.
-- ═══════════════════════════════════════════════════════════════════════════

-- Which section a customer belongs to (chosen at signup, locked). Existing → men.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS segment TEXT NOT NULL DEFAULT 'men'
  CHECK (segment IN ('men','women'));

-- Who a shop serves. Existing barbershops → men.
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS segment TEXT NOT NULL DEFAULT 'men'
  CHECK (segment IN ('men','women','unisex'));

CREATE INDEX IF NOT EXISTS shops_segment_status_idx ON public.shops (segment, status);

-- Expand service categories to cover women's salon services (kept men's categories)
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_category_check;
ALTER TABLE public.services ADD CONSTRAINT services_category_check
  CHECK (category IN (
    'hair','beard','skin','combo','kids','other',
    'facial','waxing','threading','hair_spa','coloring','bridal','nails','makeup','mehndi','massage'
  ));
