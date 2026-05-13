import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Parse root .env ─────────────────────────────────────────────────────────
function parseEnv(filePath) {
  try {
    const lines = readFileSync(filePath, 'utf8').split('\n')
    const env = {}
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 0) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      env[key] = val
    }
    return env
  } catch {
    return {}
  }
}

const rootEnv = parseEnv(resolve(__dirname, '../../.env'))

// Inject into process.env so server-side code can read them
for (const [k, v] of Object.entries(rootEnv)) {
  if (!process.env[k]) process.env[k] = v  // shell env takes priority
}

// ─── Map root keys → Next.js public + server names ───────────────────────────
const e = rootEnv

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@saloo/lib', '@saloo/types', '@saloo/ui'],

  // `env` is inlined at build time — exposes both NEXT_PUBLIC_* (client) and server vars
  env: {
    // Supabase — public (used in browser + Edge Functions)
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL      || e.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || e.SUPABASE_ANON_KEY,
    // Supabase — server only
    SUPABASE_SERVICE_ROLE_KEY:     process.env.SUPABASE_SERVICE_ROLE_KEY     || e.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET:           process.env.SUPABASE_JWT_SECRET           || e.SUPABASE_JWT_SECRET,
    // Razorpay
    NEXT_PUBLIC_RAZORPAY_KEY_ID:   process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID   || e.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET:           process.env.RAZORPAY_KEY_SECRET           || e.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET:       process.env.RAZORPAY_WEBHOOK_SECRET       || e.RAZORPAY_WEBHOOK_SECRET,
    // Google Maps
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || e.GOOGLE_MAPS_API_KEY,
    // App URL
    NEXT_PUBLIC_APP_URL:           process.env.NEXT_PUBLIC_APP_URL           || e.APP_URL,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default nextConfig
