import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { amount } = await req.json()
    if (!amount || amount <= 0) return error('Invalid amount', 400)
    if (amount < 100) return error('Minimum withdrawal is ₹100', 400)

    const supabase = createAdminClient()

    // Get shop
    const { data: shop } = await supabase
      .from('shops')
      .select('id, payout_method, payout_upi_id, payout_bank_account, payout_bank_ifsc, payout_bank_name, payout_phone')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)
    if (!shop.payout_method) return error('No payout method configured. Please set up in Settings.', 400)

    // Get wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('shop_id', shop.id)
      .single()

    if (!wallet) return error('Wallet not found', 404)
    if (Number(wallet.balance) < amount) return error('Insufficient balance', 400)

    // Build payout details
    const payout_details: Record<string, string> = {}
    if (shop.payout_method === 'upi') {
      payout_details.upi_id = shop.payout_upi_id ?? ''
    } else if (shop.payout_method === 'bank') {
      payout_details.bank_name = shop.payout_bank_name ?? ''
      payout_details.bank_account = shop.payout_bank_account ?? ''
      payout_details.bank_ifsc = shop.payout_bank_ifsc ?? ''
    } else if (shop.payout_method === 'phone') {
      payout_details.phone = shop.payout_phone ?? ''
    }

    // Create withdrawal request
    const { data: wr, error: wrErr } = await supabase
      .from('withdrawal_requests')
      .insert({
        wallet_id: wallet.id,
        shop_id: shop.id,
        amount,
        method: shop.payout_method,
        payout_details,
        status: 'pending',
      })
      .select('id')
      .single()

    if (wrErr) throw wrErr

    // Deduct from wallet balance, add to total_withdrawn
    const newBalance = Number(wallet.balance) - amount
    const { data: currentWallet } = await supabase
      .from('wallets')
      .select('total_withdrawn')
      .eq('id', wallet.id)
      .single()

    const { error: walletErr } = await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        total_withdrawn: (Number(currentWallet?.total_withdrawn) || 0) + amount,
      })
      .eq('id', wallet.id)

    if (walletErr) throw walletErr

    // Create wallet transaction record
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'withdrawal',
        amount,
        description: `Withdrawal via ${shop.payout_method.toUpperCase()} - ${wr.id.slice(0, 8)}`,
      })

    return json({ data: { id: wr.id, status: 'pending', amount } })
  } catch (e: any) {
    console.error('owner-withdraw error:', e)
    return error(e.message ?? 'Internal error', 500)
  }
})
