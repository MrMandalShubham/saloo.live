export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function BookingConfirmationPage() {
  const supabase = await createClient()

  let latestBooking = null
  try {
    const { data } = await supabase
      .from('bookings')
      .select('booking_ref, date, start_time, shop:shops(name)')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    latestBooking = data
  } catch {}

  const shopName = Array.isArray(latestBooking?.shop) ? (latestBooking?.shop as any[])[0]?.name : (latestBooking?.shop as any)?.name

  return (
    <div className="max-w-md mx-auto space-y-6 py-12 text-center">
      <div className="bg-success-light w-24 h-24 rounded-full flex items-center justify-center mx-auto text-5xl">
        ✓
      </div>
      <h1 className="font-syne text-3xl font-bold text-navy">Booking Confirmed!</h1>
      <p className="text-gray-500">Your slot is locked. See you there!</p>

      {latestBooking && (
        <div className="bg-white rounded-card p-6 text-left space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Booking Ref</span>
            <span className="font-syne font-bold text-gold">{latestBooking.booking_ref}</span>
          </div>
          {shopName && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Shop</span>
              <span className="font-medium text-navy">{shopName}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-success-light rounded-card p-4 text-left space-y-1">
        <p className="font-semibold text-success text-sm">What happens next?</p>
        <p className="text-success text-sm">
          {"• You'll receive a confirmation SMS and WhatsApp message"}<br />
          {"• A reminder will be sent 1 hour before your appointment"}<br />
          {"• Arrive on time — walk straight to the chair!"}
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href="/bookings"
          className="block w-full bg-navy text-white font-syne font-bold py-4 rounded-2xl hover:bg-navy/90 transition-colors"
        >
          View My Bookings
        </Link>
        <Link href="/home" className="block text-sm text-gray-400 hover:text-navy">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
