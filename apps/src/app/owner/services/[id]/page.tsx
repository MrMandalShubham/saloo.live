export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: { id: string }
}

export default async function ServiceDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isNew = params.id === 'new'

  const service = isNew ? null : await supabase
    .from('services')
    .select('*')
    .eq('id', params.id)
    .single()
    .then(r => r.data)

  if (!isNew && !service) redirect('/owner/services')

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-syne font-bold text-2xl text-white">
          {isNew ? 'Add Service' : 'Edit Service'}
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {isNew ? 'Create a new service for your shop' : `Editing: ${service?.name}`}
        </p>
      </div>

      <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-white/50 text-xs uppercase tracking-wide font-medium">Service Name</label>
          <input
            defaultValue={service?.name ?? ''}
            placeholder="e.g. Classic Haircut"
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-gold transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-white/50 text-xs uppercase tracking-wide font-medium">Category</label>
            <select
              defaultValue={service?.category ?? 'hair'}
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gold transition-colors"
            >
              {['hair', 'beard', 'skin', 'combo', 'kids'].map(c => (
                <option key={c} value={c} className="bg-navy capitalize">{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-white/50 text-xs uppercase tracking-wide font-medium">Duration (min)</label>
            <select
              defaultValue={service?.duration_min ?? 30}
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gold transition-colors"
            >
              {[15, 30, 45, 60, 90].map(d => (
                <option key={d} value={d} className="bg-navy">{d} min</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-white/50 text-xs uppercase tracking-wide font-medium">Price (₹)</label>
          <input
            type="number"
            defaultValue={service?.price ?? ''}
            placeholder="299"
            min={0}
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-gold transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-white/50 text-xs uppercase tracking-wide font-medium">Description (optional)</label>
          <textarea
            defaultValue={service?.description ?? ''}
            placeholder="Brief description of the service..."
            rows={3}
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-gold transition-colors resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button className="flex-1 bg-gold text-navy font-syne font-bold py-3 rounded-xl hover:bg-gold/90 transition-all active:scale-[0.98] text-sm">
            {isNew ? 'Create Service' : 'Save Changes'}
          </button>
          <a href="/owner/services" className="px-5 py-3 bg-white/[0.06] text-white/50 hover:text-white rounded-xl text-sm transition-colors">
            Cancel
          </a>
        </div>
      </div>
    </div>
  )
}
