'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const SHOP_FEATURES = [
  { key: 'AC', icon: '❄️', label: 'Air Conditioned' },
  { key: 'Parking', icon: '🅿️', label: 'Parking Available' },
  { key: 'WiFi', icon: '📶', label: 'Free WiFi' },
  { key: 'Card Payment', icon: '💳', label: 'Card / UPI Payment' },
  { key: 'Kids Friendly', icon: '👶', label: 'Kids Friendly' },
  { key: 'Home Service', icon: '🏠', label: 'Home Service' },
  { key: 'Online Booking', icon: '📱', label: 'Online Booking' },
  { key: 'Wheelchair Access', icon: '♿', label: 'Wheelchair Accessible' },
  { key: 'Sanitized Tools', icon: '🧴', label: 'Sanitized Tools' },
  { key: 'Bridal Services', icon: '💍', label: 'Bridal Services' },
  { key: 'Hair Spa', icon: '💆', label: 'Hair Spa' },
  { key: 'Beard Styling', icon: '🧔', label: 'Beard Styling' },
]

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

export default function OwnerSettingsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: shop, isLoading } = useQuery({
    queryKey: ['owner-shop'],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-shop-get`, {
        headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
      })
      const { data } = await res.json()
      return data
    },
  })

  useEffect(() => {
    if (shop && !editing) setForm({ ...shop, features: shop.features ?? [], photos: shop.photos ?? [] })
  }, [shop, editing])

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-shop-update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-shop'] })
      setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
    },
    onError: (e: Error) => setErr(e.message),
  })

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErr('Please select an image'); return }
    if (file.size > 10 * 1024 * 1024) { setErr('Image must be under 10MB'); return }

    setUploading(true); setErr('')
    try {
      const ext = file.name.split('.').pop()
      const path = `shops/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('shop-photos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('shop-photos').getPublicUrl(path)
      setForm((f: any) => ({ ...f, photos: [...(f.photos ?? []), publicUrl] }))
    } catch (e: any) {
      setErr(e.message ?? 'Failed to upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removePhoto(idx: number) {
    setForm((f: any) => ({ ...f, photos: f.photos.filter((_: string, i: number) => i !== idx) }))
  }

  function toggleFeature(key: string) {
    setForm((f: any) => {
      const features = f.features ?? []
      return {
        ...f,
        features: features.includes(key)
          ? features.filter((k: string) => k !== key)
          : [...features, key],
      }
    })
  }

  function handleSave() {
    if (!form) return
    setErr('')
    const { name, description, phone, email, address, city, state, pincode, features, photos, social_instagram, social_facebook, gst_number } = form
    updateMutation.mutate({ name, description, phone, email, address, city, state, pincode, features, photos, social_instagram, social_facebook, gst_number })
  }

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

  const currentPhotos = form?.photos ?? shop?.photos ?? []
  const currentFeatures = form?.features ?? shop?.features ?? []

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
      {err && (
        <div className="bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{err}</p>
        </div>
      )}

      {/* ═══ SHOP PHOTOS ═══ */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-6">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-widest mb-4">Shop Photos</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />

        <div className="flex gap-3 flex-wrap">
          {currentPhotos.map((url: string, idx: number) => (
            <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/80 group">
              <Image src={url} alt={`Shop photo ${idx + 1}`} fill className="object-cover" />
              {editing && (
                <button onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  ×
                </button>
              )}
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-md font-medium">Cover</span>
              )}
            </div>
          ))}
          {editing && (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-saloo-dark/20 flex flex-col items-center justify-center text-saloo-dark/40 hover:border-saloo-pink/40 hover:text-saloo-pink/60 transition-colors disabled:opacity-40">
              {uploading ? (
                <span className="text-xs">Uploading…</span>
              ) : (
                <>
                  <span className="text-xl">📷</span>
                  <span className="text-[10px] mt-1">Add Photo</span>
                </>
              )}
            </button>
          )}
        </div>
        {currentPhotos.length === 0 && !editing && (
          <p className="text-saloo-dark/30 text-sm">No photos added yet</p>
        )}
        {editing && <p className="text-saloo-dark/40 text-xs mt-3">First photo is used as shop cover image. Add up to 5 photos.</p>}
      </div>

      {/* ═══ FEATURES ═══ */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-6">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-widest mb-4">Features & Amenities</p>

        {editing ? (
          <div className="grid grid-cols-2 gap-2">
            {SHOP_FEATURES.map(f => {
              const selected = currentFeatures.includes(f.key)
              return (
                <button key={f.key} type="button" onClick={() => toggleFeature(f.key)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                    selected
                      ? 'bg-saloo-pink/10 border border-saloo-pink/30 text-saloo-dark'
                      : 'bg-white/40 border border-white/80 text-saloo-dark/50 hover:bg-white/60 hover:text-saloo-dark/70'
                  }`}>
                  <span className="text-base">{f.icon}</span>
                  <span className="flex-1">{f.label}</span>
                  {selected && <span className="text-saloo-pink text-xs font-bold">✓</span>}
                </button>
              )
            })}
          </div>
        ) : currentFeatures.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {currentFeatures.map((key: string) => {
              const feat = SHOP_FEATURES.find(f => f.key === key)
              return (
                <span key={key} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/40 border border-white/80 rounded-xl text-sm text-saloo-dark/70">
                  <span>{feat?.icon ?? '✓'}</span>
                  {feat?.label ?? key}
                </span>
              )
            })}
          </div>
        ) : (
          <p className="text-saloo-dark/30 text-sm">No features selected</p>
        )}
      </div>

      {/* ═══ SHOP INFO ═══ */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-6">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-widest mb-5">Shop Info</p>

        {editing && form ? (
          <div className="space-y-4">
            <FI label="Shop Name" value={form.name ?? ''} onChange={v => setForm({ ...form, name: v })} />
            <FI label="Description" value={form.description ?? ''} onChange={v => setForm({ ...form, description: v })} multiline />
            <FI label="Phone" value={form.phone ?? ''} onChange={v => setForm({ ...form, phone: v })} />
            <FI label="Email" value={form.email ?? ''} onChange={v => setForm({ ...form, email: v })} />
            <FI label="Address" value={form.address ?? ''} onChange={v => setForm({ ...form, address: v })} />
            <div className="grid grid-cols-2 gap-4">
              <FI label="City" value={form.city ?? ''} onChange={v => setForm({ ...form, city: v })} />
              <FI label="Pincode" value={form.pincode ?? ''} onChange={v => setForm({ ...form, pincode: v })} />
            </div>
            <FI label="Instagram" value={form.social_instagram ?? ''} onChange={v => setForm({ ...form, social_instagram: v })} placeholder="@yoursalon" />
            <FI label="Facebook" value={form.social_facebook ?? ''} onChange={v => setForm({ ...form, social_facebook: v })} placeholder="facebook.com/yoursalon" />
            <FI label="GST Number" value={form.gst_number ?? ''} onChange={v => setForm({ ...form, gst_number: v })} placeholder="Optional" />
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setEditing(false); setErr('') }}
                className="flex-1 py-3 bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/60 hover:text-saloo-dark rounded-xl text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={updateMutation.isPending || uploading}
                className="flex-1 py-3 bg-saloo-pink text-saloo-cream rounded-xl font-syne font-bold text-sm hover:bg-saloo-pink/90 disabled:opacity-40 transition-all">
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            <Row label="Name" value={shop.name} />
            <Row label="Description" value={shop.description || '—'} />
            <Row label="Phone" value={shop.phone ?? '—'} />
            <Row label="Email" value={shop.email ?? '—'} />
            <Row label="Address" value={[shop.address, shop.city, shop.pincode].filter(Boolean).join(', ')} />
            {shop.social_instagram && <Row label="Instagram" value={shop.social_instagram} />}
            {shop.social_facebook && <Row label="Facebook" value={shop.social_facebook} />}
            {shop.gst_number && <Row label="GST" value={shop.gst_number} />}
            <Row label="Status" value={shop.status} />
            <Row label="Rating" value={`${shop.rating > 0 ? Number(shop.rating).toFixed(1) : '—'} (${shop.review_count ?? 0} reviews)`} isLast />
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

function FI({ label, value, onChange, multiline, placeholder }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
          className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm placeholder-saloo-dark/30 focus:outline-none focus:border-saloo-pink/40 transition-colors resize-none" />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm placeholder-saloo-dark/30 focus:outline-none focus:border-saloo-pink/40 transition-colors" />
      )}
    </div>
  )
}

function Row({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div className={`flex justify-between py-3 ${isLast ? '' : 'border-b border-white/[0.06]'}`}>
      <span className="text-saloo-dark/50 text-sm">{label}</span>
      <span className="text-saloo-dark text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}
