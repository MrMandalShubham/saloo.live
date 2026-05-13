import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#EFE9E1',        // luxe-ivory
        'luxe-dark': '#322D29',       // espresso
        'luxe-espresso': '#322D29',   // espresso (alias)
        'luxe-accent': '#72383D',     // burgundy
        'luxe-burgundy': '#72383D',   // burgundy (alias)
        'luxe-taupe': '#AC9C8D',      // taupe
        'luxe-stone': '#D1C7BD',      // warm stone
        'luxe-gray': '#D9D9D9',       // cool gray
        'luxe-ivory': '#EFE9E1',      // ivory
        'luxe-sage': '#4CAF50',        // vibrant green
        'luxe-amber': '#F59E0B',      // bright amber
        'luxe-charcoal': '#1E1E1E',   // deep black
        'luxe-cream': '#FAF7F2',      // warm cream
        'luxe-rose': '#E8446D',       // vivid rose
        'luxe-midnight': '#0F172A',   // deep navy
        'luxe-blue': '#3B82F6',       // bright blue
        'luxe-violet': '#8B5CF6',     // vivid violet
        'luxe-teal': '#14B8A6',       // bright teal
        
        // Customer-facing design tokens (OnO theme)
        navy: { DEFAULT: '#1B1F3B', mid: '#2A2F52' },
        gold: { DEFAULT: '#C9A84C', light: '#E8D5A0' },
        lavender: '#E8E4F0',
        champagne: '#F5EFE0',

        // Semantic remapping
        primary: '#322D29',
        secondary: '#AC9C8D',
        ink: '#322D29',
        muted: '#AC9C8D',
        border: '#D1C7BD',            // warm stone for borders

        success: '#10B981',
        error: '#EF4444',             
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        syne: ['var(--font-syne)', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '0px',                  // Sharp edges for editorial look
        pill: '9999px',               // Fully rounded for specific pills
        xl2: '0px',
      },
      backgroundImage: {
        'luxe-gradient': 'linear-gradient(180deg, #EFE9E1 0%, #D9D9D9 100%)',
        'luxe-hero': 'linear-gradient(135deg, #0F172A 0%, #1E1E1E 40%, #322D29 100%)',
        'luxe-warm': 'linear-gradient(135deg, #FAF7F2 0%, #EFE9E1 50%, #D1C7BD 100%)',
        'luxe-dark-gradient': 'linear-gradient(135deg, #0F172A 0%, #1E1E1E 50%, #322D29 100%)',
        'royal-gradient': 'linear-gradient(135deg, #1B1F3B 0%, #2A2F52 100%)',
      },
      boxShadow: {
        luxe: '0 4px 30px rgba(50, 45, 41, 0.05)',
        'luxe-lg': '0 8px 60px rgba(50, 45, 41, 0.08)',
        royal: '0 4px 20px rgba(27, 31, 59, 0.15)',
        'royal-lg': '0 8px 40px rgba(27, 31, 59, 0.2)',
        glass: '0 4px 16px rgba(255,255,255,0.1)',
        gold: '0 4px 20px rgba(201, 168, 76, 0.3)',
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
