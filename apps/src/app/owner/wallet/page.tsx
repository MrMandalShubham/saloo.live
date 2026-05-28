'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const TX_STYLE: Record<string, { label: string; color: string; icon: string; sign: string }> = {
  hold:       { label: 'Hold',       color: 'text-amber-600 bg-amber-50',   icon: '⏳', sign: '+' },
  release:    { label: 'Released',   color: 'text-green-600 bg-green-50',   icon: '✅', sign: '+' },
  cancel:     { label: 'Cancelled',  color: 'text-red-600 bg-red-50',       icon: '❌', sign: '-' },
  withdrawal: { label: 'Withdrawal', color: 'text-blue-600 bg-blue-50',     icon: '🏦', sign: '-' },
  adjustment: { label: 'Adjustment', color: 'text-purple-600 bg-purple-50', icon: '⚙️', sign: '' },
}

export default function OwnerWalletPage() {
  const [filter, setFilter] = useState<string>('all')
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['owner-wallet'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-wallet-get?limit=50`, {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      })
      const json = await res.json()
      return json.data
    },
  })

  const wallet = data?.wallet ?? { balance: 0, hold_amount: 0, total_released: 0, total_cancelled: 0 }
  const transactions = (data?.transactions ?? []).filter(
    (tx: any) => filter === 'all' || tx.type === filter
  )

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  const formatTime = (d: string) => {
    const date = new Date(d)
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="font-syne text-2xl font-bold text-saloo-dark">Wallet</h1>
        <p className="text-saloo-dark/50 text-sm mt-0.5">Track your earnings and payouts</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Balance Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Available Balance */}
            <div className="col-span-2 bg-gradient-to-br from-[#0A1116] to-[#0E1B24] rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-40 h-40 rounded-full bg-saloo-teal/10 blur-[50px] pointer-events-none" />
              <div className="relative z-10">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Available Balance</p>
                <p className="font-syne text-3xl font-bold text-white mt-1">{formatINR(wallet.balance)}</p>
                <p className="text-white/40 text-xs mt-2">Ready for withdrawal</p>
              </div>
            </div>

            {/* Hold */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⏳</span>
                <p className="text-amber-800 text-[10px] font-bold uppercase tracking-widest">On Hold</p>
              </div>
              <p className="font-syne text-xl font-bold text-amber-700">{formatINR(wallet.hold_amount)}</p>
              <p className="text-amber-600/60 text-[10px] mt-1">Pending confirmation</p>
            </div>

            {/* Released */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✅</span>
                <p className="text-green-800 text-[10px] font-bold uppercase tracking-widest">Released</p>
              </div>
              <p className="font-syne text-xl font-bold text-green-700">{formatINR(wallet.total_released)}</p>
              <p className="text-green-600/60 text-[10px] mt-1">Lifetime earned</p>
            </div>

            {/* Cancelled */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">❌</span>
                <p className="text-red-800 text-[10px] font-bold uppercase tracking-widest">Cancelled</p>
              </div>
              <p className="font-syne text-xl font-bold text-red-700">{formatINR(wallet.total_cancelled)}</p>
              <p className="text-red-600/60 text-[10px] mt-1">Refunded to customers</p>
            </div>

            {/* Pending payout placeholder */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🏦</span>
                <p className="text-blue-800 text-[10px] font-bold uppercase tracking-widest">Payouts</p>
              </div>
              <p className="font-syne text-xl font-bold text-blue-700">Coming Soon</p>
              <p className="text-blue-600/60 text-[10px] mt-1">Bank transfer</p>
            </div>
          </div>

          {/* Transaction History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-saloo-dark/60 font-bold text-xs uppercase tracking-widest">Transaction History</p>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-white/60 backdrop-blur-md border border-white/80 rounded-xl p-1 mb-4">
              {[
                { key: 'all', label: 'All' },
                { key: 'hold', label: 'Holds' },
                { key: 'release', label: 'Released' },
                { key: 'cancel', label: 'Cancelled' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    filter === t.key ? 'bg-saloo-pink text-saloo-cream' : 'text-saloo-dark/60 hover:text-saloo-dark'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {transactions.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-10 text-center">
                <p className="text-saloo-dark/50 text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx: any) => {
                  const style = TX_STYLE[tx.type] ?? TX_STYLE.adjustment
                  const booking = Array.isArray(tx.booking) ? tx.booking[0] : tx.booking
                  return (
                    <div
                      key={tx.id}
                      className="bg-white/60 backdrop-blur-md border border-white/80 rounded-xl p-4 flex items-center gap-3"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.color}`}>
                        <span className="text-lg">{style.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.color}`}>
                            {style.label}
                          </span>
                          {booking?.booking_ref && (
                            <span className="text-[10px] text-saloo-dark/40 font-mono">{booking.booking_ref}</span>
                          )}
                        </div>
                        <p className="text-saloo-dark/70 text-xs mt-0.5 truncate">
                          {tx.description}
                          {booking?.user?.name && ` · ${booking.user.name}`}
                        </p>
                        <p className="text-saloo-dark/40 text-[10px] mt-0.5">
                          {formatDate(tx.created_at)} · {formatTime(tx.created_at)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-syne font-bold text-base ${
                          tx.type === 'release' ? 'text-green-600' :
                          tx.type === 'cancel' ? 'text-red-600' :
                          tx.type === 'hold' ? 'text-amber-600' : 'text-saloo-dark'
                        }`}>
                          {style.sign}{formatINR(tx.amount)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
