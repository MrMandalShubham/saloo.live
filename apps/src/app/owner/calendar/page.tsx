'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const STATUS_COLOR: Record<string, string> = {
  pending_confirmation: 'border-l-orange-400 bg-orange-50',
  confirmed: 'border-l-blue-400 bg-blue-50',
  in_chair: 'border-l-purple-400 bg-purple-50',
  completed: 'border-l-green-400 bg-green-50',
  no_show: 'border-l-red-400 bg-red-50',
}

const istToday = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]!
const addDays = (d: string, n: number) => {
  const dt = new Date(d + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().split('T')[0]!
}
const fmtTime = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'; const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}

export default function OwnerCalendarPage() {
  const [date, setDate] = useState(istToday())

  const { data, isLoading } = useQuery({
    queryKey: ['owner-calendar', date],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/owner-calendar-get?date=${date}`, { headers: { Authorization: `Bearer ${await token()}` } })
      return (await res.json()).data
    },
  })

  const columns = data?.columns ?? []
  const unassigned = data?.unassigned ?? []
  const dateObj = new Date(date + 'T00:00:00Z')
  const isToday = date === istToday()

  return (
    <div className="max-w-6xl space-y-5">
      {/* Header + date nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Calendar</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">{data?.total ?? 0} appointment{(data?.total ?? 0) !== 1 ? 's' : ''} · per barber</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(addDays(date, -1))} className="w-9 h-9 rounded-xl bg-white/60 border border-white/80 text-saloo-dark hover:bg-white transition-colors">‹</button>
          <div className="text-center min-w-[130px]">
            <p className="font-semibold text-saloo-dark text-sm">{dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            {!isToday && <button onClick={() => setDate(istToday())} className="text-saloo-pink text-xs hover:underline">Jump to today</button>}
            {isToday && <p className="text-saloo-teal text-xs font-medium">Today</p>}
          </div>
          <button onClick={() => setDate(addDays(date, 1))} className="w-9 h-9 rounded-xl bg-white/60 border border-white/80 text-saloo-dark hover:bg-white transition-colors">›</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto">{[1, 2, 3].map(i => <div key={i} className="w-64 h-96 bg-white/60 border border-white/80 rounded-2xl animate-pulse shrink-0" />)}</div>
      ) : columns.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-10 text-center">
          <p className="text-saloo-dark/40 text-sm">No active barbers. Add barbers in Team.</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((col: any) => (
            <div key={col.barber_id} className="w-64 shrink-0 bg-white/40 backdrop-blur-md border border-white/80 rounded-2xl overflow-hidden">
              {/* Column header */}
              <div className="px-4 py-3 border-b border-white/60 bg-white/50 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.clocked_in ? 'bg-green-500' : 'bg-saloo-dark/20'}`} title={col.clocked_in ? 'Clocked in' : 'Not clocked in'} />
                <p className="font-semibold text-saloo-dark text-sm flex-1 truncate">{col.name}</p>
                <span className="text-saloo-dark/40 text-xs">{col.bookings.length}</span>
              </div>
              {/* Appointments */}
              <div className="p-2 space-y-2 min-h-[120px]">
                {col.bookings.length === 0 ? (
                  <p className="text-saloo-dark/30 text-xs text-center py-6">No appointments</p>
                ) : col.bookings.map((b: any) => (
                  <Link key={b.id} href={`/owner/bookings/${b.id}`}
                    className={`block rounded-lg border-l-4 p-2.5 hover:shadow-sm transition-shadow ${STATUS_COLOR[b.status] ?? 'border-l-gray-300 bg-gray-50'}`}>
                    <p className="text-xs font-bold text-saloo-dark">{fmtTime(b.start_time)} – {fmtTime(b.end_time)}</p>
                    <p className="text-sm text-saloo-dark font-medium truncate mt-0.5">{b.customer_name}</p>
                    <p className="text-[11px] text-saloo-dark/50 truncate">{b.services.join(', ')}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Unassigned column */}
          {unassigned.length > 0 && (
            <div className="w-64 shrink-0 bg-amber-50/60 backdrop-blur-md border border-amber-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-200 bg-amber-100/50">
                <p className="font-semibold text-amber-800 text-sm">Any barber</p>
              </div>
              <div className="p-2 space-y-2">
                {unassigned.map((b: any) => (
                  <Link key={b.id} href={`/owner/bookings/${b.id}`}
                    className={`block rounded-lg border-l-4 p-2.5 ${STATUS_COLOR[b.status] ?? 'border-l-gray-300 bg-white'}`}>
                    <p className="text-xs font-bold text-saloo-dark">{fmtTime(b.start_time)} – {fmtTime(b.end_time)}</p>
                    <p className="text-sm text-saloo-dark font-medium truncate mt-0.5">{b.customer_name}</p>
                    <p className="text-[11px] text-saloo-dark/50 truncate">{b.services.join(', ')}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-saloo-dark/40 text-xs">Tap an appointment to manage it. Green dot = barber clocked in.</p>
    </div>
  )
}
