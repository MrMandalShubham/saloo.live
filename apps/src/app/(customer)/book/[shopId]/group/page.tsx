'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR, formatTime, next7Days } from '@saloo/lib'
import Script from 'next/script'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']
const ANON = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

async function getSession() {
  const { data: { session } } = await createClient().auth.getSession()
  return session
}
async function api(path: string, body: any) {
  const session = await getSession()
  const res = await fetch(`${BASE}/functions/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify(body),
  })
  return res.json()
}

type Member = { label: string; service_ids: string[] }

export default function GroupBookingPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState<any>(null)
  const [members, setMembers] = useState<Member[]>([{ label: 'You', service_ids: [] }])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const days = next7Days()

  const { data: shop } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: async () => {
      const session = await getSession()
      const res = await fetch(`${BASE}/functions/v1/shops-get/${shopId}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: ANON } })
      return (await res.json()).data
    },
  })

  const { data: availData, isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', shopId, date],
    queryFn: async () => {
      const session = await getSession()
      const res = await fetch(`${BASE}/functions/v1/shops-availability/${shopId}?date=${date}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: ANON } })
      const j = await res.json()
      return { slots: j.data?.slots ?? [] }
    },
    enabled: !!date && step === 0,
  })

  const services = (shop?.services ?? []).filter((s: any) => !s.is_addon)
  const barberCount = (shop?.barbers ?? []).length
  const slots = availData?.slots ?? []

  const priceOf = (ids: string[]) => ids.reduce((s, id) => s + (services.find((x: any) => x.id === id)?.price ?? 0), 0)
  const groupTotal = members.reduce((s, m) => s + priceOf(m.service_ids), 0)

  function toggleSvc(mi: number, sid: string) {
    setMembers(ms => ms.map((m, i) => i !== mi ? m : {
      ...m, service_ids: m.service_ids.includes(sid) ? m.service_ids.filter(x => x !== sid) : [...m.service_ids, sid],
    }))
  }
  function addMember() {
    if (members.length >= Math.min(6, barberCount)) return
    setMembers(ms => [...ms, { label: `Member ${ms.length + 1}`, service_ids: [] }])
  }
  function removeMember(i: number) { setMembers(ms => ms.filter((_, idx) => idx !== i)) }

  async function payAndBook() {
    setBusy(true); setErr('')
    try {
      // 1. Hold all slots
      const holdRes = await api('group-hold', { shop_id: shopId, date, start_time: slot.start_time, members })
      if (holdRes.error) throw new Error(holdRes.error.message ?? holdRes.error)
      const { group_id, holds } = holdRes.data

      // 2. One order for the total advance
      const orderRes = await api('group-create-order', { hold_ids: holds.map((h: any) => h.hold_id) })
      if (orderRes.error) throw new Error(orderRes.error.message ?? orderRes.error)
      const { razorpay_order_id, amount, key_id, dev_mode } = orderRes.data

      const finish = (paymentId: string, sig: string) =>
        api('group-verify', { group_id, holds, razorpay_order_id, razorpay_payment_id: paymentId, razorpay_signature: sig })
          .then((v: any) => { if (v.error) throw new Error(v.error.message ?? v.error); router.push('/bookings') })

      const Razorpay = (window as any).Razorpay
      if (dev_mode || !Razorpay) { await finish(`pay_demo_${Date.now()}`, 'demo_sig'); return }

      const rzp = new Razorpay({
        key: key_id, amount: String(amount), currency: 'INR', order_id: razorpay_order_id,
        name: 'Saloo', description: `Group booking · ${members.length} people`,
        theme: { color: '#008B7D' },
        handler: (p: any) => finish(p.razorpay_payment_id, p.razorpay_signature).catch((e: any) => setErr(e.message)),
        modal: { ondismiss: () => setBusy(false) },
      })
      rzp.open()
    } catch (e: any) {
      setErr(e.message); setBusy(false)
    }
  }

  const maxSize = Math.min(6, barberCount || 1)

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="max-w-2xl mx-auto space-y-5 py-6 pb-24">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-2xl text-gray-400 hover:text-navy">‹</button>
          <div>
            <h1 className="font-syne text-xl font-bold text-navy">Group Booking</h1>
            <p className="text-muted text-xs">{shop?.name} · up to {maxSize} people</p>
          </div>
        </div>

        {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">{err}</div>}

        {/* Step 0: date & time */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-5">
            <h2 className="font-syne font-bold text-lg text-navy">When?</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {days.map((d: string) => {
                const dt = new Date(d)
                return (
                  <button key={d} onClick={() => { setDate(d); setSlot(null) }}
                    className={`shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border font-medium transition-all ${date === d ? 'bg-saloo-teal border-saloo-teal text-navy' : 'bg-white border-border text-gray-600'}`}>
                    <span className="text-xs">{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                    <span className="text-lg font-syne font-bold">{dt.getDate()}</span>
                  </button>
                )
              })}
            </div>
            {date && (slotsLoading ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slots.filter((s: any) => (s.is_available ?? s.available)).map((s: any) => (
                  <button key={s.start_time} onClick={() => setSlot(s)}
                    className={`py-2.5 rounded-xl text-xs font-medium border ${slot?.start_time === s.start_time ? 'bg-saloo-teal border-saloo-teal text-navy' : 'bg-white border-border text-gray-700 hover:border-saloo-teal/50'}`}>
                    {formatTime(s.start_time)}
                  </button>
                ))}
              </div>
            ))}
            <button onClick={() => setStep(1)} disabled={!date || !slot}
              className="w-full bg-saloo-teal text-navy font-syne font-bold py-3 rounded-xl disabled:opacity-40 hover:bg-saloo-teal/90 transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* Step 1: members */}
        {step === 1 && (
          <div className="space-y-4">
            {members.map((m, mi) => (
              <div key={mi} className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <input value={m.label} onChange={e => setMembers(ms => ms.map((x, i) => i === mi ? { ...x, label: e.target.value } : x))}
                    className="flex-1 font-semibold text-navy bg-transparent border-b border-border focus:outline-none focus:border-saloo-teal py-1" />
                  {members.length > 1 && <button onClick={() => removeMember(mi)} className="text-red-400 text-sm">Remove</button>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {services.map((s: any) => (
                    <button key={s.id} onClick={() => toggleSvc(mi, s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${m.service_ids.includes(s.id) ? 'bg-saloo-teal/15 border-saloo-teal/50 text-navy' : 'bg-white border-border text-gray-500'}`}>
                      {s.name} · {formatINR(s.price)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {members.length < maxSize && (
              <button onClick={addMember} className="w-full py-3 border-2 border-dashed border-saloo-teal/30 text-saloo-teal rounded-xl text-sm font-bold hover:bg-saloo-teal/5">
                + Add person ({members.length}/{maxSize})
              </button>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 border border-border py-3 rounded-xl text-sm text-gray-600">← Back</button>
              <button onClick={() => setStep(2)} disabled={members.some(m => m.service_ids.length === 0)}
                className="flex-1 bg-saloo-teal text-navy font-syne font-bold py-3 rounded-xl disabled:opacity-40">Review</button>
            </div>
          </div>
        )}

        {/* Step 2: review & pay */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
            <h2 className="font-syne font-bold text-lg text-navy">Review & Pay</h2>
            <p className="text-sm text-muted">{date} · {formatTime(slot.start_time)} · {members.length} people</p>
            <div className="divide-y divide-border">
              {members.map((m, i) => (
                <div key={i} className="flex justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-navy">{m.label}</p>
                    <p className="text-xs text-muted">{m.service_ids.map(id => services.find((s: any) => s.id === id)?.name).filter(Boolean).join(', ')}</p>
                  </div>
                  <span className="font-semibold text-navy">{formatINR(priceOf(m.service_ids))}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <span className="font-syne font-bold text-navy">Group total</span>
              <span className="font-syne font-bold text-navy">{formatINR(groupTotal)}</span>
            </div>
            <p className="text-xs text-muted">Each person is assigned a free barber automatically. One advance covers the group.</p>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 border border-border py-3 rounded-xl text-sm text-gray-600">← Back</button>
              <button onClick={payAndBook} disabled={busy}
                className="flex-1 bg-saloo-teal text-navy font-syne font-bold py-3 rounded-xl disabled:opacity-50">
                {busy ? 'Processing…' : 'Pay Advance'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
