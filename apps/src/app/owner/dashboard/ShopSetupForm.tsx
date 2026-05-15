'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function ShopSetupForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const body = {
      name: fd.get('name'),
      description: fd.get('description'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      address: fd.get('address'),
      city: fd.get('city'),
      state: fd.get('state'),
      pincode: fd.get('pincode'),
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Not logged in'); setLoading(false); return }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/owner-shop-create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      })

      const text = await res.text()
      let json: any = {}
      try { json = JSON.parse(text) } catch { /* ignore */ }

      if (!res.ok) {
        const msg = typeof json.error === 'string' ? json.error : json.error?.message || `Request failed (${res.status})`
        setError(msg)
        setLoading(false)
        return
      }

      window.location.reload()
    } catch (err: any) {
      console.error('Shop create error:', err)
      setError(err?.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto py-12 px-4 animate-fade-up">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-saloo-pink/10 border border-saloo-pink/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✂</span>
        </div>
        <h1 className="font-syne text-2xl font-bold text-saloo-dark">Set Up Your Shop</h1>
        <p className="text-saloo-dark/60 text-sm mt-2">Fill in your shop details to get started. Our team will review and approve your shop.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Shop Name *" name="name" placeholder="e.g. Classic Cuts Salon" required />
        <Field label="Description" name="description" placeholder="Brief description of your shop" textarea />
        <Field label="Phone *" name="phone" placeholder="e.g. 9876543210" required type="tel" />
        <Field label="Email" name="email" placeholder="shop@example.com" type="email" />
        <Field label="Address *" name="address" placeholder="Full street address" required />

        <div className="grid grid-cols-2 gap-3">
          <Field label="City *" name="city" placeholder="City" required />
          <Field label="State *" name="state" placeholder="State" required />
        </div>

        <Field label="Pincode *" name="pincode" placeholder="6-digit pincode" required pattern="\d{6}" />

        {error && (
          <p className="text-red-500 text-sm bg-red-50 rounded-xl p-3">{error}</p>
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

function Field({ label, name, placeholder, required, type, textarea, pattern }: {
  label: string; name: string; placeholder: string; required?: boolean; type?: string; textarea?: boolean; pattern?: string
}) {
  const cls = "w-full px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-md border border-saloo-dark/10 text-saloo-dark text-sm placeholder:text-saloo-dark/30 focus:outline-none focus:border-saloo-pink/40 focus:ring-1 focus:ring-saloo-pink/20 transition-all"
  return (
    <div>
      <label className="text-saloo-dark/70 text-xs font-medium mb-1 block">{label}</label>
      {textarea ? (
        <textarea name={name} placeholder={placeholder} rows={3} className={cls} />
      ) : (
        <input name={name} type={type ?? 'text'} placeholder={placeholder} required={required} pattern={pattern} className={cls} />
      )}
    </div>
  )
}
