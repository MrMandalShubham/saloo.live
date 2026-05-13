'use client'

import Link from 'next/link'
import { formatDate } from '@saloo/lib'

interface Props {
  booking: {
    id: string
    booking_ref: string
    date: string
    shop: { name: string } | null
  }
}

export function QuickReBook({ booking }: Props) {
  const shopName = Array.isArray(booking.shop) ? booking.shop[0]?.name : booking.shop?.name

  return (
    <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 flex items-center justify-between hover:border-gold/40 hover:shadow-royal transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-lavender flex items-center justify-center shrink-0">
          <span className="font-syne text-navy text-lg">◈</span>
        </div>
        <div>
          <p className="text-[10px] text-muted font-semibold uppercase tracking-widest">Quick Re-Book</p>
          <p className="font-syne font-bold text-navy mt-0.5 text-sm">{shopName}</p>
          <p className="text-xs text-muted">{formatDate(booking.date)}</p>
        </div>
      </div>
      <Link
        href={`/shop/${booking.id}`}
        className="bg-gold text-navy px-4 py-2 rounded-xl text-sm font-syne font-bold hover:bg-gold/90 shadow-gold transition-all active:scale-95 shrink-0"
      >
        Book Again
      </Link>
    </div>
  )
}
