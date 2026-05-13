'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminLoginPage() {
  const supabase = createClient()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSignIn() {
    if (!email.includes('@') || password.length < 6) {
      setError('Enter a valid email and password')
      return
    }
    setLoading(true); setError('')

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setLoading(false); setError(err.message); return }

    const { data: role, error: roleErr } = await supabase.rpc('ensure_user_profile' as any)
    if (roleErr || role !== 'admin') {
      await supabase.auth.signOut()
      setLoading(false)
      setError('Access denied. This portal is for administrators only.')
      return
    }

    window.location.href = '/admin/dashboard'
  }

  const inputCls = 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:border-amber-400 focus:bg-white/15 transition-all outline-none'

  return (
    <div className="min-h-screen bg-royal-gradient flex items-center justify-center px-4">
      <div className="absolute top-1/4 right-0 w-72 h-72 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-navy-mid/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-6">

        {/* Logo + badge */}
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <span className="text-2xl">🛡️</span>
            </div>
            <span className="font-syne text-2xl font-bold text-white tracking-wide">Saloo Admin</span>
          </Link>
          <p className="text-white/30 text-xs mt-1">Restricted access — authorized personnel only</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.07] backdrop-blur-sm border border-amber-500/15 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-white/60 text-xs font-medium block mb-1.5 uppercase tracking-wide">Email</label>
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="admin@example.com" autoFocus className={inputCls}
            />
          </div>
          <div>
            <label className="text-white/60 text-xs font-medium block mb-1.5 uppercase tracking-wide">Password</label>
            <input
              type="password" value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Your password"
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSignIn} disabled={loading}
            className="w-full bg-amber-500 text-black font-syne font-bold py-3.5 rounded-xl hover:bg-amber-400 disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            {loading ? 'Verifying…' : 'Sign In to Admin'}
          </button>
        </div>

        <p className="text-center">
          <Link href="/login" className="text-white/20 hover:text-white/40 text-xs transition-colors">
            ← Back to main login
          </Link>
        </p>
      </div>
    </div>
  )
}
