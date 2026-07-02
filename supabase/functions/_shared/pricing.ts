// Resolve effective service prices for a booking, honoring per-barber overrides.
// A barber_services.price override (when set) replaces the shop's default service price.
// Duration is always shop-level (services.duration_min).

export type PriceInfo = { price: number; duration_min: number; is_addon: boolean }

export async function effectivePrices(
  supabase: any,
  barberId: string | null | undefined,
  serviceIds: string[],
): Promise<Map<string, PriceInfo>> {
  const ids = [...new Set(serviceIds)].filter(Boolean)
  const map = new Map<string, PriceInfo>()
  if (ids.length === 0) return map

  const { data: svcs } = await supabase
    .from('services')
    .select('id, price, duration_min, is_addon')
    .in('id', ids)
  for (const s of svcs ?? []) {
    map.set(s.id, { price: Number(s.price), duration_min: s.duration_min, is_addon: s.is_addon })
  }

  if (barberId) {
    const { data: overrides } = await supabase
      .from('barber_services')
      .select('service_id, price')
      .eq('barber_id', barberId)
      .in('service_id', ids)
    for (const o of overrides ?? []) {
      if (o.price != null && map.has(o.service_id)) {
        map.get(o.service_id)!.price = Number(o.price)
      }
    }
  }
  return map
}
