'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type AuthMode = 'signin' | 'signup'

function LoginPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const supabase    = createClient()

  const prefillEmail = searchParams.get('email') ?? ''

  const [mode, setMode]         = useState<AuthMode>('signin')
  const [email, setEmail]       = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  function clearForm() {
    setError('')
    setPassword('')
  }

  // ── Sign In ──────────────────────────────────────────────────────────────
  async function handleSignIn() {
    if (!email.includes('@') || password.length < 6) {
      setError('Enter a valid email and password (min 6 chars)')
      return
    }
    setLoading(true); setError('')

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setLoading(false)
      if (err.message.toLowerCase().includes('email not confirmed')) {
        router.push(`/auth/confirm?email=${encodeURIComponent(email)}`)
        return
      }
      setError(err.message)
      return
    }

    // Ensure profile exists
    try { await supabase.rpc('ensure_user_profile' as any) } catch {}

    setLoading(false)
    // All users (including admin, shop_owner) land on customer home first
    window.location.href = '/home'
  }

  // ── Sign Up ───────────────────────────────────────────────────────────────
  async function handleSignUp() {
    if (!fullName.trim()) { setError('Enter your full name'); return }
    if (!email.includes('@') || password.length < 6) {
      setError('Enter a valid email and password (min 6 chars)')
      return
    }
    setLoading(true); setError('')

    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    // Empty identities = email already registered
    if (!data.user?.identities?.length) {
      setError('An account with this email already exists. Please sign in.')
      return
    }
    router.push(`/auth/confirm?email=${encodeURIComponent(email)}`)
  }

  const inputCls = 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:border-gold focus:bg-white/15 transition-all outline-none'
  const labelCls = 'text-white/70 text-xs font-medium block mb-1.5 tracking-wide uppercase'

  return (
    <div className="min-h-screen bg-royal-gradient flex items-center justify-center px-4 py-8">
      {/* Ambient orbs */}
      <div className="absolute top-1/4 right-0 w-72 h-72 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-navy-mid/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center">
              <span className="font-syne font-bold text-gold text-2xl">✂</span>
            </div>
            <span className="font-syne text-3xl font-bold text-white tracking-wide">Saloo</span>
          </Link>
          <p className="text-white/40 text-sm mt-2">Your premium barber, booked.</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.07] backdrop-blur-sm border border-white/15 rounded-2xl p-6 space-y-5">

          {/* Tabs */}
          <div className="flex bg-white/10 rounded-xl p-1 gap-1">
            {(['signin', 'signup'] as AuthMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); clearForm() }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-white text-navy shadow-sm font-semibold'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Sign In form */}
          {mode === 'signin' && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="you@example.com" autoFocus className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input
                  type="password" value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Your password" className={inputCls}
                />
              </div>
              {error && <ErrorMsg msg={error} />}
              <button
                onClick={handleSignIn} disabled={loading}
                className="w-full bg-gold text-navy font-syne font-bold py-3.5 rounded-xl hover:bg-gold/90 disabled:opacity-40 shadow-gold transition-all active:scale-[0.98]"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
          )}

          {/* Sign Up form */}
          {mode === 'signup' && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Full Name</label>
                <input
                  type="text" value={fullName}
                  onChange={e => { setFullName(e.target.value); setError('') }}
                  placeholder="Your full name" autoFocus className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="you@example.com" className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input
                  type="password" value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Min 6 characters" className={inputCls}
                />
              </div>
              {error && <ErrorMsg msg={error} />}
              <button
                onClick={handleSignUp} disabled={loading}
                className="w-full bg-gold text-navy font-syne font-bold py-3.5 rounded-xl hover:bg-gold/90 disabled:opacity-40 shadow-gold transition-all active:scale-[0.98]"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </div>
          )}

        </div>

        {/* Admin portal — subtle, not in main flow */}
        <p className="text-center mt-6">
          <Link
            href="/admin/login"
            className="text-white/20 hover:text-white/40 text-xs transition-colors"
          >
            Admin Portal →
          </Link>
        </p>

        <div className="bg-white/[0.07] backdrop-blur-sm border border-white/15 rounded-2xl p-6 space-y-5">
          <p className="text-white/30 text-[10px] uppercase tracking-widest text-center font-bold">Demo Access (No Auth)</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'User',  role: 'customer',   icon: '👤', path: '/home' },
              { label: 'Owner', role: 'shop_owner', icon: '🏪', path: '/owner/dashboard' },
              { label: 'Admin', role: 'admin',      icon: '🛡️', path: '/admin/dashboard' },
            ].map(d => (
              <button
                key={d.role}
                onClick={() => {
                  document.cookie = "saloo-dev-bypass=true; path=/";
                  document.cookie = `saloo-dev-role=${d.role}; path=/`;
                  window.location.href = d.path;
                }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold/30 transition-all active:scale-95"
              >
                <span className="text-lg">{d.icon}</span>
                <span className="text-[10px] text-white/50 font-medium uppercase tracking-tighter">{d.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              document.cookie = "saloo-dev-bypass=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
              document.cookie = "saloo-dev-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
              window.location.reload();
            }}
            className="w-full text-white/20 hover:text-white/40 text-[10px] uppercase tracking-widest transition-colors py-1"
          >
            Clear Bypass
          </button>
        </div>

        <p className="text-center text-white/20 text-xs mt-3">
          By continuing, you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  )
}

export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
      {msg}
    </p>
  )
}
