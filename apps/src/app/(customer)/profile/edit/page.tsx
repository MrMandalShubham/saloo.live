export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, email, phone, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="font-syne font-bold text-2xl text-navy">Edit Profile</h1>
        <p className="text-muted text-sm mt-1">Update your personal details</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gold/15 border-2 border-gold/30 flex items-center justify-center shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="font-syne font-bold text-gold text-xl">
              {profile?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>
        <button className="text-gold text-sm font-medium hover:text-gold/80 transition-colors">
          Change photo
        </button>
      </div>

      <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wide">Full Name</label>
          <input
            defaultValue={profile?.name ?? ''}
            placeholder="Your full name"
            className="w-full border border-border rounded-xl px-4 py-3 text-navy text-sm outline-none focus:border-gold transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wide">Email</label>
          <input
            type="email"
            defaultValue={profile?.email ?? user.email ?? ''}
            placeholder="you@example.com"
            className="w-full border border-border rounded-xl px-4 py-3 text-navy text-sm outline-none focus:border-gold transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wide">Phone</label>
          <input
            type="tel"
            defaultValue={profile?.phone ?? ''}
            placeholder="10-digit number"
            className="w-full border border-border rounded-xl px-4 py-3 text-navy text-sm outline-none focus:border-gold transition-colors"
          />
          <p className="text-xs text-muted">Used for booking reminders and OTP</p>
        </div>

        <button className="w-full bg-navy text-gold font-syne font-bold py-3.5 rounded-xl hover:bg-navy/90 transition-all active:scale-[0.98] text-sm mt-2">
          Save Changes
        </button>
      </div>

      <a href="/profile" className="block text-center text-muted text-sm hover:text-navy transition-colors">
        ← Back to Profile
      </a>
    </div>
  )
}
