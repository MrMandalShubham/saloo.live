'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR, formatDate, formatTime, next7Days } from '@saloo/lib'
import Script from 'next/script'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']
const ANON = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
const STEPS = ['Service', 'Barber', 'Date & Time', 'Review & Pay'] as const

async function getSession() {
  const { data: { session } } = await createClient().auth.getSession()
  return session
}

async function fetchShop(id: string) {
  const session = await getSession()
  const res = await fetch(`${BASE}/functions/v1/shops-get/${id}`, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: ANON },
  })
  const json = await res.json()
  return json.data
}

async function fetchAvailability(shopId: string, date: string, barberId?: string) {
  const session = await getSession()
  const params = new URLSearchParams({ date, ...(barberId && { barber_id: barberId }) })
  const res = await fetch(`${BASE}/functions/v1/shops-availability/${shopId}?${params}`, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: ANON },
  })
  const json = await res.json()
  return { slots: json.data?.slots ?? [], is_closed: json.data?.is_closed ?? false }
}

export default function BookingFlowPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(0)
  const [prefilled, setPrefilled] = useState(false)
  const [selectedServices, setSelectedServices] = useState<any[]>([])
  const [selectedBarber, setSelectedBarber] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<any>(null) // full slot object
  const [instructions, setInstructions] = useState('')
  const [readyBy, setReadyBy] = useState('') // "get ready by" target time (HH:MM)
  const [holding, setHolding] = useState(false)
  const [paying, setPaying] = useState(false)
  const [holdData, setHoldData] = useState<any>(null)
  const [promos, setPromos] = useState<any[]>([])
  const [promo, setPromo] = useState<any>(null)
  const [err, setErr] = useState('')
  const [showAuthPopup, setShowAuthPopup] = useState(false)

  const { data: shop } = useQuery({ queryKey: ['shop', shopId], queryFn: () => fetchShop(shopId) })
  const days = next7Days()

  const { data: availData, isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', shopId, selectedDate, selectedBarber?.id],
    queryFn: () => fetchAvailability(shopId, selectedDate, selectedBarber?.id),
    enabled: !!selectedDate && step >= 2,
  })
  const slots = availData?.slots ?? []
  const isDayClosed = availData?.is_closed ?? false

  const services = (shop?.services ?? []).filter((s: any) => !s.is_addon)
  const addons = (shop?.services ?? []).filter((s: any) => s.is_addon)
  const barbers = shop?.barbers ?? []
  const total = selectedServices.reduce((sum: number, s: any) => sum + Number(s.price), 0)
  const totalDuration = selectedServices.filter((s: any) => !s.is_addon).reduce((sum: number, s: any) => sum + s.duration_min, 0)

  // "Get ready by" — qualify slots whose service finishes by the target time
  const toMin = (t: string) => { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m }
  const readyByMin = readyBy ? toMin(readyBy) : null
  const slotQualifies = (s: any) => readyByMin == null ? true : (toMin(s.start_time) + totalDuration) <= readyByMin
  const bestReadySlot = readyByMin == null ? null
    : [...slots].filter((s: any) => (s.is_available ?? s.available) && slotQualifies(s))
        .sort((a: any, b: any) => toMin(b.start_time) - toMin(a.start_time))[0] ?? null

  const toggleService = (svc: any) =>
    setSelectedServices(prev => prev.find(s => s.id === svc.id)
      ? prev.filter(s => s.id !== svc.id)
      : [...prev, svc]
    )

  // ── Pre-fill from query params: "repeat my last cut" (services+barber) or favourite barber ──
  useEffect(() => {
    if (prefilled || !shop) return
    const isRepeat = searchParams.get('repeat') === '1'
    const wantBarber = searchParams.get('barber')
    if (!isRepeat && !wantBarber) return

    const wantIds = (searchParams.get('services') ?? '').split(',').filter(Boolean)
    const matched = (shop.services ?? []).filter((s: any) => wantIds.includes(s.id))
    if (matched.length > 0) setSelectedServices(matched)

    if (wantBarber) {
      const b = (shop.barbers ?? []).find((x: any) => x.id === wantBarber)
      if (b) setSelectedBarber(b)
    }

    // Repeat with known services → jump to Date & Time; barber-only → start at services
    if (isRepeat && matched.length > 0) setStep(2)
    setPrefilled(true)
  }, [shop, prefilled, searchParams])

  const handleHold = async () => {
    if (!selectedSlot) return
    // Guest gate: require auth before Review & Pay
    const session = await getSession()
    if (!session) {
      setShowAuthPopup(true)
      return
    }
    setHolding(true); setErr('')
    try {
      const session = await getSession()
      // If "Any barber", pick the first available barber from the slot
      let barberId = selectedBarber?.id
      if (!barberId) {
        const available = selectedSlot.available_barbers
        if (!available?.length) throw new Error('No barbers available for this slot')
        barberId = available[0]
      }

      const mainIds = selectedServices.filter(s => !s.is_addon).map((s: any) => s.id)
      const addonIds = selectedServices.filter(s => s.is_addon).map((s: any) => s.id)

      const res = await fetch(`${BASE}/functions/v1/bookings-hold`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json', apikey: ANON },
        body: JSON.stringify({
          shop_id: shopId,
          barber_id: barberId,
          service_ids: mainIds,
          addon_ids: addonIds,
          date: selectedDate,
          start_time: selectedSlot.start_time,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      setHoldData({ ...json.data, barber_id: barberId })
      setStep(3)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setHolding(false)
    }
  }

  const handlePay = async () => {
    setPaying(true); setErr('')
    try {
      const session = await getSession()
      const orderRes = await fetch(`${BASE}/functions/v1/payments-create-order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json', apikey: ANON },
        body: JSON.stringify({ hold_id: holdData.hold_id }),
      })
      const orderData = await orderRes.json()
      if (orderData.error) throw new Error(orderData.error.message ?? orderData.error)

      const { razorpay_order_id, amount, key_id, dev_mode } = orderData.data

      // Dev mode: skip Razorpay popup, auto-confirm
      const Razorpay = (window as any).Razorpay
      if (dev_mode || !Razorpay) {
        await confirmBooking(razorpay_order_id, `pay_demo_${Date.now()}`, 'demo_sig', session?.access_token)
        return
      }

      const rzp = new Razorpay({
        key: key_id,
        amount: String(amount),
        currency: 'INR',
        order_id: razorpay_order_id,
        name: 'Saloo',
        description: `Booking at ${shop?.name}`,
        image: '/icons/icon-192x192.png',
        prefill: {
          name: session?.user?.user_metadata?.full_name ?? '',
          email: session?.user?.email ?? '',
          contact: session?.user?.user_metadata?.phone ?? '',
        },
        theme: { color: '#008B7D' },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI',
                instruments: [
                  { method: 'upi', flows: ['qr', 'collect', 'intent'] },
                ],
              },
              other: {
                name: 'Other Methods',
                instruments: [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' },
                ],
              },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (payment: any) => {
          await confirmBooking(
            payment.razorpay_order_id,
            payment.razorpay_payment_id,
            payment.razorpay_signature,
            session?.access_token
          )
        },
        modal: {
          ondismiss: () => setPaying(false),
          confirm_close: true,
        },
      })
      rzp.open()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setPaying(false)
    }
  }

  // Fetch eligible offers when entering Review & Pay, auto-apply the best
  useEffect(() => {
    if (step !== 3 || !holdData) return
    const run = async () => {
      const session = await getSession()
      const mainIds = selectedServices.filter(s => !s.is_addon).map((s: any) => s.id)
      const addonIds = selectedServices.filter(s => s.is_addon).map((s: any) => s.id)
      const res = await fetch(`${BASE}/functions/v1/promotions-eligible`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json', apikey: ANON },
        body: JSON.stringify({ shop_id: shopId, service_ids: [...mainIds, ...addonIds], total: holdData.total_amount, start_time: selectedSlot?.start_time }),
      })
      const json = await res.json()
      setPromos(json.data?.promos ?? [])
      setPromo(json.data?.best ?? null)
    }
    run().catch(() => null)
  }, [step, holdData])

  const confirmBooking = async (orderId: string, paymentId: string, sig: string, token?: string) => {
    const session = await getSession()
    const res = await fetch(`${BASE}/functions/v1/payments-verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? token}`, 'Content-Type': 'application/json', apikey: ANON },
      body: JSON.stringify({
        hold_id: holdData.hold_id,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig,
        instructions: instructions || undefined,
        promo_id: promo?.id ?? undefined,
      }),
    })
    const json = await res.json()
    if (json.error) throw new Error(json.error.message ?? json.error)
    router.push(`/book/${shopId}/confirmation`)
  }

  // Find barber name by ID
  const getBarberName = (id: string) => barbers.find((b: any) => b.id === id)?.name ?? 'Assigned Barber'

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-6">
        {/* Progress steps */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-saloo-teal text-navy' : 'bg-gray-200 text-gray-500'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="text-[10px] text-gray-500 hidden sm:block truncate">{s}</span>
              </div>
              <div className={`h-1 rounded-full mt-2 ${i < step ? 'bg-green-500' : i === step ? 'bg-saloo-teal' : 'bg-gray-200'}`} />
            </div>
          ))}
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">{err}</div>
        )}

        {/* ═══ STEP 0: Services ═══ */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm">
            <h2 className="font-syne font-bold text-xl text-navy">Choose Services</h2>
            {services.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No services available</p>
            ) : (
              <div className="divide-y divide-border">
                {services.map((svc: any) => {
                  const selected = selectedServices.some(s => s.id === svc.id)
                  return (
                    <button key={svc.id} onClick={() => toggleService(svc)}
                      className={`w-full flex items-center justify-between py-3.5 text-left transition-colors ${selected ? 'text-navy' : 'text-gray-700'}`}>
                      <div>
                        <p className="font-medium">{svc.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{svc.duration_min} min</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-syne font-bold">{formatINR(svc.price)}</span>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selected ? 'bg-saloo-teal border-saloo-teal' : 'border-gray-300'
                        }`}>
                          {selected && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            {addons.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-3">Add-ons</p>
                <div className="divide-y divide-border">
                  {addons.map((a: any) => {
                    const selected = selectedServices.some(s => s.id === a.id)
                    return (
                      <button key={a.id} onClick={() => toggleService(a)}
                        className="w-full flex items-center justify-between py-2.5 text-left">
                        <p className="text-sm text-gray-600">+ {a.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">+{formatINR(a.price)}</span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            selected ? 'bg-saloo-teal border-saloo-teal' : 'border-gray-300'
                          }`}>
                            {selected && <span className="text-white text-[10px]">✓</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Summary */}
            {selectedServices.length > 0 && (
              <div className="bg-saloo-teal/5 rounded-xl p-3 flex justify-between items-center text-sm">
                <span className="text-gray-600">{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} · ~{totalDuration} min</span>
                <span className="font-syne font-bold text-navy">{formatINR(total)}</span>
              </div>
            )}
            <button onClick={() => setStep(1)} disabled={selectedServices.length === 0}
              className="w-full bg-saloo-teal text-navy font-syne font-bold py-3.5 rounded-xl disabled:opacity-40 hover:bg-saloo-teal/90 transition-colors">
              Continue — {formatINR(total)}
            </button>
            <button onClick={() => router.push(`/book/${shopId}/group`)}
              className="w-full text-center text-sm text-gray-500 hover:text-saloo-teal transition-colors py-1">
              👥 Booking for multiple people? <span className="font-semibold">Group booking →</span>
            </button>
          </div>
        )}

        {/* ═══ STEP 1: Barber ═══ */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm">
            <h2 className="font-syne font-bold text-xl text-navy">Choose Barber</h2>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setSelectedBarber(null); setSelectedDate(''); setSelectedSlot(null); setStep(2) }}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-saloo-teal/30 bg-saloo-teal/5 hover:bg-saloo-teal/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-saloo-teal/20 flex items-center justify-center text-lg shrink-0">⚡</div>
                <div className="text-left min-w-0">
                  <p className="font-semibold text-navy text-sm">First Available</p>
                  <p className="text-xs text-gray-400">Soonest slot</p>
                </div>
              </button>
              <button
                onClick={() => {
                  const best = [...barbers].sort((a: any, b: any) => (b.rating ?? b.avg_rating ?? 0) - (a.rating ?? a.avg_rating ?? 0))[0]
                  if (best) { setSelectedBarber(best); setSelectedDate(''); setSelectedSlot(null); setStep(2) }
                }}
                disabled={barbers.length === 0}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-gold/40 bg-gold/5 hover:bg-gold/10 transition-colors disabled:opacity-40">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-lg shrink-0">⭐</div>
                <div className="text-left min-w-0">
                  <p className="font-semibold text-navy text-sm">Best Rated</p>
                  <p className="text-xs text-gray-400">Top barber</p>
                </div>
              </button>
            </div>
            {barbers.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No barbers added yet</p>
            )}
            {barbers.map((b: any) => (
              <button key={b.id}
                onClick={() => { setSelectedBarber(b); setSelectedDate(''); setSelectedSlot(null); setStep(2) }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-saloo-teal/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-saloo-teal/20 flex items-center justify-center text-xl">✂️</div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-navy">{b.name}</p>
                  {(b.rating ?? b.avg_rating) > 0 && <p className="text-sm text-gray-400">⭐ {Number(b.rating ?? b.avg_rating).toFixed(1)}</p>}
                </div>
              </button>
            ))}
            <button onClick={() => setStep(0)} className="text-sm text-gray-500 hover:text-navy transition-colors">
              ← Back to services
            </button>
          </div>
        )}

        {/* ═══ STEP 2: Date & Time ═══ */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-5 shadow-sm">
            <h2 className="font-syne font-bold text-xl text-navy">Select Date & Time</h2>

            {/* Date picker */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {days.map((d: string) => {
                const dt = new Date(d)
                return (
                  <button key={d}
                    onClick={() => { setSelectedDate(d); setSelectedSlot(null) }}
                    className={`shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border font-medium transition-all ${
                      selectedDate === d ? 'bg-saloo-teal border-saloo-teal text-navy shadow-sm' : 'bg-white border-border text-gray-600 hover:border-saloo-teal/50'
                    }`}>
                    <span className="text-xs">{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                    <span className="text-lg font-syne font-bold">{dt.getDate()}</span>
                    <span className="text-xs">{dt.toLocaleDateString('en-IN', { month: 'short' })}</span>
                  </button>
                )
              })}
            </div>

            {/* Get ready by */}
            {selectedDate && (
              <div className="bg-gold/5 border border-gold/30 rounded-xl p-3 flex items-center gap-3">
                <span className="text-lg">⏰</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy">Need to be ready by a time?</p>
                  <p className="text-xs text-gray-400">We'll find the latest slot that finishes in time</p>
                </div>
                <input type="time" value={readyBy} onChange={e => setReadyBy(e.target.value)}
                  className="bg-white border border-border rounded-lg px-2 py-1.5 text-sm text-navy focus:outline-none focus:border-gold" />
                {readyBy && (
                  <button onClick={() => { if (bestReadySlot) setSelectedSlot(bestReadySlot) }} disabled={!bestReadySlot}
                    className="text-xs font-bold bg-gold/20 text-amber-700 px-2.5 py-1.5 rounded-lg disabled:opacity-40">
                    {bestReadySlot ? 'Pick best' : 'None fit'}
                  </button>
                )}
              </div>
            )}

            {/* Time slots */}
            {selectedDate && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Available Slots
                  {selectedBarber && <span className="font-normal text-gray-400"> · {selectedBarber.name}</span>}
                  {readyBy && bestReadySlot && <span className="font-normal text-amber-600"> · ready by {readyBy}</span>}
                </p>
                {slotsLoading ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-8">
                    {isDayClosed ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                          <span className="text-xl">🚫</span>
                        </div>
                        <p className="text-red-400 font-semibold text-sm">Shop is closed on this day</p>
                        <p className="text-gray-300 text-xs mt-1">Please select another date to book</p>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-400 text-sm">No slots available for this day</p>
                        <p className="text-gray-300 text-xs mt-1">Try another date or barber</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {slots.map((s: any) => {
                      const available = s.is_available ?? s.available
                      const isSelected = selectedSlot?.start_time === s.start_time
                      const isBest = bestReadySlot?.start_time === s.start_time
                      const dimmed = readyByMin != null && available && !slotQualifies(s)
                      return (
                        <button key={s.start_time} disabled={!available}
                          onClick={() => setSelectedSlot(s)}
                          className={`py-2.5 px-1 rounded-xl text-xs font-medium border transition-all relative ${
                            isSelected
                              ? 'bg-saloo-teal border-saloo-teal text-navy shadow-sm'
                              : !available
                                ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed line-through'
                                : isBest
                                  ? 'bg-gold/15 border-gold text-amber-700 ring-1 ring-gold'
                                  : dimmed
                                    ? 'bg-white border-border text-gray-300'
                                    : s.is_popular
                                      ? 'bg-amber-50 border-amber-200 text-amber-700 hover:border-saloo-teal/50'
                                      : 'bg-white border-border text-gray-700 hover:border-saloo-teal/50'
                          }`}>
                          {formatTime(s.start_time)}
                          {isBest && !isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 bg-gold text-navy text-[7px] font-bold px-1 py-0.5 rounded-full leading-none">BEST</span>
                          )}
                          {s.is_popular && available && !isSelected && !isBest && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
                {slots.some((s: any) => s.is_popular && (s.is_available ?? s.available)) && (
                  <p className="text-[10px] text-amber-500 mt-2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-amber-400 rounded-full inline-block" /> Popular hours — book early
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-border py-3 rounded-xl text-sm font-medium text-gray-600 hover:border-saloo-teal/50 transition-colors">
                ← Back
              </button>
              <button onClick={handleHold} disabled={!selectedDate || !selectedSlot || holding}
                className="flex-1 bg-saloo-teal text-navy font-syne font-bold py-3 rounded-xl disabled:opacity-40 hover:bg-saloo-teal/90 transition-colors">
                {holding ? 'Reserving...' : 'Hold Slot →'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Review & Pay ═══ */}
        {step === 3 && holdData && (
          <div className="space-y-4">
            <SlotTimer expiresAt={holdData.expires_at} onExpire={() => { setErr('Slot hold expired. Please try again.'); setStep(2); setHoldData(null); setSelectedSlot(null) }} />

            <div className="bg-white rounded-2xl border border-border p-6 space-y-5 shadow-sm">
              <h2 className="font-syne font-bold text-xl text-navy">Review & Pay</h2>

              <div className="space-y-2.5">
                {[
                  { label: 'Shop', value: shop?.name },
                  { label: 'Barber', value: selectedBarber?.name ?? getBarberName(holdData.barber_id) },
                  { label: 'Date', value: formatDate(selectedDate) },
                  { label: 'Time', value: `${formatTime(selectedSlot?.start_time)} – ${formatTime(holdData.end_time)}` },
                  { label: 'Duration', value: `${holdData.total_duration_min} min` },
                  { label: 'Services', value: selectedServices.map(s => s.name).join(', ') },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-medium text-navy text-right max-w-[60%]">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Offers */}
              {promos.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Offers</p>
                  <div className="space-y-2">
                    {promos.map((p: any) => (
                      <button key={p.id} onClick={() => setPromo(promo?.id === p.id ? null : p)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          promo?.id === p.id ? 'border-saloo-teal bg-saloo-teal/5' : 'border-border hover:border-saloo-teal/40'
                        }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎁</span>
                          <div>
                            <p className="text-sm font-semibold text-navy">{p.title}</p>
                            <p className="text-xs text-green-600 font-medium">Save {formatINR(p.discount)}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${promo?.id === p.id ? 'bg-saloo-teal border-saloo-teal' : 'border-gray-300'}`}>
                          {promo?.id === p.id && <span className="text-white text-[10px]">✓</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Service total</span>
                  <span className="font-medium">{formatINR(holdData.total_amount)}</span>
                </div>
                {promo && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Offer · {promo.title}</span>
                    <span className="text-green-600 font-medium">− {formatINR(promo.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Advance ({shop?.advance_percentage ?? 10}%)</span>
                  <span className="font-syne font-bold text-saloo-teal text-lg">{formatINR(holdData.advance_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Pay at shop</span>
                  <span className="text-gray-600">{formatINR(Math.max(0, holdData.total_amount - holdData.advance_amount - (promo?.discount ?? 0)))}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Special Instructions <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
                  placeholder="Any specific style, reference, or request for your barber..."
                  rows={3} maxLength={300}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-saloo-teal/50 resize-none transition-colors" />
              </div>

              <button onClick={handlePay} disabled={paying}
                className="w-full bg-saloo-teal text-navy font-syne font-bold py-4 rounded-xl hover:bg-saloo-teal/90 transition-colors disabled:opacity-50 text-lg">
                {paying ? 'Processing...' : `Pay ${formatINR(holdData.advance_amount)} Now`}
              </button>
              <p className="text-center text-xs text-gray-400">
                Powered by Razorpay · 100% secure
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Auth-required popup for guests */}
      {showAuthPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-saloo-teal/15 flex items-center justify-center mx-auto">
              <span className="text-3xl">✂</span>
            </div>
            <h3 className="font-syne font-bold text-xl text-navy">Almost there!</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Create your Saloo profile to complete the booking. It only takes a minute!
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/book/${shopId}`)}`)}
                className="w-full bg-saloo-teal text-white font-syne font-bold py-3 rounded-xl hover:bg-saloo-teal/90 transition-colors text-base"
              >
                Create Profile
              </button>
              <button
                onClick={() => setShowAuthPopup(false)}
                className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition-colors"
              >
                Continue browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SlotTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState(300)

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime()
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) { clearInterval(interval); onExpire() }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  const m = Math.floor(timeLeft / 60)
  const s = timeLeft % 60
  const urgent = timeLeft < 60

  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 border ${urgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <span className="text-2xl">⏱</span>
      <div>
        <p className={`font-bold text-sm ${urgent ? 'text-red-700' : 'text-amber-800'}`}>
          Slot reserved — {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </p>
        <p className={`text-xs ${urgent ? 'text-red-500' : 'text-amber-600'}`}>
          {urgent ? 'Hurry! Your hold is about to expire' : 'Complete payment to confirm your booking'}
        </p>
      </div>
    </div>
  )
}
