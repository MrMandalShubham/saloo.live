// Controlled vocabularies shared by the admin uploader, customer filters, and barber tagging.
// Keep these exact strings consistent — they are stored in and matched against the DB arrays.

export const FACE_SHAPES = ['Oval', 'Round', 'Square', 'Oblong', 'Heart', 'Diamond'] as const

export const HAIR_TYPES = ['Straight', 'Wavy', 'Curly', 'Coily'] as const

export const CUT_KEYWORDS = [
  'Fade', 'Skin Fade', 'Taper', 'Undercut', 'Pompadour', 'Quiff', 'Crew Cut', 'Buzz Cut',
  'Crop', 'Side Part', 'Slick Back', 'Mohawk', 'Curtains', 'Caesar', 'Afro', 'Comb Over',
  'Mullet', 'Spiky', 'Man Bun', 'Cornrows',
] as const

export const GENDERS = [
  { key: 'men', label: 'Men' },
  { key: 'women', label: 'Women' },
  { key: 'kids', label: 'Kids' },
  { key: 'unisex', label: 'Unisex' },
] as const
