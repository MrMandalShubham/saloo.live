'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const SPECIALTIES = [
  'Haircut', 'Beard Trim', 'Hair Color', 'Shaving', 'Facial', 'Head Massage',
  'Hair Spa', 'Keratin Treatment', 'Bridal Styling', 'Kids Haircut', 'Dreadlocks', 'Perming',
]

const LANGUAGES = ['Hindi', 'English', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu']

const EXPERIENCE_LEVELS: { key: string; label: string; desc: string }[] = [
  { key: 'junior', label: 'Junior', desc: '0-2 years' },
  { key: 'mid', label: 'Mid', desc: '2-5 years' },
  { key: 'senior', label: 'Senior', desc: '5-10 years' },
  { key: 'master', label: 'Master', desc: '10+ years' },
]

export default function OwnerTeamPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', specialties: '' })
  const [formError, setFormError] = useState('')
  const [selectedBarber, setSelectedBarber] = useState<any>(null)

  // Fetch services for the shop (for barber-service linking)
  const { data: shopServices } = useQuery({
    queryKey: ['owner-services-for-team'],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-services-list`, {
        headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
      })
      const { data } = await res.json()
      return (data ?? []).filter((s: any) => s.is_active && !s.is_addon)
    },
  })

  const { data: team, isLoading } = useQuery({
    queryKey: ['owner-team'],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-team-list`, {
        headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
      })
      const { data } = await res.json()
      return data ?? []
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-team-invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-team'] })
      setShowForm(false)
      setForm({ name: '', phone: '', specialties: '' })
    },
    onError: (e: Error) => setFormError(e.message),
  })

  function handleInvite(e: React.FormEvent) {
    e.preventDefault(); setFormError('')
    if (!form.name || !form.phone) { setFormError('Name and phone required'); return }
    inviteMutation.mutate({
      name: form.name.trim(), phone: form.phone.trim(),
      specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
    })
  }

  if (selectedBarber) {
    return (
      <BarberProfile
        barber={selectedBarber}
        shopServices={shopServices ?? []}
        onBack={() => { setSelectedBarber(null); qc.invalidateQueries({ queryKey: ['owner-team'] }) }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Team</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">Manage your barbers &amp; their profiles</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-white/80 backdrop-blur-md shadow-sm text-saloo-dark/80 hover:bg-white' : 'bg-saloo-pink text-saloo-cream hover:bg-saloo-pink/90'}`}>
          {showForm ? 'Cancel' : '+ Add Barber'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleInvite} className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-6 space-y-5">
          <h2 className="font-syne font-bold text-saloo-dark text-lg">Invite Barber</h2>
          {formError && <p className="text-red-400 text-sm bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">{formError}</p>}
          <FI label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <FI label="Phone (+91…)" value={form.phone} onChange={v => setForm({ ...form, phone: v })} type="tel" />
          <FI label="Specialties (comma separated)" value={form.specialties} onChange={v => setForm({ ...form, specialties: v })} />
          <button type="submit" disabled={inviteMutation.isPending}
            className="w-full py-3 bg-saloo-pink text-saloo-cream rounded-xl font-syne font-bold text-sm hover:bg-saloo-pink/90 disabled:opacity-40">
            {inviteMutation.isPending ? 'Inviting…' : 'Send Invite'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl animate-pulse" />)}
        </div>
      ) : (team ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm border border-white/80 flex items-center justify-center mb-4">
            <span className="text-2xl">💈</span>
          </div>
          <p className="text-saloo-dark/50 text-sm">No team members yet</p>
          <p className="text-saloo-dark/30 text-xs mt-1">Add barbers to start managing your team</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(team ?? []).map((b: any) => (
            <button key={b.id} onClick={() => setSelectedBarber(b)}
              className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/80 transition-all text-left group">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-navy border border-white/80 flex items-center justify-center shrink-0">
                {b.avatar_url ? (
                  <Image src={b.avatar_url} alt={b.name} width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-syne font-bold text-saloo-pink text-lg">{b.name?.[0] ?? '?'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-saloo-dark font-semibold text-sm truncate">{b.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    b.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-400'
                  }`}>{b.is_active ? 'Active' : 'Inactive'}</span>
                  {b.experience_level && b.experience_level !== 'junior' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium capitalize">{b.experience_level}</span>
                  )}
                </div>
                <p className="text-saloo-dark/50 text-xs mt-0.5">{b.phone}</p>
                {b.specialties?.length > 0 && (
                  <p className="text-saloo-pink/60 text-xs mt-0.5 truncate">{b.specialties.join(' · ')}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-saloo-dark/40 text-xs">★ {b.rating?.toFixed(1) ?? 'N/A'}</span>
                  {b.portfolio?.length > 0 && <span className="text-saloo-dark/40 text-xs">📷 {b.portfolio.length}</span>}
                  {b.barber_services?.length > 0 && <span className="text-saloo-dark/40 text-xs">✂️ {b.barber_services.length}</span>}
                </div>
              </div>
              <span className="text-saloo-dark/20 group-hover:text-saloo-pink/60 text-lg transition-colors">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Rich Barber Profile Editor ─── */

function BarberProfile({ barber, shopServices, onBack }: { barber: any; shopServices: any[]; onBack: () => void }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'profile' | 'portfolio' | 'services'>('profile')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Profile state
  const [name, setName] = useState(barber.name ?? '')
  const [phone, setPhone] = useState(barber.phone ?? '')
  const [email, setEmail] = useState(barber.email ?? '')
  const [bio, setBio] = useState(barber.bio ?? '')
  const [specialties, setSpecialties] = useState<string[]>(barber.specialties ?? [])
  const [experienceLevel, setExperienceLevel] = useState(barber.experience_level ?? 'junior')
  const [experienceYears, setExperienceYears] = useState(barber.experience_years ?? 0)
  const [languages, setLanguages] = useState<string[]>(barber.languages ?? [])
  const [instagram, setInstagram] = useState(barber.instagram_handle ?? '')
  const [isActive, setIsActive] = useState(barber.is_active)
  const [avatarUrl, setAvatarUrl] = useState(barber.avatar_url ?? '')

  // Portfolio state
  const [portfolio, setPortfolio] = useState<any[]>(barber.portfolio ?? [])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Services state
  const [linkedServices, setLinkedServices] = useState<string[]>(
    (barber.barber_services ?? []).map((bs: any) => bs.service_id)
  )

  async function saveProfile() {
    setSaving(true); setMsg('')
    try {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-team-update/${barber.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({
          name, phone, email, bio, specialties, experience_level: experienceLevel,
          experience_years: experienceYears, languages, instagram_handle: instagram || null,
          is_active: isActive, avatar_url: avatarUrl || null,
          service_ids: linkedServices,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      setMsg('Profile saved!')
      qc.invalidateQueries({ queryKey: ['owner-team'] })
    } catch (e: any) {
      setMsg(`Error: ${e.message}`)
    } finally { setSaving(false) }
  }

  async function uploadAvatar(file: File) {
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${barber.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('barber-portfolio').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('barber-portfolio').getPublicUrl(path)
      setAvatarUrl(publicUrl)
    } catch (e: any) { setMsg(`Upload error: ${e.message}`) }
  }

  async function uploadPortfolioPhoto(file: File, caption: string, isBeforeAfter: boolean) {
    setUploadingPhoto(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${barber.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('barber-portfolio').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('barber-portfolio').getPublicUrl(path)

      // Save to DB
      const token = await getToken()
      await fetch(`${BASE_URL}/functions/v1/owner-team-update/${barber.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({
          portfolio_add: [{ image_url: publicUrl, caption, is_before_after: isBeforeAfter }],
        }),
      })

      setPortfolio([...portfolio, { id: Date.now().toString(), image_url: publicUrl, caption, is_before_after: isBeforeAfter }])
      qc.invalidateQueries({ queryKey: ['owner-team'] })
    } catch (e: any) { setMsg(`Upload error: ${e.message}`) }
    finally { setUploadingPhoto(false) }
  }

  async function deletePortfolioPhoto(photoId: string) {
    try {
      const token = await getToken()
      await fetch(`${BASE_URL}/functions/v1/owner-team-update/${barber.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({ portfolio_delete: [photoId] }),
      })
      setPortfolio(portfolio.filter(p => p.id !== photoId))
      qc.invalidateQueries({ queryKey: ['owner-team'] })
    } catch (e: any) { setMsg(`Delete error: ${e.message}`) }
  }

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: '👤' },
    { key: 'portfolio' as const, label: 'Portfolio', icon: '📷' },
    { key: 'services' as const, label: 'Services', icon: '✂️' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/60 backdrop-blur-md shadow-sm border border-white/80 flex items-center justify-center text-saloo-dark/60 hover:text-saloo-dark hover:bg-white/80 transition-all">←</button>
        <div className="flex-1">
          <h1 className="font-syne text-xl font-bold text-saloo-dark">{barber.name}</h1>
          <p className="text-saloo-dark/50 text-xs">Edit barber profile</p>
        </div>
        <button onClick={saveProfile} disabled={saving}
          className="px-5 py-2 bg-saloo-pink text-saloo-cream rounded-xl font-syne font-bold text-sm hover:bg-saloo-pink/90 disabled:opacity-40 transition-all">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {msg && (
        <p className={`text-sm px-3 py-2 rounded-lg ${msg.startsWith('Error') ? 'bg-red-400/5 border border-red-400/20 text-red-400' : 'bg-green-400/5 border border-green-400/20 text-green-600'}`}>{msg}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/40 backdrop-blur-md rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === t.key ? 'bg-white shadow-sm text-saloo-dark' : 'text-saloo-dark/40 hover:text-saloo-dark/60'
            }`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'profile' && (
        <ProfileTab
          name={name} setName={setName} phone={phone} setPhone={setPhone}
          email={email} setEmail={setEmail} bio={bio} setBio={setBio}
          specialties={specialties} setSpecialties={setSpecialties}
          experienceLevel={experienceLevel} setExperienceLevel={setExperienceLevel}
          experienceYears={experienceYears} setExperienceYears={setExperienceYears}
          languages={languages} setLanguages={setLanguages}
          instagram={instagram} setInstagram={setInstagram}
          isActive={isActive} setIsActive={setIsActive}
          avatarUrl={avatarUrl} onAvatarUpload={uploadAvatar}
        />
      )}

      {tab === 'portfolio' && (
        <PortfolioTab
          portfolio={portfolio}
          uploading={uploadingPhoto}
          onUpload={uploadPortfolioPhoto}
          onDelete={deletePortfolioPhoto}
        />
      )}

      {tab === 'services' && (
        <ServicesTab
          shopServices={shopServices}
          linkedServices={linkedServices}
          setLinkedServices={setLinkedServices}
        />
      )}
    </div>
  )
}

/* ─── Profile Tab ─── */

function ProfileTab({
  name, setName, phone, setPhone, email, setEmail, bio, setBio,
  specialties, setSpecialties, experienceLevel, setExperienceLevel,
  experienceYears, setExperienceYears, languages, setLanguages,
  instagram, setInstagram, isActive, setIsActive,
  avatarUrl, onAvatarUpload,
}: any) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-5">
      {/* Avatar */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-wider mb-3">Profile Photo</p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-navy border-2 border-white/80 flex items-center justify-center shrink-0 cursor-pointer"
            onClick={() => fileRef.current?.click()}>
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">📷</span>
            )}
          </div>
          <div>
            <button onClick={() => fileRef.current?.click()}
              className="text-sm text-saloo-pink font-semibold hover:underline">Upload photo</button>
            <p className="text-saloo-dark/30 text-xs mt-1">JPG, PNG, WebP · Max 5MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) onAvatarUpload(e.target.files[0]) }} />
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5 space-y-4">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-wider">Basic Info</p>
        <FI label="Name" value={name} onChange={setName} />
        <FI label="Phone" value={phone} onChange={setPhone} type="tel" />
        <FI label="Email" value={email} onChange={setEmail} type="email" />
        <FI label="Instagram Handle" value={instagram} onChange={setInstagram} placeholder="@username" />
        <div>
          <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm placeholder-saloo-dark/20 focus:outline-none focus:border-saloo-pink/40 transition-colors resize-none"
            placeholder="Tell customers about this barber…" />
        </div>
        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-saloo-dark">Active Status</span>
          <button onClick={() => setIsActive(!isActive)}
            className={`w-12 h-7 rounded-full transition-all relative ${isActive ? 'bg-green-500' : 'bg-saloo-dark/20'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-1 transition-all ${isActive ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* Experience */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5 space-y-4">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-wider">Experience</p>
        <div className="grid grid-cols-2 gap-2">
          {EXPERIENCE_LEVELS.map(l => (
            <button key={l.key} onClick={() => setExperienceLevel(l.key)}
              className={`px-3 py-2.5 rounded-xl text-left border transition-all ${
                experienceLevel === l.key
                  ? 'border-saloo-pink bg-saloo-pink/5 text-saloo-dark'
                  : 'border-white/80 bg-white/40 text-saloo-dark/50 hover:bg-white/60'
              }`}>
              <p className="text-sm font-semibold">{l.label}</p>
              <p className="text-xs opacity-60">{l.desc}</p>
            </button>
          ))}
        </div>
        <FI label="Years of Experience" value={String(experienceYears)} onChange={v => setExperienceYears(Number(v) || 0)} type="number" />
      </div>

      {/* Specialties */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5 space-y-3">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-wider">Specialties</p>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map(s => {
            const active = specialties.includes(s)
            return (
              <button key={s} onClick={() => setSpecialties(active ? specialties.filter((x: string) => x !== s) : [...specialties, s])}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active ? 'bg-saloo-pink/10 text-saloo-pink border border-saloo-pink/30' : 'bg-white/60 text-saloo-dark/40 border border-white/80 hover:bg-white/80'
                }`}>{s}</button>
            )
          })}
        </div>
      </div>

      {/* Languages */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5 space-y-3">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-wider">Languages</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(l => {
            const active = languages.includes(l)
            return (
              <button key={l} onClick={() => setLanguages(active ? languages.filter((x: string) => x !== l) : [...languages, l])}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30' : 'bg-white/60 text-saloo-dark/40 border border-white/80 hover:bg-white/80'
                }`}>{l}</button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Portfolio Tab ─── */

function PortfolioTab({ portfolio, uploading, onUpload, onDelete }: {
  portfolio: any[]; uploading: boolean; onUpload: (file: File, caption: string, isBA: boolean) => void; onDelete: (id: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [caption, setCaption] = useState('')
  const [isBeforeAfter, setIsBeforeAfter] = useState(false)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreviewFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  function handleUpload() {
    if (previewFile) {
      onUpload(previewFile, caption, isBeforeAfter)
      setPreviewFile(null); setPreviewUrl(''); setCaption(''); setIsBeforeAfter(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5 space-y-4">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-wider">Add Photo</p>

        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden aspect-[4/3]">
              <Image src={previewUrl} alt="Preview" fill className="object-cover" />
            </div>
            <FI label="Caption (optional)" value={caption} onChange={setCaption} placeholder="e.g. Fresh fade haircut" />
            <div className="flex items-center gap-3">
              <button onClick={() => setIsBeforeAfter(!isBeforeAfter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isBeforeAfter ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' : 'bg-white/60 text-saloo-dark/40 border border-white/80'
                }`}>Before/After</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPreviewFile(null); setPreviewUrl('') }}
                className="flex-1 py-2.5 rounded-xl bg-white/60 border border-white/80 text-saloo-dark/60 text-sm font-semibold">Cancel</button>
              <button onClick={handleUpload} disabled={uploading}
                className="flex-1 py-2.5 rounded-xl bg-saloo-pink text-saloo-cream text-sm font-bold disabled:opacity-40">
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-10 rounded-xl border-2 border-dashed border-saloo-dark/10 text-center hover:border-saloo-pink/30 transition-colors">
            <span className="text-2xl block mb-2">📷</span>
            <span className="text-sm text-saloo-dark/40">Tap to add photo</span>
            <span className="text-xs text-saloo-dark/25 block mt-0.5">Show off happy customers &amp; best work</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Gallery */}
      {portfolio.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {portfolio.map((p: any) => (
            <div key={p.id} className="relative rounded-xl overflow-hidden aspect-square bg-white/60 border border-white/80 group">
              <Image src={p.image_url} alt={p.caption ?? 'Portfolio'} fill className="object-cover" />
              {p.is_before_after && (
                <span className="absolute top-2 left-2 bg-amber-500/90 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">B/A</span>
              )}
              {p.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">{p.caption}</p>
                </div>
              )}
              <button onClick={() => onDelete(p.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-saloo-dark/30 text-sm">No portfolio photos yet</p>
          <p className="text-saloo-dark/20 text-xs mt-1">Upload pics of your best work to attract customers</p>
        </div>
      )}
    </div>
  )
}

/* ─── Services Tab ─── */

function ServicesTab({ shopServices, linkedServices, setLinkedServices }: {
  shopServices: any[]; linkedServices: string[]; setLinkedServices: (ids: string[]) => void
}) {
  const toggle = (id: string) => {
    setLinkedServices(
      linkedServices.includes(id)
        ? linkedServices.filter(s => s !== id)
        : [...linkedServices, id]
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5">
        <p className="text-saloo-dark/50 text-xs uppercase tracking-wider mb-1">Link Services</p>
        <p className="text-saloo-dark/30 text-xs mb-4">Select which services this barber provides. Customers will see this on the barber&apos;s profile.</p>

        {shopServices.length === 0 ? (
          <p className="text-saloo-dark/30 text-sm text-center py-6">No services found. Add services in the Services tab first.</p>
        ) : (
          <div className="space-y-2">
            {shopServices.map((s: any) => {
              const linked = linkedServices.includes(s.id)
              return (
                <button key={s.id} onClick={() => toggle(s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    linked ? 'border-saloo-pink/30 bg-saloo-pink/5' : 'border-white/80 bg-white/40 hover:bg-white/60'
                  }`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    linked ? 'border-saloo-pink bg-saloo-pink' : 'border-saloo-dark/15'
                  }`}>
                    {linked && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-saloo-dark">{s.name}</p>
                    <p className="text-xs text-saloo-dark/40">{s.category} · {s.duration_min} min · ₹{s.price}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-center text-saloo-dark/25 text-xs">Don&apos;t forget to click Save after selecting services</p>
    </div>
  )
}

/* ─── Form Input ─── */

function FI({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm placeholder-saloo-dark/20 focus:outline-none focus:border-saloo-pink/40 transition-colors" />
    </div>
  )
}
