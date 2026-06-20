'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR, formatDate, formatTime } from '@saloo/lib'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']

async function fetchBooking(id: string) {
  const { data: { session } } = await createClient().auth.getSession()
  const res = await fetch(`${BASE}/functions/v1/bookings-get/${id}`, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  })
  return (await res.json()).data
}

const GST_RATE = 0.18 // 18% GST on salon services (prices treated as GST-inclusive)

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: booking, isLoading } = useQuery({ queryKey: ['booking', id], queryFn: () => fetchBooking(id), enabled: !!id })

  if (isLoading) {
    return <div className="max-w-2xl mx-auto py-6"><div className="h-96 bg-white border border-border rounded-2xl animate-pulse" /></div>
  }
  if (!booking) return <div className="text-center py-20 text-muted">Invoice not available</div>

  const shop = Array.isArray(booking.shop) ? booking.shop[0] : booking.shop
  const barber = Array.isArray(booking.barber) ? booking.barber[0] : booking.barber
  const services = booking.services ?? []
  const total = Number(booking.total_amount) || 0
  const hasGST = !!shop?.gst_number

  // Prices are GST-inclusive → back out the tax components
  const base = hasGST ? total / (1 + GST_RATE) : total
  const gstAmount = total - base
  const cgst = gstAmount / 2
  const sgst = gstAmount / 2

  const advance = Number(booking.advance_amount) || 0
  const balance = total - advance

  return (
    <div className="max-w-2xl mx-auto py-6 px-2">
      {/* Toolbar (hidden on print) */}
      <div className="no-print flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="text-2xl text-gray-400 hover:text-navy">‹</button>
        <button onClick={() => window.print()}
          className="bg-saloo-teal text-navy font-syne font-bold px-5 py-2.5 rounded-xl hover:bg-saloo-teal/90 transition-colors text-sm">
          Download / Print
        </button>
      </div>

      {/* Invoice */}
      <div className="print-area bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-border pb-5">
          <div>
            <h1 className="font-syne text-2xl font-bold text-navy">{shop?.name}</h1>
            <p className="text-xs text-muted mt-1 max-w-[220px]">{shop?.address}</p>
            {shop?.phone && <p className="text-xs text-muted mt-0.5">{shop.phone}</p>}
            {hasGST && <p className="text-xs text-muted mt-0.5">GSTIN: {shop.gst_number}</p>}
          </div>
          <div className="text-right">
            <p className="font-syne font-bold text-lg text-saloo-teal">{hasGST ? 'TAX INVOICE' : 'RECEIPT'}</p>
            <p className="text-xs text-muted mt-1">{booking.booking_ref}</p>
            <p className="text-xs text-muted">{formatDate(booking.date)}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 py-5 border-b border-border text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Appointment</p>
            <p className="text-navy">{formatDate(booking.date)} · {formatTime(booking.start_time)}</p>
            {barber?.name && <p className="text-muted text-xs mt-0.5">Barber: {barber.name}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Status</p>
            <p className="text-navy capitalize">{String(booking.status).replace('_', ' ')}</p>
          </div>
        </div>

        {/* Line items */}
        <div className="py-5 border-b border-border">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted font-bold mb-3">
            <span>Service</span><span>Amount</span>
          </div>
          {services.map((s: any) => (
            <div key={s.id} className="flex justify-between text-sm py-1.5">
              <span className={s.is_addon ? 'text-muted' : 'text-navy'}>{s.is_addon ? `+ ${s.name}` : s.name}</span>
              <span className={s.is_addon ? 'text-muted' : 'text-navy'}>{formatINR(s.price)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="py-5 space-y-2 text-sm">
          {hasGST ? (
            <>
              <Line label="Taxable value" value={formatINR(base)} />
              <Line label={`CGST @ ${(GST_RATE * 100) / 2}%`} value={formatINR(cgst)} muted />
              <Line label={`SGST @ ${(GST_RATE * 100) / 2}%`} value={formatINR(sgst)} muted />
            </>
          ) : (
            <Line label="Subtotal" value={formatINR(total)} />
          )}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-syne font-bold text-navy">Total</span>
            <span className="font-syne font-bold text-navy text-lg">{formatINR(total)}</span>
          </div>
          <Line label="Advance paid (online)" value={`− ${formatINR(advance)}`} muted />
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-semibold text-navy">Balance due at shop</span>
            <span className="font-syne font-bold text-saloo-teal">{formatINR(balance)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-5 border-t border-border text-center">
          <p className="text-xs text-muted">Thank you for choosing {shop?.name}!</p>
          <p className="text-[10px] text-muted/60 mt-1">Generated by Saloo · This is a computer-generated {hasGST ? 'invoice' : 'receipt'}.</p>
        </div>
      </div>
    </div>
  )
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-muted' : 'text-navy'}>{label}</span>
      <span className={muted ? 'text-muted' : 'text-navy'}>{value}</span>
    </div>
  )
}
