'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const FADE = [
  { v: 'none', l: 'No fade' }, { v: 'low', l: 'Low' }, { v: 'mid', l: 'Mid' },
  { v: 'high', l: 'High' }, { v: 'skin', l: 'Skin' },
]
const BEARD = [
  { v: 'clean', l: 'Clean' }, { v: 'stubble', l: 'Stubble' }, { v: 'short', l: 'Short' },
  { v: 'medium', l: 'Medium' }, { v: 'long', l: 'Long' }, { v: 'goatee', l: 'Goatee' },
]
const NECK = [
  { v: 'rounded', l: 'Rounded' }, { v: 'squared', l: 'Squared' }, { v: 'tapered', l: 'Tapered' },
]
const TOP = [
  { v: 'short', l: 'Short' }, { v: 'medium', l: 'Medium' }, { v: 'long', l: 'Long' }, { v: 'textured', l: 'Textured' },
]
const TALK = [
  { v: 'silent', l: '🤫 Silent cut' }, { v: 'casual', l: '💬 Casual chat' }, { v: 'consult', l: '💈 Style consult' },
]

export default function CutProfilePage() {
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()
  const [form, setForm] = useState<any>({})
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['grooming'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { profile: null, photos: [] }
      setUserId(session.user.id)
      const [{ data: profile }, { data: photos }] = await Promise.all([
        (supabase as any).from('grooming_profiles').select('*').eq('user_id', session.user.id).maybeSingle(),
        (supabase as any).from('cut_photos').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      ])
      return { profile, photos: photos ?? [] }
    },
  })

  useEffect(() => { if (data?.profile) setForm(data.profile) }, [data?.profile])

  async function save() {
    if (!userId) return
    const payload = { user_id: userId, ...form, updated_at: new Date().toISOString() }
    await (supabase as any).from('grooming_profiles').upsert(payload)
    setSaved(true); setTimeout(() => setSaved(false), 2500)
    qc.invalidateQueries({ queryKey: ['grooming'] })
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('cut-photos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('cut-photos').getPublicUrl(path)
      await (supabase as any).from('cut_photos').insert({ user_id: userId, image_url: publicUrl })
      qc.invalidateQueries({ queryKey: ['grooming'] })
    } catch (err: any) {
      alert(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function deletePhoto(id: string) {
    if (!confirm('Delete this photo?')) return
    await (supabase as any).from('cut_photos').delete().eq('id', id)
    qc.invalidateQueries({ queryKey: ['grooming'] })
  }

  const photos = data?.photos ?? []

  const Chips = ({ field, options }: { field: string; options: { v: string; l: string }[] }) => (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.v} type="button"
          onClick={() => setForm((f: any) => ({ ...f, [field]: f[field] === o.v ? null : o.v }))}
          className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
            form[field] === o.v ? 'bg-saloo-teal/15 border-saloo-teal/50 text-navy' : 'bg-white border-border text-gray-500 hover:border-saloo-teal/40'
          }`}>
          {o.l}
        </button>
      ))}
    </div>
  )

  if (isLoading) {
    return <div className="max-w-2xl mx-auto py-6 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-border rounded-2xl animate-pulse" />)}</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 py-6 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-2xl text-gray-400 hover:text-navy">‹</button>
        <div>
          <h1 className="font-syne text-xl font-bold text-navy">My Cut</h1>
          <p className="text-muted text-xs">Your barber sees this when you book</p>
        </div>
      </div>

      {saved && <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm font-medium">✓ Saved</div>}

      {/* Preferences */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-5">
        <Field label="Fade level"><Chips field="fade_level" options={FADE} /></Field>
        <Field label="Sides guard #"><input value={form.guard_number ?? ''} onChange={e => setForm({ ...form, guard_number: e.target.value })} placeholder="e.g. 2, 3, scissor" className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-saloo-teal/50" /></Field>
        <Field label="Top length"><Chips field="top_length" options={TOP} /></Field>
        <Field label="Neckline"><Chips field="neckline" options={NECK} /></Field>
        <Field label="Beard"><Chips field="beard_style" options={BEARD} /></Field>
        <Field label="Conversation"><Chips field="talk_level" options={TALK} /></Field>
        <Field label="Style notes">
          <textarea value={form.style_notes ?? ''} onChange={e => setForm({ ...form, style_notes: e.target.value })} rows={2} placeholder="Anything your barber should know…" className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-saloo-teal/50 resize-none" />
        </Field>
        <Field label="Allergies / sensitivities">
          <input value={form.allergy_notes ?? ''} onChange={e => setForm({ ...form, allergy_notes: e.target.value })} placeholder="e.g. sensitive to certain gels" className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-saloo-teal/50" />
        </Field>
        <button onClick={save} className="w-full bg-saloo-teal text-navy font-syne font-bold py-3 rounded-xl hover:bg-saloo-teal/90 transition-colors">Save Preferences</button>
      </div>

      {/* Cut photos */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <p className="font-syne font-bold text-navy">Saved Cut Photos</p>
          <p className="text-muted text-xs mt-0.5">Save looks you love to show your barber</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p: any) => (
            <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden group">
              <img src={p.image_url} alt={p.caption ?? 'Cut'} className="w-full h-full object-cover" />
              <button onClick={() => deletePhoto(p.id)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
            </div>
          ))}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-saloo-teal/30 flex flex-col items-center justify-center text-saloo-teal/60 hover:border-saloo-teal/50 transition-colors disabled:opacity-40">
            {uploading ? <span className="text-xs">…</span> : (<><span className="text-2xl">＋</span><span className="text-[10px] mt-0.5">Add</span></>)}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted uppercase tracking-wider font-bold">{label}</label>
      {children}
    </div>
  )
}
