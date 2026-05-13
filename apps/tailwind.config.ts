import type { Config } from 'tailwindcss'

/*
 * Saloo — 9-Color Luxury Design System (Rose Gold)
 * ─────────────────────────────────────────────────
 * 1. saloo-dark    #0D0D0D   — rich black, dark backgrounds
 * 2. saloo-rose    #B76E79   — rose gold primary, CTAs, links
 * 3. saloo-burg    #7A2E3F   — deep wine accent
 * 4. saloo-blush   #D4A0A0   — light rose gold, badges, stars
 * 5. saloo-taupe   #C8B8A9   — warm taupe, soft accent
 * 6. saloo-stone   #E8E0D4   — light stone, fills, borders
 * 7. saloo-espresso #6B5B4E  — muted brown, secondary text
 * 8. saloo-ivory   #FAF7F2   — page background
 * 9. saloo-white   #FFFFFF   — cards, surfaces
 */

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ── Core 9 ─────────────────────────────────────────
        'saloo-dark':     '#0D0D0D',
        'saloo-rose':     '#B76E79',
        'saloo-burg':     '#7A2E3F',
        'saloo-blush':    '#D4A0A0',
        'saloo-taupe':    '#C8B8A9',
        'saloo-stone':    '#E8E0D4',
        'saloo-espresso': '#6B5B4E',
        'saloo-ivory':    '#FAF7F2',
        'saloo-white':    '#FFFFFF',

        // ── Semantic aliases ──────────────────────────────
        background: '#FAF7F2',
        primary:    '#B76E79',
        secondary:  '#6B5B4E',
        ink:        '#0D0D0D',
        muted:      '#6B5B4E',
        border:     '#E8E0D4',
        success:    '#B76E79',
        error:      '#7A2E3F',

        // ── Landing page (luxe theme) ─────────────────────
        'luxe-dark':      '#0D0D0D',
        'luxe-espresso':  '#6B5B4E',
        'luxe-accent':    '#B76E79',
        'luxe-burgundy':  '#7A2E3F',
        'luxe-taupe':     '#C8B8A9',
        'luxe-stone':     '#C8B8A9',
        'luxe-gray':      '#E8E0D4',
        'luxe-ivory':     '#FAF7F2',
        'luxe-cream':     '#FAF7F2',
        'luxe-charcoal':  '#0D0D0D',
        'luxe-midnight':  '#0D0D0D',
        'luxe-amber':     '#B76E79',
        'luxe-rose':      '#7A2E3F',
        'luxe-sage':      '#6B5B4E',
        'luxe-blue':      '#B76E79',
        'luxe-teal':      '#B76E79',
        'luxe-violet':    '#7A2E3F',

        // ── Customer app (royal theme) ────────────────────
        navy:      { DEFAULT: '#0D0D0D', mid: '#1A1A1A' },
        gold:      { DEFAULT: '#B76E79', light: '#D4A0A0' },
        lavender:  '#E8E0D4',
        champagne: '#FAF7F2',
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        syne: ['var(--font-syne)', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '0px',
        pill: '9999px',
        xl2: '0px',
      },
      backgroundImage: {
        'luxe-gradient':      'linear-gradient(180deg, #FAF7F2 0%, #E8E0D4 100%)',
        'luxe-hero':          'linear-gradient(160deg, #0D0D0D 0%, #1A1A1A 50%, #1C1510 100%)',
        'luxe-warm':          'linear-gradient(135deg, #FAF7F2 0%, #D4C5B2 100%)',
        'luxe-dark-gradient': 'linear-gradient(160deg, #0D0D0D 0%, #1A1A1A 60%, #1C1510 100%)',
        'royal-gradient':     'linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 100%)',
      },
      boxShadow: {
        luxe:       '0 4px 30px rgba(183, 110, 121, 0.08)',
        'luxe-lg':  '0 8px 60px rgba(183, 110, 121, 0.12)',
        royal:      '0 4px 20px rgba(13, 13, 13, 0.12)',
        'royal-lg': '0 8px 40px rgba(13, 13, 13, 0.18)',
        glass:      '0 4px 16px rgba(255, 255, 255, 0.1)',
        gold:       '0 4px 20px rgba(183, 110, 121, 0.25)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out',
        shimmer: 'shimmer 2s infinite',
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
      },
    },
  },
  plugins: [],
}

export default config
