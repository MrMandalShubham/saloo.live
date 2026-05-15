'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

export default function OwnerSettingsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [saved, setSaved] = useState(false)

  const { data: shop, isLoading } = useQuery({
    queryKey: ['owner-shop'],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-shop-get`, { headers: { Authorization: `Bearer ${token}` } })
      const { data } = await res.json()
      return data
    },
  })

  useEffect(() => {
    if (shop && !editing) setForm(shop)
  }, [shop, editing])

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-shop-update`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-shop'] })
      setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
    },
  })

  async function handleSignOut() {
    if (!window.confirm('Sign out?')) return
    await createClient().auth.signOut()
    router.replace('/login')
  }

  if (isLoading || !shop) {
    return (
      <div className="space-y-2 max-w-2xl">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Settings</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">Manage your shop profile</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="px-4 py-2 bg-white/60 backdrop-blur-md shadow-sm border border-white/80 text-saloo-dark/80 hover:text-saloo-dark rounded-xl text-sm font-semibold transition-all">
            Edit Profile
          </button>
        )}
      </div>

      {saved && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          <p className="text-green-400 text-sm font-medium">✓ Changes saved</p>
        </div>
      )}

      {/* Shop Info */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-6">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-widest mb-5">Shop Info</p>

        {editing && form ? (
          <div className="space-y-4">
            <FI label="Shop Name" value={form.name ?? ''} onChange={v => setForm({ ...form, name: v })} />
            <FI label="Description" value={form.description ?? ''} onChange={v => setForm({ ...form, description: v })} multiline />
            <FI label="Phone" value={form.phone ?? ''} onChange={v => setForm({ ...form, phone: v })} />
            <FI label="Address" value={form.address ?? ''} onChange={v => setForm({ ...form, address: v })} />
            <div className="grid grid-cols-2 gap-4">
              <FI label="City" value={form.city ?? ''} onChange={v => setForm({ ...form, city: v })} />
              <FI label="Pincode" value={form.pincode ?? ''} onChange={v => setForm({ ...form, pincode: v })} />
            </div>
            <FI label="Instagram" value={form.social_instagram ?? ''} onChange={v => setForm({ ...form, social_instagram: v })} />
            <FI label="GST Number" value={form.gst_number ?? ''} onChange={v => setForm({ ...form, gst_number: v })} />
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditing(false)} className="flex-1 py-3 bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/60 hover:text-saloo-dark rounded-xl text-sm transition-colors">Cancel</button>
              <button
                onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending}
                className="flex-1 py-3 bg-saloo-pink text-saloo-cream rounded-xl font-syne font-bold text-sm hover:bg-saloo-pink/90 disabled:opacity-40 transition-all"
              >
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            <Row label="Name"    value={shop.name} />
            <Row label="Phone"   value={shop.phone ?? '—'} />
            <Row label="Address" value={[shop.address, shop.city].filter(Boolean).join(', ')} />
            <Row label="Status"  value={shop.status} />
            <Row label="Rating"  value={`${shop.rating?.toFixed(1) ?? '—'} (${shop.review_count ?? 0} reviews)`} isLast />
          </div>
        )}
      </div>

      {/* Sign out */}
      <button onClick={handleSignOut}
        className="w-full py-4 bg-red-500/[0.07] border border-red-500/20 text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.12] rounded-2xl font-semibold text-sm transition-all">
        Sign Out
      </button>
    </div>
  )
}

function FI({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string }) {
  return (
    <div>
      <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
          className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm placeholder-white/20 focus:outline-none focus:border-saloo-pink/40 transition-colors resize-none" />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm placeholder-white/20 focus:outline-none focus:border-saloo-pink/40 transition-colors" />
      )}
    </div>
  )
}

function Row({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div className={`flex justify-between py-3 ${isLast ? '' : 'border-b border-white/[0.05]'}`}>
      <span className="text-saloo-dark/50 text-sm">{label}</span>
      <span className="text-saloo-dark text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}
