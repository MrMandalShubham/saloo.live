'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ShopSetupForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [shopName, setShopName] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string)?.trim()
    const phone = (fd.get('phone') as string)?.trim()
    const address = (fd.get('address') as string)?.trim()
    const city = (fd.get('city') as string)?.trim()
    const state = (fd.get('state') as string)?.trim()
    const pincode = (fd.get('pincode') as string)?.trim()
    const description = (fd.get('description') as string)?.trim()
    const email = (fd.get('email') as string)?.trim()

    // Client-side validation
    if (!name || !phone || !address || !city || !state || !pincode) {
      setError('Please fill in all required fields.')
      setLoading(false)
      return
    }
    if (!/^\d{6}$/.test(pincode)) {
      setError('Pincode must be exactly 6 digits.')
      setLoading(false)
      return
    }
    if (!/^\d{10}$/.test(phone.replace(/[\s\-+]/g, '').slice(-10))) {
      setError('Please enter a valid 10-digit phone number.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('Your session has expired. Please log in again.')
        setLoading(false)
        return
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !anonKey) {
        setError('App configuration error. Please contact support.')
        setLoading(false)
        return
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/owner-shop-create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: anonKey,
        },
        body: JSON.stringify({ name, description, phone, email, address, city, state, pincode }),
      })

      // Parse response safely
      let json: Record<string, unknown> = {}
      try {
        const text = await res.text()
        json = JSON.parse(text)
      } catch {
        setError(`Server returned invalid response (${res.status}). Please try again.`)
        setLoading(false)
        return
      }

      if (!res.ok) {
        // Extract error message from various response formats
        const errObj = json.error
        let msg = 'Failed to create shop. Please try again.'
        if (typeof errObj === 'string') msg = errObj
        else if (errObj && typeof errObj === 'object' && 'message' in errObj) msg = String((errObj as Record<string, unknown>).message)

        // If shop already exists, show a helpful message
        if (res.status === 409) {
          msg = 'You already have a shop registered. Refreshing...'
          setError(msg)
          setTimeout(() => window.location.reload(), 1500)
          return
        }

        setError(msg)
        setLoading(false)
        return
      }

      // Success — show success state, then redirect
      setShopName(name)
      setSuccess(true)
      setLoading(false)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error. Please check your connection.'
      console.error('Shop create error:', err)
      setError(message)
      setLoading(false)
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-6 animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
          <span className="text-2xl">✓</span>
        </div>
        <div>
          <h2 className="font-syne font-bold text-saloo-dark text-xl">Shop Submitted!</h2>
          <p className="text-saloo-dark/60 text-sm mt-2">
            <span className="font-semibold text-saloo-dark/80">{shopName}</span> has been submitted for review.
            Our team will verify your shop within 2–5 business days.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 rounded-xl bg-saloo-pink text-white font-semibold text-sm hover:bg-saloo-pink/90 transition-all"
        >
          Go to Dashboard →
        </button>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto py-12 px-4 animate-fade-up">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-saloo-pink/10 border border-saloo-pink/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✂</span>
        </div>
        <h1 className="font-syne text-2xl font-bold text-saloo-dark">Set Up Your Shop</h1>
        <p className="text-saloo-dark/60 text-sm mt-2">
          Fill in your shop details to get started. Our team will review and approve your shop.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Shop Name" name="name" placeholder="e.g. Classic Cuts Salon" required />
        <Field label="Description" name="description" placeholder="Brief description of your shop" textarea />
        <Field label="Phone" name="phone" placeholder="e.g. 9876543210" required type="tel" />
        <Field label="Email" name="email" placeholder="shop@example.com" type="email" />
        <Field label="Address" name="address" placeholder="Full street address" required />

        <div className="grid grid-cols-2 gap-3">
          <Field label="City" name="city" placeholder="City" required />
          <Field label="State" name="state" placeholder="State" required />
        </div>

        <Field label="Pincode" name="pincode" placeholder="6-digit pincode" required />

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-saloo-pink text-white font-semibold text-sm hover:bg-saloo-pink/90 transition-all disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Submit for Approval'}
        </button>

        <p className="text-saloo-dark/40 text-xs text-center">
          Your shop will be reviewed by our team. You can start adding services once approved.
        </p>
      </form>
    </div>
  )
}

function Field({ label, name, placeholder, required, type, textarea }: {
  label: string; name: string; placeholder: string; required?: boolean; type?: string; textarea?: boolean
}) {
  const cls = 'w-full px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-md border border-saloo-dark/10 text-saloo-dark text-sm placeholder:text-saloo-dark/30 focus:outline-none focus:border-saloo-pink/40 focus:ring-1 focus:ring-saloo-pink/20 transition-all'
  return (
    <div>
      <label className="text-saloo-dark/70 text-xs font-medium mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {textarea ? (
        <textarea name={name} placeholder={placeholder} rows={3} className={cls} />
      ) : (
        <input name={name} type={type ?? 'text'} placeholder={placeholder} required={required} className={cls} />
      )}
    </div>
  )
}
