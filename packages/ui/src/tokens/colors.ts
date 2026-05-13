// OnO Design System — Color Tokens
// Royal Minimalist palette — Section 10.1 (updated March 2026)

export const colors = {
  // ─── Backgrounds ──────────────────────────────────────────────
  background: '#F8F5FF',       // faint royal lavender-white — primary app background
  card: '#FFFFFF',             // card surfaces

  // ─── Brand ────────────────────────────────────────────────────
  navy: '#1E0E5A',             // deep royal purple — hero elements, banners, text
  gold: '#D4AF37',             // imperial metallic gold — CTAs, loyalty, highlights

  // ─── Semantic ─────────────────────────────────────────────────
  success: '#15803D',          // confirmed status, positive actions
  successLight: '#DCFCE7',
  warning: '#854D0E',          // busy status, pending payments
  warningLight: '#FEF9C3',
  error: '#B91C1C',            // cancelled, errors
  errorLight: '#FEE2E2',

  // ─── Text ─────────────────────────────────────────────────────
  textPrimary: '#0F0826',      // near-black with deep violet undertone
  textSecondary: '#5C5380',    // purple-tinted secondary text
  textMuted: '#9890B4',        // purple-tinted muted text
  textInverse: '#FFFFFF',

  // ─── Slot status ──────────────────────────────────────────────
  slotAvailable: '#15803D',    // green
  slotPopular: '#D4AF37',      // imperial gold with star
  slotTaken: '#9890B4',        // muted strikethrough

  // ─── Borders ──────────────────────────────────────────────────
  border: '#E8E3F5',           // subtle purple-tinted border
  borderFocus: '#D4AF37',      // gold focus ring

  // ─── Loyalty tiers ────────────────────────────────────────────
  bronze: '#CD7F32',
  silver: '#9890B4',
  goldTier: '#D4AF37',
  platinum: '#E5E4F0',
} as const

export type ColorToken = keyof typeof colors
