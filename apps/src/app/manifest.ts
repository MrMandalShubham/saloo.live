import type { MetadataRoute } from 'next'

// Web App Manifest — makes LooksOn installable ("Add to Home screen" / "Install app").
// Next serves this at /manifest.webmanifest and auto-links it in <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LooksOn — Barbers & Beauty',
    short_name: 'LooksOn',
    description: 'Book top barbers & beauty salons near you — instantly, securely.',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#202f32',
    theme_color: '#202f32',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
