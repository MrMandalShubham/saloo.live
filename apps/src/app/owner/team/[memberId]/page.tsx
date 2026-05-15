export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: { memberId: string }
}

export default async function TeamMemberPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isNew = params.memberId === 'new'

  const member = isNew ? null : await supabase
    .from('barbers')
    .select('*')
    .eq('id', params.memberId)
    .single()
    .then(r => r.data)

  if (!isNew && !member) redirect('/owner/team')

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-syne font-bold text-2xl text-saloo-dark">
          {isNew ? 'Invite Team Member' : 'Edit Member'}
        </h1>
        <p className="text-saloo-dark/60 text-sm mt-1">
          {isNew ? 'Add a barber to your shop' : `Editing: ${member?.name}`}
        </p>
      </div>

      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-saloo-dark/70 text-xs uppercase tracking-wide font-medium">Full Name</label>
          <input
            defaultValue={member?.name ?? ''}
            placeholder="Barber's full name"
            className="w-full bg-white/80 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark placeholder-white/30 text-sm outline-none focus:border-saloo-pink transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-saloo-dark/70 text-xs uppercase tracking-wide font-medium">Phone</label>
          <input
            type="tel"
            defaultValue={member?.phone ?? ''}
            placeholder="10-digit mobile number"
            className="w-full bg-white/80 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark placeholder-white/30 text-sm outline-none focus:border-saloo-pink transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-saloo-dark/70 text-xs uppercase tracking-wide font-medium">Bio (optional)</label>
          <textarea
            defaultValue={member?.bio ?? ''}
            placeholder="Short bio about this barber..."
            rows={3}
            className="w-full bg-white/80 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark placeholder-white/30 text-sm outline-none focus:border-saloo-pink transition-colors resize-none"
          />
        </div>

        {!isNew && (
          <div className="flex items-center justify-between py-3 px-4 bg-white/60 backdrop-blur-md shadow-sm rounded-xl border border-white/[0.06]">
            <div>
              <p className="text-saloo-dark text-sm font-medium">Active</p>
              <p className="text-saloo-dark/50 text-xs mt-0.5">Member can receive bookings</p>
            </div>
            <div className={[
              'w-11 h-6 rounded-full relative transition-colors',
              member?.is_active ? 'bg-saloo-pink' : 'bg-white/20',
            ].join(' ')}>
              <div className={[
                'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
                member?.is_active ? 'left-6' : 'left-1',
              ].join(' ')} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button className="flex-1 bg-saloo-pink text-saloo-cream font-syne font-bold py-3 rounded-xl hover:bg-saloo-pink/90 transition-all active:scale-[0.98] text-sm">
            {isNew ? 'Send Invite' : 'Save Changes'}
          </button>
          <a href="/owner/team" className="px-5 py-3 bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/70 hover:text-saloo-dark rounded-xl text-sm transition-colors">
            Cancel
          </a>
        </div>
      </div>

      {!isNew && (
        <div className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-5">
          <h3 className="font-syne font-semibold text-red-400 text-sm mb-1">Remove Member</h3>
          <p className="text-saloo-dark/50 text-xs mb-4">This will remove them from your shop permanently.</p>
          <button className="px-5 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm hover:bg-red-500/20 transition-colors">
            Remove from Team
          </button>
        </div>
      )}
    </div>
  )
}
