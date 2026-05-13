'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function ConfirmPage() {
  const searchParams  = useSearchParams()
  const email         = searchParams.get('email') ?? ''
  const type          = searchParams.get('type') ?? 'signup'   // 'signup' | 'recovery'
  const supabase      = createClient()

  const [status, setStatus]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [cooldown, setCooldown] = useState(0)

  // Countdown timer after resend
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleResend() {
    if (!email || cooldown > 0) return
    setStatus('sending')
    const { error } = await supabase.auth.resend({
      type: type === 'recovery' ? 'email_change' : 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setStatus('error')
    } else {
      setStatus('sent')
      setCooldown(60)          // prevent spam — 60 s cooldown
    }
  }

  const isRecovery = type === 'recovery'

  return (
    <div className="min-h-screen bg-royal-gradient flex items-center justify-center px-4 py-10">
      {/* Ambient orbs */}
      <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-navy-mid/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-8 text-center">

        {/* Logo */}
        <Link href="/" className="inline-flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center">
            <span className="font-syne font-bold text-gold text-2xl">✂</span>
          </div>
          <span className="font-syne text-2xl font-bold text-white tracking-wide">Saloo</span>
        </Link>

        {/* Envelope illustration */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gold/10 border-2 border-gold/25 flex items-center justify-center">
              <span className="text-5xl">✉️</span>
            </div>
            {/* Animated ping dot */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-60" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-gold" />
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="font-syne font-bold text-3xl text-white">
            {isRecovery ? 'Check your inbox' : 'Confirm your email'}
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            {isRecovery
              ? 'We sent a password reset link to'
              : "We've sent a confirmation link to"}
          </p>
          {email && (
            <p className="font-syne font-semibold text-gold text-base break-all">{email}</p>
          )}
        </div>

        {/* Instructions card */}
        <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-6 text-left space-y-4">
          <p className="text-white/60 text-sm font-medium uppercase tracking-wider">What to do next</p>
          <ol className="space-y-3">
            {[
              'Open your email inbox',
              `Find the email from Saloo${isRecovery ? ' with subject "Reset your password"' : ''}`,
              `Click the "${isRecovery ? 'Reset Password' : 'Confirm your email'}" button`,
              isRecovery ? 'Set your new password' : 'You\'ll be signed in automatically',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-white/60 text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Spam notice */}
        <p className="text-white/30 text-xs">
          Can't find it? Check your <span className="text-white/50">spam or junk</span> folder.
        </p>

        {/* Resend button */}
        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={status === 'sending' || cooldown > 0}
            className="w-full py-3.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'sending'
              ? 'Sending…'
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend confirmation email'}
          </button>

          {status === 'sent' && (
            <p className="text-green-400 text-sm">
              Email resent! Check your inbox.
            </p>
          )}
          {status === 'error' && (
            <p className="text-red-400 text-sm">
              Something went wrong. Try again in a moment.
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/20 text-xs">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Back to sign in */}
        <Link
          href="/login"
          className="block w-full py-3.5 bg-gold text-navy font-syne font-bold rounded-xl hover:bg-gold/90 transition-all active:scale-[0.98] text-sm"
        >
          Back to Sign In
        </Link>

        <p className="text-white/20 text-xs">
          Wrong email?{' '}
          <Link href="/login" className="text-white/40 hover:text-white underline transition-colors">
            Start over
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ConfirmPageWrapper() {
  return (
    <Suspense>
      <ConfirmPage />
    </Suspense>
  )
}
