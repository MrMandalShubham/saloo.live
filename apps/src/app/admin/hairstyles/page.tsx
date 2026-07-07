'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { FACE_SHAPES, HAIR_TYPES, CUT_KEYWORDS, GENDERS } from '@/lib/hairstyles'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const EMPTY = { id: null as string | null, name: '', description: '', image_url: '', gender: 'men', face_shapes: [] as string[], hair_types: [] as string[], tags: [] as string[], is_active: true, sort_order: 0 }

export default function AdminHairstylesPage() {
  const qc = useQueryClient()
  const supabase = createClient()
  const [form, setForm] = useState<any>({ ...EMPTY })
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: styles = [], isLoading } = useQuery({
    queryKey: ['admin-hairstyles'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/admin-hairstyles-list`, { headers: { Authorization: `Bearer ${await token()}` } })
      return (await res.json()).data ?? []
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/admin-hairstyle-upsert`, {
        method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hairstyles'] }); setShowForm(false); setForm({ ...EMPTY }) },
    onError: (e: Error) => setErr(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${BASE}/functions/v1/admin-hairstyle-delete`, {
        method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-hairstyles'] }),
  })

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setErr('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('hairstyles').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('hairstyles').getPublicUrl(path)
      setForm((f: any) => ({ ...f, image_url: publicUrl }))
    } catch (e: any) { setErr(e.message ?? 'Upload failed') } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const toggle = (field: string, v: string) => setForm((f: any) => ({ ...f, [field]: f[field].includes(v) ? f[field].filter((x: string) => x !== v) : [...f[field], v] }))

  function openEdit(s: any) {
    setForm({ id: s.id, name: s.name, description: s.description ?? '', image_url: s.image_url, gender: s.gender, face_shapes: s.face_shapes ?? [], hair_types: s.hair_types ?? [], tags: s.tags ?? [], is_active: s.is_active, sort_order: s.sort_order ?? 0 })
    setShowForm(true); setErr('')
  }

  const Chips = ({ field, options }: { field: string; options: readonly string[] }) => (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(field, o)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form[field].includes(o) ? 'bg-saloo-pink text-saloo-cream' : 'bg-white/60 border border-white/80 text-saloo-dark/60 hover:bg-white/80'}`}>
          {o}
        </button>
      ))}
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Hairstyles</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">Curate the customer style gallery</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setShowForm(!showForm); setErr('') }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-white/80 text-saloo-dark/80' : 'bg-saloo-pink text-saloo-cream hover:bg-saloo-pink/90'}`}>
          {showForm ? 'Cancel' : '+ Add Hairstyle'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-6 space-y-5">
          {err && <p className="text-red-500 text-sm bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">{err}</p>}

          {/* Image */}
          <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" />
          <div className="flex items-center gap-4">
            {form.image_url ? (
              <img src={form.image_url} alt="" className="w-24 h-32 rounded-xl object-cover border border-white/80" />
            ) : (
              <div className="w-24 h-32 rounded-xl border-2 border-dashed border-saloo-dark/20 flex items-center justify-center text-saloo-dark/30 text-xs">No image</div>
            )}
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2 bg-white/80 border border-white/80 rounded-xl text-sm font-semibold text-saloo-dark/70 disabled:opacity-40">
              {uploading ? 'Uploading…' : form.image_url ? 'Replace photo' : 'Upload photo'}
            </button>
          </div>

          <FI label="Name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
          <FI label="Description" value={form.description} onChange={(v: string) => setForm({ ...form, description: v })} />

          <div>
            <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">Gender</label>
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <button key={g.key} type="button" onClick={() => setForm({ ...form, gender: g.key })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${form.gender === g.key ? 'bg-saloo-pink text-saloo-cream' : 'bg-white/60 border border-white/80 text-saloo-dark/60'}`}>{g.label}</button>
              ))}
            </div>
          </div>

          <div><label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">Face shapes</label><Chips field="face_shapes" options={FACE_SHAPES} /></div>
          <div><label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">Hair types</label><Chips field="hair_types" options={HAIR_TYPES} /></div>
          <div><label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">Cut keywords (barbers matched by these)</label><Chips field="tags" options={CUT_KEYWORDS} /></div>

          <label className="flex items-center gap-2 text-sm text-saloo-dark/70">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-saloo-pink" /> Active (visible to customers)
          </label>

          <button onClick={() => { if (!form.name || !form.image_url) { setErr('Name and image are required'); return } save.mutate() }} disabled={save.isPending || uploading}
            className="w-full py-3 bg-saloo-pink text-saloo-cream rounded-xl font-syne font-bold text-sm disabled:opacity-40">
            {save.isPending ? 'Saving…' : form.id ? 'Save Changes' : 'Add Hairstyle'}
          </button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-white/60 rounded-2xl animate-pulse" />)}</div>
      ) : styles.length === 0 ? (
        <p className="text-saloo-dark/40 text-sm text-center py-16">No hairstyles yet. Add the first one.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {styles.map((s: any) => (
            <div key={s.id} className="bg-white/60 border border-white/80 rounded-2xl overflow-hidden">
              <div className="aspect-[3/4] bg-lavender relative">
                <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                {!s.is_active && <span className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full">hidden</span>}
              </div>
              <div className="p-2.5">
                <p className="text-saloo-dark font-semibold text-xs truncate">{s.name}</p>
                <p className="text-saloo-dark/40 text-[10px] truncate">{(s.tags ?? []).slice(0, 3).join(', ')}</p>
                <div className="flex gap-1 mt-2">
                  <button onClick={() => openEdit(s)} className="flex-1 py-1.5 bg-white/80 text-saloo-dark/70 text-[11px] font-medium rounded-lg">Edit</button>
                  <button onClick={() => { if (confirm('Delete this hairstyle?')) del.mutate(s.id) }} className="px-2 py-1.5 bg-red-500/10 text-red-400 text-[11px] rounded-lg">Del</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FI({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40" />
    </div>
  )
}
