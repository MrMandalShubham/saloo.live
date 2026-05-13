// OnO Design System — Typography Tokens
// Fonts: Syne (headings/display) + DM Sans (body/UI)

export const fonts = {
  heading: 'Syne_700Bold',
  headingSemiBold: 'Syne_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
  '5xl': 40,
} as const

export const lineHeights = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.625,
} as const

// Google Fonts CSS names (for web)
export const webFonts = {
  heading: "'Syne', sans-serif",
  body: "'DM Sans', sans-serif",
} as const

// Tailwind font-family class names (for web)
export const tailwindFonts = {
  heading: 'font-heading',
  body: 'font-body',
} as const
