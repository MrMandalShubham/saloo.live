// Segment-aware service categories. Keys must match the services.category DB constraint.

export const CATEGORY_LABELS: Record<string, string> = {
  hair: 'Hair', beard: 'Beard', skin: 'Skin', combo: 'Combo', kids: 'Kids', other: 'Other',
  facial: 'Facial', waxing: 'Waxing', threading: 'Threading', hair_spa: 'Hair Spa',
  coloring: 'Coloring', bridal: 'Bridal', nails: 'Nails', makeup: 'Makeup', mehndi: 'Mehndi', massage: 'Massage',
}

const MEN = ['hair', 'beard', 'skin', 'combo', 'kids', 'other']
const WOMEN = ['hair', 'facial', 'waxing', 'threading', 'hair_spa', 'coloring', 'bridal', 'nails', 'makeup', 'mehndi', 'combo', 'other']
const UNISEX = [...new Set([...MEN, ...WOMEN])]

export function categoriesForSegment(segment?: string): { key: string; label: string }[] {
  const keys = segment === 'women' ? WOMEN : segment === 'unisex' ? UNISEX : MEN
  return keys.map(k => ({ key: k, label: CATEGORY_LABELS[k] ?? k }))
}

export const categoryLabel = (key: string) => CATEGORY_LABELS[key] ?? key
