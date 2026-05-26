export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatINR } from '@saloo/lib'

export default async function BookingConfirmationPage() {
  const supabase = await createClient()

  let booking: any = null
  let services: any[] = []
  let barber: any = null
  let payment: any = null

  try {
    const { data } = await supabase
      .from('bookings')
      .select(`
        id, booking_ref, date, start_time, end_time,
        status, total_amount, advance_amount, instructions,
        service_ids, addon_ids, barber_id,
        shop:shops(name, address, phone)
      `)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    booking = data

    if (booking) {
      // Fetch services, barber, payment in parallel
      const [svcRes, barberRes, payRes] = await Promise.all([
        supabase
          .from('services')
          .select('id, name, price, duration_min, is_addon')
          .in('id', [...(booking.service_ids ?? []), ...(booking.addon_ids ?? [])]),
        booking.barber_id
          ? supabase.from('barbers').select('name, avatar_url').eq('id', booking.barber_id).single()
          : Promise.resolve({ data: null }),
        supabase
          .from('payments')
          .select('amount, method, status, razorpay_payment_id, created_at')
          .eq('booking_id', booking.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
      ])
      services = svcRes.data ?? []
      barber = barberRes.data
      payment = payRes.data
    }
  } catch {}

  const shop = Array.isArray(booking?.shop) ? booking?.shop[0] : booking?.shop

  // Format date nicely
  const formatBookingDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Format time
  const formatTimeStr = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hr = h % 12 || 12
    return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
  }

  const mainServices = services.filter(s => !s.is_addon)
  const addons = services.filter(s => s.is_addon)
  const totalDuration = mainServices.reduce((sum, s) => sum + s.duration_min, 0)

  return (
    <div className="max-w-md mx-auto pb-24 md:pb-8 py-6">

      {/* Success header */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-syne text-2xl font-bold text-navy">Payment Successful!</h1>
        <p className="text-gray-500 text-sm mt-1">Waiting for barber confirmation</p>
      </div>

      {/* Pending confirmation banner */}
      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl mt-0.5">⏳</span>
        <div>
          <p className="font-semibold text-amber-800 text-sm">Booking Pending</p>
          <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
            Your payment is done. The barber will confirm your appointment shortly. You&apos;ll receive a notification once confirmed.
          </p>
        </div>
      </div>

      {booking && (
        <>
          {/* ── Booking Ticket Card ── */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

            {/* Ticket header with ref */}
            <div className="bg-gradient-to-r from-[#008B7D] to-[#00A89D] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-[10px] uppercase tracking-widest font-medium">Booking ID</p>
                  <p className="text-white font-syne font-bold text-lg tracking-wider">{booking.booking_ref}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <p className="text-white text-xs font-semibold uppercase tracking-wide">
                    {booking.status === 'pending_confirmation' ? '⏳ Pending' : booking.status === 'confirmed' ? '✅ Confirmed' : booking.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Dashed separator with notch effect */}
            <div className="relative">
              <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-zinc-50" />
              <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-zinc-50" />
              <div className="border-t-2 border-dashed border-gray-200 mx-6" />
            </div>

            {/* Shop & appointment info */}
            <div className="px-5 py-4 space-y-4">

              {/* Shop name */}
              {shop && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-saloo-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-saloo-teal text-lg">✂</span>
                  </div>
                  <div>
                    <p className="font-syne font-bold text-navy">{shop.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{shop.address}</p>
                  </div>
                </div>
              )}

              {/* Date, Time, Barber grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-[10px] uppercase tracking-widest font-medium mb-1">Date</p>
                  <p className="text-navy font-semibold text-sm">{formatBookingDate(booking.date)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-[10px] uppercase tracking-widest font-medium mb-1">Time</p>
                  <p className="text-navy font-semibold text-sm">
                    {formatTimeStr(booking.start_time)} — {formatTimeStr(booking.end_time)}
                  </p>
                  <p className="text-gray-400 text-xs">{totalDuration} min</p>
                </div>
              </div>

              {/* Barber */}
              {barber && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-9 h-9 rounded-full bg-saloo-teal/15 border border-saloo-teal/30 flex items-center justify-center">
                    <span className="font-syne font-bold text-saloo-teal text-sm">
                      {barber.name?.[0]?.toUpperCase() ?? 'B'}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase tracking-widest font-medium">Your Barber</p>
                    <p className="text-navy font-semibold text-sm">{barber.name}</p>
                  </div>
                </div>
              )}

              {/* Services */}
              <div>
                <p className="text-gray-400 text-[10px] uppercase tracking-widest font-medium mb-2">Services</p>
                <div className="space-y-2">
                  {mainServices.map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                      <span className="text-sm text-navy">{s.name}</span>
                      <span className="text-sm font-medium text-navy">{formatINR(s.price)}</span>
                    </div>
                  ))}
                  {addons.map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">+ {s.name}</span>
                      <span className="text-sm text-gray-500">{formatINR(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special instructions */}
              {booking.instructions && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-amber-700 text-[10px] uppercase tracking-widest font-medium mb-1">Special Instructions</p>
                  <p className="text-amber-800 text-sm">{booking.instructions}</p>
                </div>
              )}
            </div>

            {/* Dashed separator */}
            <div className="relative">
              <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-zinc-50" />
              <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-zinc-50" />
              <div className="border-t-2 border-dashed border-gray-200 mx-6" />
            </div>

            {/* Payment summary */}
            <div className="px-5 py-4 space-y-2">
              <p className="text-gray-400 text-[10px] uppercase tracking-widest font-medium">Payment Summary</p>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-medium text-navy">{formatINR(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">Advance Paid</span>
                <span className="font-semibold text-emerald-600">- {formatINR(booking.advance_amount)}</span>
              </div>
              <div className="border-t border-gray-100 my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Balance (pay at shop)</span>
                <span className="font-bold text-navy text-base">
                  {formatINR(booking.total_amount - booking.advance_amount)}
                </span>
              </div>

              {payment && (
                <div className="flex items-center gap-2 mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-emerald-700 text-xs font-medium">
                    Payment successful via {payment.method === 'razorpay' ? 'Razorpay' : payment.method ?? 'Online'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* What happens next */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
            <p className="font-semibold text-blue-800 text-sm flex items-center gap-2">
              <span>💡</span> What happens next?
            </p>
            <ul className="text-blue-700 text-sm space-y-1.5 ml-6">
              <li>You will receive a confirmation notification</li>
              <li>A reminder will be sent 1 hour before</li>
              <li>Arrive on time — walk straight to the chair!</li>
              <li>Pay the remaining balance ({formatINR(booking.total_amount - booking.advance_amount)}) at the shop</li>
            </ul>
          </div>

          {/* Contact shop */}
          {shop?.phone && (
            <a
              href={`tel:${shop.phone}`}
              className="mt-3 flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-2xl py-3 text-sm text-navy font-medium hover:bg-gray-50 transition-colors"
            >
              <span>📞</span> Call Shop
            </a>
          )}
        </>
      )}

      {/* Action buttons */}
      <div className="mt-6 space-y-3">
        <Link
          href="/bookings"
          className="block w-full bg-saloo-teal text-white font-syne font-bold py-4 rounded-2xl hover:bg-saloo-teal/90 transition-colors text-center text-base"
        >
          View My Bookings
        </Link>
        <Link href="/home" className="block text-center text-sm text-gray-400 hover:text-navy transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
