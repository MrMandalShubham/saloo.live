'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR, formatDate, formatTime, next7Days } from '@saloo/lib'
import Script from 'next/script'

const STEPS = ['Service', 'Barber', 'Date & Time', 'Review & Pay'] as const

async function fetchShop(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/shops-get/${id}`,
    { headers: { Authorization: `Bearer ${session?.access_token}` } }
  )
  const json = await res.json()
  return json.data
}

async function fetchAvailability(shopId: string, date: string, barberId?: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const params = new URLSearchParams({ shop_id: shopId, date, ...(barberId && { barber_id: barberId }) })
  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/shops-availability?${params}`,
    { headers: { Authorization: `Bearer ${session?.access_token}` } }
  )
  const json = await res.json()
  return json.data?.slots ?? []
}

export default function BookingFlowPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [selectedServices, setSelectedServices] = useState<any[]>([])
  const [selectedBarber, setSelectedBarber] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [instructions, setInstructions] = useState('')
  const [holding, setHolding] = useState(false)
  const [paying, setPaying] = useState(false)
  const [holdData, setHoldData] = useState<any>(null)

  const { data: shop } = useQuery({ queryKey: ['shop', shopId], queryFn: () => fetchShop(shopId) })
  const days = next7Days()

  const { data: slots = [] } = useQuery({
    queryKey: ['availability', shopId, selectedDate, selectedBarber?.id],
    queryFn: () => fetchAvailability(shopId, selectedDate, selectedBarber?.id),
    enabled: !!selectedDate && step >= 2,
  })

  const services = (shop?.services ?? []).filter((s: any) => !s.is_addon)
  const addons = (shop?.services ?? []).filter((s: any) => s.is_addon)
  const total = selectedServices.reduce((sum: number, s: any) => sum + s.price, 0)

  const toggleService = (svc: any) =>
    setSelectedServices(prev => prev.find(s => s.id === svc.id)
      ? prev.filter(s => s.id !== svc.id)
      : [...prev, svc]
    )

  const handleHold = async () => {
    setHolding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/bookings-hold`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_id: shopId,
            barber_id: selectedBarber?.id,
            service_ids: selectedServices.map(s => s.id),
            date: selectedDate,
            start_time: selectedSlot,
          }),
        }
      )
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setHoldData(json.data)
      setStep(3)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setHolding(false)
    }
  }

  const handlePay = async () => {
    setPaying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const orderRes = await fetch(
        `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/payments-create-order`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ hold_id: holdData.hold_id }),
        }
      )
      const orderData = await orderRes.json()
      if (orderData.error) throw new Error(orderData.error.message)

      const { razorpay_order_id, amount, key_id } = orderData.data

      const Razorpay = (window as any).Razorpay
      if (!Razorpay) {
        // Dev fallback: simulate success
        await confirmBooking(razorpay_order_id, 'dev_pay', 'dev_sig', session?.access_token)
        return
      }

      const rzp = new Razorpay({
        key: key_id,
        amount: String(amount),
        currency: 'INR',
        order_id: razorpay_order_id,
        name: 'Saloo',
        description: `Booking at ${shop?.name}`,
        theme: { color: '#C9A84C' },
        handler: async (payment: any) => {
          await confirmBooking(
            payment.razorpay_order_id,
            payment.razorpay_payment_id,
            payment.razorpay_signature,
            session?.access_token
          )
        },
      })
      rzp.open()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setPaying(false)
    }
  }

  const confirmBooking = async (orderId: string, paymentId: string, sig: string, token?: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/payments-verify`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hold_id: holdData.hold_id,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: sig,
          instructions: instructions || undefined,
        }),
      }
    )
    const json = await res.json()
    if (json.error) throw new Error(json.error.message)
    router.push(`/book/${shopId}/confirmation`)
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
        {/* Progress */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step ? 'bg-success text-white' : i === step ? 'bg-saloo-teal text-navy' : 'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-[10px] text-gray-500 hidden sm:block">{s}</span>
            </div>
          ))}
        </div>

        {/* Step 0: Services */}
        {step === 0 && (
          <div className="bg-white rounded-card p-6 space-y-4">
            <h2 className="font-syne font-bold text-xl text-navy">Choose Services</h2>
            <div className="divide-y divide-border">
              {services.map((svc: any) => {
                const selected = selectedServices.some(s => s.id === svc.id)
                return (
                  <button
                    key={svc.id}
                    onClick={() => toggleService(svc)}
                    className={`w-full flex items-center justify-between py-3 text-left transition-colors ${
                      selected ? 'text-navy' : 'text-gray-700'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{svc.name}</p>
                      <p className="text-sm text-gray-400">{svc.duration_min} min</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-syne font-bold">{formatINR(svc.price)}</span>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selected ? 'bg-saloo-teal border-saloo-teal' : 'border-gray-300'
                      }`}>
                        {selected && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            {addons.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-3">Add-ons</p>
                <div className="divide-y divide-border">
                  {addons.map((a: any) => {
                    const selected = selectedServices.some(s => s.id === a.id)
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleService(a)}
                        className="w-full flex items-center justify-between py-2 text-left"
                      >
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
            <button
              onClick={() => setStep(1)}
              disabled={selectedServices.length === 0}
              className="w-full bg-saloo-teal text-navy font-syne font-bold py-3 rounded-xl disabled:opacity-40 hover:bg-saloo-teal/90 transition-colors"
            >
              Continue — {formatINR(total)}
            </button>
          </div>
        )}

        {/* Step 1: Barber */}
        {step === 1 && (
          <div className="bg-white rounded-card p-6 space-y-4">
            <h2 className="font-syne font-bold text-xl text-navy">Choose Barber</h2>
            <button
              onClick={() => { setSelectedBarber(null); setStep(2) }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                !selectedBarber ? 'border-saloo-teal bg-saloo-teal/5' : 'border-border hover:border-saloo-teal/50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-saloo-teal/20 flex items-center justify-center text-xl">⚡</div>
              <div className="text-left">
                <p className="font-medium text-navy">Any (Fastest)</p>
                <p className="text-sm text-gray-400">Best available barber</p>
              </div>
            </button>
            {(shop?.barbers ?? []).map((b: any) => (
              <button
                key={b.id}
                onClick={() => { setSelectedBarber(b); setStep(2) }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  selectedBarber?.id === b.id ? 'border-saloo-teal bg-saloo-teal/5' : 'border-border hover:border-saloo-teal/50'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-saloo-teal/20 flex items-center justify-center text-xl">✂️</div>
                <div className="text-left flex-1">
                  <p className="font-medium text-navy">{b.name}</p>
                  {b.avg_rating > 0 && <p className="text-sm text-gray-400">⭐ {b.avg_rating.toFixed(1)}</p>}
                </div>
              </button>
            ))}
            <button onClick={() => setStep(0)} className="text-sm text-gray-500 hover:text-navy underline">
              ← Back
            </button>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="bg-white rounded-card p-6 space-y-5">
            <h2 className="font-syne font-bold text-xl text-navy">Select Date & Time</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map(d => (
                <button
                  key={d}
                  onClick={() => { setSelectedDate(d); setSelectedSlot('') }}
                  className={`shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border font-medium transition-colors ${
                    selectedDate === d ? 'bg-saloo-teal border-saloo-teal text-navy' : 'bg-white border-border text-gray-600 hover:border-saloo-teal/50'
                  }`}
                >
                  <span className="text-xs">{new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span className="text-lg font-syne font-bold">{new Date(d).getDate()}</span>
                  <span className="text-xs">{new Date(d).toLocaleDateString('en-IN', { month: 'short' })}</span>
                </button>
              ))}
            </div>
            {selectedDate && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Available Slots</p>
                {slots.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No slots available for this day.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {slots.map((s: any) => (
                      <button
                        key={s.start_time}
                        disabled={!s.available}
                        onClick={() => setSelectedSlot(s.start_time)}
                        className={`py-2 px-1 rounded-lg text-xs font-medium border transition-colors ${
                          selectedSlot === s.start_time
                            ? 'bg-saloo-teal border-saloo-teal text-navy'
                            : !s.available
                              ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                              : 'bg-white border-border text-gray-700 hover:border-saloo-teal/50'
                        }`}
                      >
                        {formatTime(s.start_time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 border border-border py-3 rounded-xl text-sm font-medium text-gray-600 hover:border-saloo-teal/50">
                ← Back
              </button>
              <button
                onClick={handleHold}
                disabled={!selectedDate || !selectedSlot || holding}
                className="flex-1 bg-saloo-teal text-navy font-syne font-bold py-3 rounded-xl disabled:opacity-40 hover:bg-saloo-teal/90 transition-colors"
              >
                {holding ? 'Holding...' : 'Hold Slot →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Pay */}
        {step === 3 && holdData && (
          <div className="space-y-4">
            {/* Timer */}
            <SlotTimer expiresAt={holdData.expires_at} onExpire={() => router.push(`/shop/${shopId}`)} />

            <div className="bg-white rounded-card p-6 space-y-4">
              <h2 className="font-syne font-bold text-xl text-navy">Review & Pay</h2>
              <div className="space-y-2">
                {[
                  { label: 'Shop', value: shop?.name },
                  { label: 'Barber', value: selectedBarber?.name ?? 'Any (Fastest)' },
                  { label: 'Date', value: formatDate(selectedDate) },
                  { label: 'Time', value: formatTime(selectedSlot) },
                  { label: 'Services', value: selectedServices.map(s => s.name).join(', ') },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-medium text-navy text-right max-w-[60%]">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Service total</span>
                  <span className="font-medium">{formatINR(holdData.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Advance (30%)</span>
                  <span className="font-syne font-bold text-saloo-teal">{formatINR(holdData.advance_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Due at shop</span>
                  <span className="text-gray-600">{formatINR(holdData.total_amount - holdData.advance_amount)}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Instructions (optional)</label>
                <textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="Any special requests for your barber..."
                  rows={3}
                  maxLength={300}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
                />
              </div>
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full bg-saloo-teal text-navy font-syne font-bold py-4 rounded-xl hover:bg-saloo-teal/90 transition-colors disabled:opacity-50"
              >
                {paying ? 'Processing...' : `Pay ${formatINR(holdData.advance_amount)} Now →`}
              </button>
              <p className="text-center text-xs text-gray-400">
                Powered by Razorpay · 100% secure · PCI-DSS compliant
              </p>
            </div>
          </div>
        )}
      </div>
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

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex items-center gap-3">
      <span className="text-2xl">⏱</span>
      <div>
        <p className="font-semibold text-amber-800 text-sm">
          Slot reserved — {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </p>
        <p className="text-amber-600 text-xs">Complete payment to confirm your booking</p>
      </div>
    </div>
  )
}
