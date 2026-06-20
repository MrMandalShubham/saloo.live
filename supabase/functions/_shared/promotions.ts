// Shared promotion eligibility + discount logic (used by promotions-eligible and payments-verify)

const PERCENT_TYPES = ['percentage_discount', 'happy_hour']

export function computeDiscount(promo: any, total: number): number {
  let d = 0
  if (PERCENT_TYPES.includes(promo.type)) {
    d = (total * Number(promo.discount_value)) / 100
    if (promo.max_discount_amount != null) d = Math.min(d, Number(promo.max_discount_amount))
  } else {
    d = Number(promo.discount_value)
  }
  return Math.min(Math.round(d), total)
}

const inHours = (start?: string, end?: string, t?: string) => {
  if (!start || !end) return true
  const toMin = (x: string) => { const [h, m] = x.slice(0, 5).split(':').map(Number); return h * 60 + m }
  const now = t ? toMin(t) : (() => { const d = new Date(Date.now() + 5.5 * 3600 * 1000); return d.getUTCHours() * 60 + d.getUTCMinutes() })()
  return now >= toMin(start) && now <= toMin(end)
}

export function promoEligible(promo: any, opts: { total: number; serviceIds: string[]; isNew: boolean; startTime?: string }): boolean {
  const now = Date.now()
  if (!promo.is_active) return false
  if (promo.valid_from && new Date(promo.valid_from).getTime() > now) return false
  if (promo.valid_to && new Date(promo.valid_to).getTime() < now) return false
  if (promo.min_booking_amount != null && opts.total < Number(promo.min_booking_amount)) return false
  if (promo.usage_limit != null && promo.usage_count >= promo.usage_limit) return false
  if ((promo.new_customers_only || promo.type === 'new_customer') && !opts.isNew) return false
  if (promo.type === 'happy_hour' && !inHours(promo.applicable_hours_start, promo.applicable_hours_end, opts.startTime)) return false
  if (Array.isArray(promo.service_ids) && promo.service_ids.length > 0) {
    if (!opts.serviceIds.some((id) => promo.service_ids.includes(id))) return false
  }
  return true
}

export async function eligiblePromos(supabase: any, opts: {
  shopId: string; serviceIds: string[]; total: number; userId: string; startTime?: string
}) {
  const { data: promos } = await supabase
    .from('promotions').select('*').eq('shop_id', opts.shopId).eq('is_active', true)
  if (!promos || promos.length === 0) return []

  const { count: priorCount } = await supabase
    .from('bookings').select('id', { count: 'exact', head: true })
    .eq('user_id', opts.userId).eq('shop_id', opts.shopId)
    .in('status', ['completed', 'confirmed', 'in_chair'])
  const isNew = (priorCount ?? 0) === 0

  const eligible = []
  for (const p of promos) {
    if (!promoEligible(p, { total: opts.total, serviceIds: opts.serviceIds, isNew, startTime: opts.startTime })) continue
    const discount = computeDiscount(p, opts.total)
    if (discount <= 0) continue
    eligible.push({ id: p.id, title: p.title, type: p.type, discount })
  }
  eligible.sort((a, b) => b.discount - a.discount)
  return eligible
}
