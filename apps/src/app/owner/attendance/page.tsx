'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const fmtHrs = (mins: number) => {
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

export default function OwnerAttendancePage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['owner-attendance'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/owner-attendance-list`, { headers: { Authorization: `Bearer ${await token()}` } })
      return (await res.json()).data
    },
    refetchInterval: 30000,
  })

  const toggle = useMutation({
    mutationFn: async (barberId: string) => {
      const res = await fetch(`${BASE}/functions/v1/owner-attendance-toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ barber_id: barberId }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-attendance'] }),
    onError: (e: Error) => alert(e.message),
  })

  const barbers = data?.barbers ?? []
  const clockedIn = barbers.filter((b: any) => b.clocked_in).length

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-syne text-2xl font-bold text-saloo-dark">Attendance</h1>
        <p className="text-saloo-dark/50 text-sm mt-0.5">{clockedIn} of {barbers.length} clocked in today</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 bg-white/60 border border-white/80 rounded-2xl animate-pulse" />)}</div>
      ) : barbers.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-10 text-center">
          <p className="text-saloo-dark/40 text-sm">No active barbers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {barbers.map((b: any) => (
            <div key={b.barber_id} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-4 flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.clocked_in ? 'bg-green-500 animate-pulse' : 'bg-saloo-dark/20'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-saloo-dark">{b.name}</p>
                <p className="text-saloo-dark/50 text-xs mt-0.5">
                  {b.clocked_in ? `In since ${fmtTime(b.clock_in_at)} · ` : ''}
                  Today {fmtHrs(b.today_minutes)} · Week {fmtHrs(b.week_minutes)}
                </p>
              </div>
              <button
                onClick={() => toggle.mutate(b.barber_id)}
                disabled={toggle.isPending}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 ${
                  b.clocked_in ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/15 text-green-600 hover:bg-green-500/25'
                }`}
              >
                {b.clocked_in ? 'Clock Out' : 'Clock In'}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-saloo-dark/40 text-xs">Clocking in marks the chair available; clocking out marks it offline.</p>
    </div>
  )
}
