import type { Config } from 'tailwindcss'

/*
 * Saloo — 9-Color Design System (FINAL)
 * ──────────────────────────────────────
 * Core 6 from palette:
 *   1. saloo-pink    #FF005F   — hot pink, primary CTA
 *   2. saloo-teal    #00C2AE   — teal, links, success
 *   3. saloo-gold    #B2AC11   — olive gold, badges, stars
 *   4. saloo-coral   #FFAFA8   — soft coral, tags, light fills
 *   5. saloo-mint    #B0EBD2   — mint, soft backgrounds
 *   6. saloo-khaki   #C5BE77   — khaki, muted accents, borders
 * Foundation 3:
 *   7. saloo-dark    #1A1A2E   — ink, dark backgrounds
 *   8. saloo-cream   #FFF8F0   — page background
 *   9. saloo-white   #FFFFFF   — cards, surfaces
 */

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ── Core 9 ─────────────────────────────────────────
        'saloo-pink':   '#FF005F',
        'saloo-teal':   '#00C2AE',
        'saloo-gold':   '#B2AC11',
        'saloo-coral':  '#FFAFA8',
        'saloo-mint':   '#B0EBD2',
        'saloo-khaki':  '#C5BE77',
        'saloo-dark':   '#1A1A2E',
        'saloo-cream':  '#FFF8F0',
        'saloo-white':  '#FFFFFF',
        'saloo-creamy': '#F4F4F0',
        'saloo-orange': '#FF7E40',
        'saloo-admin':  '#0E2930',

        // ── Semantic aliases ──────────────────────────────
        background: '#FFF8F0',
        primary:    '#FF005F',
        secondary:  '#00C2AE',
        ink:        '#1A1A2E',
        muted:      '#C5BE77',
        border:     '#B0EBD2',
        success:    '#00C2AE',
        error:      '#FF005F',

        // ── Landing page (luxe aliases) ───────────────────
        'luxe-dark':      '#1A1A2E',
        'luxe-espresso':  '#1A1A2E',
        'luxe-accent':    '#FF005F',
        'luxe-burgundy':  '#FF005F',
        'luxe-taupe':     '#C5BE77',
        'luxe-stone':     '#C5BE77',
        'luxe-gray':      '#B0EBD2',
        'luxe-ivory':     '#FFF8F0',
        'luxe-cream':     '#FFF8F0',
        'luxe-charcoal':  '#1A1A2E',
        'luxe-midnight':  '#1A1A2E',
        'luxe-amber':     '#B2AC11',
        'luxe-rose':      '#FF005F',
        'luxe-sage':      '#00C2AE',
        'luxe-blue':      '#00C2AE',
        'luxe-teal':      '#00C2AE',
        'luxe-violet':    '#FF005F',

        // ── Customer app (royal theme) ────────────────────
        navy:      { DEFAULT: '#1A1A2E', mid: '#2A2F52' },
        gold:      { DEFAULT: '#B2AC11', light: '#C5BE77' },
        lavender:  '#B0EBD2',
        champagne: '#FFF8F0',
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        syne: ['var(--font-syne)', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.5rem',
        pill: '9999px',
        xl2: '2rem',
        blob: '40% 60% 70% 30% / 40% 50% 60% 50%',
      },
      backgroundImage: {
        'luxe-gradient':      'linear-gradient(180deg, #FFF8F0 0%, #B0EBD2 100%)',
        'luxe-hero':          'linear-gradient(160deg, #1A1A2E 0%, #1A1A2E 100%)',
        'luxe-warm':          'linear-gradient(135deg, #FFF8F0 0%, #FFAFA8 100%)',
        'luxe-dark-gradient': 'linear-gradient(160deg, #1A1A2E 0%, #1A1A2E 100%)',
        'royal-gradient':     'linear-gradient(135deg, #1A1A2E 0%, #2A2F52 100%)',
        'glass-gradient':     'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'glass-dark':         'linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(26,26,46,0.4) 100%)',
        'owner-gradient':     'linear-gradient(135deg, #D5D5D0 0%, #B5B5B0 100%)',
      },
      boxShadow: {
        luxe:       '0 4px 30px rgba(255, 0, 95, 0.06)',
        'luxe-lg':  '0 8px 60px rgba(255, 0, 95, 0.10)',
        royal:      '0 4px 20px rgba(26, 26, 46, 0.12)',
        'royal-lg': '0 8px 40px rgba(26, 26, 46, 0.18)',
        glass:      '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-lg': '0 12px 40px 0 rgba(31, 38, 135, 0.15)',
        'glass-orange': '0 8px 32px 0 rgba(255, 126, 64, 0.15)',
        gold:       '0 4px 20px rgba(178, 172, 17, 0.25)',
        glow:       '0 0 20px rgba(0, 194, 174, 0.5)',
        'glow-pink':'0 0 20px rgba(255, 0, 95, 0.5)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        shimmer: 'shimmer 2s infinite',
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        blob: 'blob 7s infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.35s ease-out forwards',
        'shrink-width': 'shrinkWidth 5s linear forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shrinkWidth: {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
      },
    },
  },
  plugins: [],
}

export default config
