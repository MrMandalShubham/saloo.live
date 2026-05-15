'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const BENEFITS = [
  { icon: '📅', title: 'Online Bookings 24/7', desc: 'Customers book appointments any time without calling you.' },
  { icon: '💳', title: 'Instant Payments', desc: 'Razorpay integration — get paid directly to your bank account.' },
  { icon: '⭐', title: 'Build Your Reputation', desc: 'Verified reviews grow trust and attract new customers.' },
  { icon: '📊', title: 'Smart Analytics', desc: 'Track revenue, peak hours, and top services in one dashboard.' },
  { icon: '👥', title: 'Manage Your Team', desc: 'Add barbers, set availability, and handle schedules easily.' },
  { icon: '🎯', title: 'Promotions & Offers', desc: 'Run discounts and loyalty rewards to retain customers.' },
]

const CODE_OF_CONDUCT = [
  'Maintain accurate shop information — address, hours, and services must be up to date at all times.',
  'Honor all confirmed bookings. Repeated cancellations or no-shows will result in account suspension.',
  'Treat every customer with professionalism and respect. Discrimination of any kind is strictly prohibited.',
  'All pricing listed must be the final amount charged — no hidden fees or last-minute increases.',
  'Respond to customer disputes and queries within 48 hours through the platform.',
  'Any fraudulent activity, fake reviews, or manipulation of the platform will result in immediate removal.',
]

const TERMS = [
  { heading: 'Platform Commission', body: 'Saloo charges a small commission on each completed booking. Current rates are shown in your Owner Dashboard. Rates may change with 30 days advance notice.' },
  { heading: 'Verification Process', body: 'After submitting your shop details, our team reviews your application within 2–5 business days. You may be contacted for additional documents.' },
  { heading: 'Account Suspension', body: 'We reserve the right to suspend or permanently remove shops that violate the code of conduct, receive consistent negative feedback, or engage in fraudulent activity.' },
  { heading: 'Data & Privacy', body: 'Your shop and customer booking data is stored securely. We never share individual customer data with third parties without consent.' },
]

type ShopStatus = 'none' | 'pending' | 'verified' | 'rejected' | 'suspended'

export default function OpenShopPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [role, setRole]             = useState<string | null>(null)
  const [shopStatus, setShopStatus] = useState<ShopStatus>('none')
  const [shopName, setShopName]     = useState('')
  const [agreed, setAgreed]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [upgradeError, setUpgradeError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = profile?.role ?? 'customer'
      setRole(userRole)

      const { data: shop } = await supabase
        .from('shops')
        .select('name, status')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (shop) {
        setShopName(shop.name)
        setShopStatus(shop.status as ShopStatus)
      }

      setPageLoading(false)
    }
    load()
  }, [])

  async function handleOpenShop() {
    if (!agreed) return
    setLoading(true)
    setUpgradeError('')

    const { data: newRole, error } = await supabase.rpc('request_shop_owner' as any) as { data: string | null; error: any }

    if (error) {
      setLoading(false)
      setUpgradeError(error.message || 'Something went wrong. Please try again.')
      return
    }

    if (newRole !== 'shop_owner') {
      setLoading(false)
      setUpgradeError('Role upgrade failed. Please refresh and try again.')
      return
    }

    // Full reload so server reads the updated role from DB fresh
    window.location.href = '/owner/dashboard'
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-saloo-teal/40 border-t-gold animate-spin" />
      </div>
    )
  }

  // ── Already a verified shop owner ─────────────────────────────────────────
  if (role === 'shop_owner' && shopStatus === 'verified') {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-saloo-teal/10 border-2 border-saloo-teal/25 flex items-center justify-center mx-auto">
          <span className="text-4xl">🏪</span>
        </div>
        <div>
          <h1 className="font-syne font-bold text-2xl text-ink">{shopName || 'Your Shop'}</h1>
          <p className="text-green-600 text-sm mt-1 font-semibold">Verified & Active</p>
        </div>
        <p className="text-secondary text-sm">
          Your shop is live on Saloo. Head to your dashboard to manage bookings, team, and analytics.
        </p>
        <Link href="/owner/dashboard"
          className="inline-flex items-center gap-2 bg-saloo-teal text-white font-syne font-bold px-8 py-4 rounded-2xl hover:bg-saloo-teal/90 transition-all active:scale-[0.98]">
          Owner Dashboard →
        </Link>
        <p className="text-muted text-xs">
          Want to book as a customer?{' '}
          <Link href="/home" className="text-secondary hover:text-ink underline transition-colors">Go to Home</Link>
        </p>
      </div>
    )
  }

  // ── Application pending ────────────────────────────────────────────────────
  if (role === 'shop_owner' && shopStatus === 'pending') {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto">
          <span className="text-4xl">⏳</span>
        </div>
        <div>
          <h1 className="font-syne font-bold text-2xl text-ink">Application Under Review</h1>
          <p className="text-saloo-teal text-sm mt-1 font-semibold">{shopName}</p>
        </div>
        <p className="text-secondary text-sm leading-relaxed">
          Our team is reviewing your shop application. This usually takes 2–5 business days.
          We'll notify you once a decision is made.
        </p>
        <Link href="/owner/dashboard"
          className="inline-flex items-center gap-2 bg-ink text-white font-syne font-semibold px-8 py-4 rounded-2xl hover:bg-ink/80 transition-all active:scale-[0.98]">
          View Application Status →
        </Link>
      </div>
    )
  }

  // ── Shop rejected ──────────────────────────────────────────────────────────
  if (role === 'shop_owner' && shopStatus === 'rejected') {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto">
          <span className="text-4xl">📋</span>
        </div>
        <div>
          <h1 className="font-syne font-bold text-2xl text-ink">Application Not Approved</h1>
          <p className="text-error text-sm mt-1 font-medium">{shopName}</p>
        </div>
        <p className="text-secondary text-sm leading-relaxed">
          Your previous application was not approved. You can update your shop details and reapply.
          Check your notifications for the reason.
        </p>
        <Link href="/owner/dashboard"
          className="inline-flex items-center gap-2 bg-saloo-teal text-white font-syne font-bold px-8 py-4 rounded-2xl hover:bg-saloo-teal/90 transition-all active:scale-[0.98]">
          Update & Reapply →
        </Link>
      </div>
    )
  }

  // ── Already shop_owner but no shop created yet ────────────────────────────
  if (role === 'shop_owner' && shopStatus === 'none') {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-saloo-teal/10 border-2 border-saloo-teal/25 flex items-center justify-center mx-auto">
          <span className="text-4xl">✂</span>
        </div>
        <div>
          <h1 className="font-syne font-bold text-2xl text-ink">Set Up Your Shop</h1>
          <p className="text-secondary text-sm mt-1">You're ready — fill in your shop details to get started</p>
        </div>
        <p className="text-secondary text-sm leading-relaxed">
          Head to your Owner Dashboard to complete your shop profile. Once submitted, our team will review and verify it.
        </p>
        <Link href="/owner/dashboard"
          className="inline-flex items-center gap-2 bg-saloo-teal text-white font-syne font-bold px-8 py-4 rounded-2xl hover:bg-saloo-teal/90 transition-all active:scale-[0.98]">
          Owner Dashboard →
        </Link>
      </div>
    )
  }

  // ── Full landing page for new applicants (role = 'customer') ──────────────
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-10">

      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-saloo-teal/10 border border-saloo-teal/30 rounded-full px-4 py-1.5">
          <span className="text-saloo-teal text-xs font-bold uppercase tracking-wider">For Shop Owners</span>
        </div>
        <h1 className="font-syne font-bold text-3xl sm:text-4xl text-ink leading-tight">
          Grow Your Barbershop<br />
          <span className="text-saloo-teal">with Saloo</span>
        </h1>
        <p className="text-secondary text-base leading-relaxed max-w-md mx-auto">
          Join hundreds of barbershops already using Saloo to manage bookings, payments, and their team — all in one place.
        </p>
      </div>

      {/* Benefits grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BENEFITS.map(b => (
          <div key={b.title} className="bg-white border border-border rounded-2xl p-5 flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-saloo-teal/10 border border-saloo-teal/20 flex items-center justify-center shrink-0">
              <span className="text-xl">{b.icon}</span>
            </div>
            <div>
              <p className="text-ink font-semibold text-sm">{b.title}</p>
              <p className="text-secondary text-xs mt-0.5 leading-relaxed">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Code of Conduct */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-ink/[0.03] border-b border-border px-6 py-4 flex items-center gap-3">
          <span className="text-lg">📜</span>
          <div>
            <h2 className="font-syne font-bold text-ink text-base">Code of Conduct</h2>
            <p className="text-secondary text-xs mt-0.5">All shop owners must follow these guidelines</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {CODE_OF_CONDUCT.map((rule, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-saloo-teal/15 border border-saloo-teal/25 text-saloo-teal text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-secondary text-sm leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-ink/[0.03] border-b border-border px-6 py-4 flex items-center gap-3">
          <span className="text-lg">⚖️</span>
          <div>
            <h2 className="font-syne font-bold text-ink text-base">Terms & Conditions</h2>
            <p className="text-secondary text-xs mt-0.5">By joining, you agree to the following</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {TERMS.map(t => (
            <div key={t.heading}>
              <p className="text-ink font-semibold text-sm">{t.heading}</p>
              <p className="text-secondary text-sm mt-1 leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Agreement + CTA */}
      <div className="bg-champagne border border-saloo-teal/25 rounded-2xl p-6 space-y-5">
        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <div
            onClick={() => setAgreed(v => !v)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
              agreed ? 'bg-saloo-teal border-saloo-teal' : 'border-ink/25 group-hover:border-saloo-teal/60 bg-white'
            }`}
          >
            {agreed && <span className="text-white text-xs font-bold">✓</span>}
          </div>
          <p className="text-ink/70 text-sm leading-relaxed">
            I have read and agree to the <span className="text-saloo-teal font-semibold">Code of Conduct</span> and{' '}
            <span className="text-saloo-teal font-semibold">Terms & Conditions</span> above. I understand that my shop
            application will be reviewed by the Saloo team before going live.
          </p>
        </label>

        {/* CTA */}
        <button
          onClick={handleOpenShop}
          disabled={!agreed || loading}
          className="w-full bg-ink text-white font-syne font-bold py-4 rounded-xl hover:bg-ink/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] text-base"
        >
          {loading ? 'Setting up your account…' : 'Open Owner Dashboard →'}
        </button>

        {upgradeError && (
          <p className="text-error text-sm bg-error-light border border-red-200 rounded-xl px-4 py-3 text-center">
            {upgradeError}
          </p>
        )}

        <p className="text-ink/40 text-xs text-center">
          You can continue booking as a customer from the Owner Dashboard.
        </p>
      </div>

    </div>
  )
}
