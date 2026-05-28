'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const METHOD_LABEL: Record<string, string> = {
  upi: 'UPI',
  bank: 'Bank Account',
  phone: 'PhonePe / GPay',
}

export default function WithdrawPage() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [err, setErr] = useState('')

  // Fetch wallet + shop payout settings
  const { data, isLoading } = useQuery({
    queryKey: ['withdraw-info'],
    queryFn: async () => {
      const token = await getToken()
      const [walletRes, shopRes] = await Promise.all([
        fetch(`${BASE_URL}/functions/v1/owner-wallet-get?limit=0`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/functions/v1/owner-shop-get`, {
          headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
        }),
      ])
      const walletJson = await walletRes.json()
      const shopJson = await shopRes.json()
      return {
        wallet: walletJson.data?.wallet ?? { balance: 0 },
        shop: shopJson.data ?? {},
      }
    },
  })

  const wallet = data?.wallet ?? { balance: 0 }
  const shop = data?.shop ?? {}
  const balance = Number(wallet.balance) || 0
  const hasPayout = !!shop.payout_method

  const withdrawMutation = useMutation({
    mutationFn: async (amt: number) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => {
      router.push('/owner/wallet')
    },
    onError: (e: Error) => setErr(e.message),
  })

  function handleWithdraw() {
    setErr('')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setErr('Enter a valid amount'); return }
    if (amt > balance) { setErr('Insufficient balance'); return }
    if (amt < 100) { setErr('Minimum withdrawal is ₹100'); return }
    withdrawMutation.mutate(amt)
  }

  const quickAmounts = [500, 1000, 2000, 5000].filter(a => a <= balance)

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="text-saloo-dark/50 text-sm mb-2 hover:text-saloo-dark transition-colors">&larr; Back to Wallet</button>
        <h1 className="font-syne text-2xl font-bold text-saloo-dark">Withdraw Funds</h1>
        <p className="text-saloo-dark/50 text-sm mt-0.5">Transfer money to your saved payout method</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-[#0A1116] to-[#0E1B24] rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 rounded-full bg-saloo-teal/10 blur-[50px] pointer-events-none" />
        <div className="relative z-10">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Available Balance</p>
          <p className="font-syne text-3xl font-bold text-white mt-1">{formatINR(balance)}</p>
        </div>
      </div>

      {!hasPayout ? (
        /* No payout method configured */
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <span className="text-3xl">⚠</span>
          <p className="text-amber-800 font-semibold text-sm">No Payout Method Configured</p>
          <p className="text-amber-700/70 text-xs">Please set up your payment details in Settings before withdrawing.</p>
          <button onClick={() => router.push('/owner/settings')}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors">
            Go to Settings
          </button>
        </div>
      ) : (
        <>
          {/* Payout Method */}
          <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5">
            <p className="text-saloo-dark/50 text-xs uppercase tracking-widest mb-3">Withdrawal Method</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                <span className="text-lg">{shop.payout_method === 'upi' ? '📲' : shop.payout_method === 'bank' ? '🏦' : '📱'}</span>
              </div>
              <div className="flex-1">
                <p className="text-saloo-dark font-semibold text-sm">{METHOD_LABEL[shop.payout_method] ?? shop.payout_method}</p>
                <p className="text-saloo-dark/50 text-xs">
                  {shop.payout_method === 'upi' && (shop.payout_upi_id ?? '—')}
                  {shop.payout_method === 'bank' && (`${shop.payout_bank_name ?? ''} ••••${(shop.payout_bank_account ?? '').slice(-4)}`)}
                  {shop.payout_method === 'phone' && (shop.payout_phone ?? '—')}
                </p>
              </div>
              <button onClick={() => router.push('/owner/settings')} className="text-saloo-pink text-xs font-semibold hover:underline">Change</button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5 space-y-4">
            <p className="text-saloo-dark/50 text-xs uppercase tracking-widest">Enter Amount</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-saloo-dark/40 font-syne font-bold text-lg">&#8377;</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-white/60 border border-white/80 rounded-xl pl-10 pr-4 py-4 text-saloo-dark font-syne font-bold text-2xl placeholder-saloo-dark/20 focus:outline-none focus:border-saloo-pink/40 transition-colors"
              />
            </div>
            <p className="text-saloo-dark/40 text-xs">Minimum withdrawal: &#8377;100</p>

            {/* Quick amounts */}
            {quickAmounts.length > 0 && (
              <div className="flex gap-2">
                {quickAmounts.map(a => (
                  <button key={a} onClick={() => setAmount(String(a))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      amount === String(a)
                        ? 'bg-saloo-pink/10 border border-saloo-pink/30 text-saloo-pink'
                        : 'bg-white/40 border border-white/80 text-saloo-dark/50 hover:bg-white/60'
                    }`}>
                    {formatINR(a)}
                  </button>
                ))}
                {balance > 0 && (
                  <button onClick={() => setAmount(String(balance))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      amount === String(balance)
                        ? 'bg-saloo-pink/10 border border-saloo-pink/30 text-saloo-pink'
                        : 'bg-white/40 border border-white/80 text-saloo-dark/50 hover:bg-white/60'
                    }`}>
                    All
                  </button>
                )}
              </div>
            )}
          </div>

          {err && (
            <div className="bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{err}</p>
            </div>
          )}

          {/* Submit */}
          <button onClick={handleWithdraw} disabled={withdrawMutation.isPending || !amount}
            className="w-full py-4 bg-gradient-to-r from-saloo-pink to-saloo-pink/80 text-saloo-cream rounded-2xl font-syne font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all shadow-sm">
            {withdrawMutation.isPending ? 'Processing...' : `Withdraw ${amount ? formatINR(parseFloat(amount) || 0) : ''}`}
          </button>
        </>
      )}
    </div>
  )
}
