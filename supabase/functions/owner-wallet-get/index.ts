import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()

    // Get shop
    const { data: shop } = await supabase
      .from('shops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    // Get or create wallet
    let { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('shop_id', shop.id)
      .single()

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({ shop_id: shop.id })
        .select()
        .single()
      wallet = newWallet
    }

    if (!wallet) return error('Failed to get wallet', 500)

    // Get recent transactions
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50)
    const page = parseInt(url.searchParams.get('page') ?? '0')

    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select(`
        id, amount, type, description, balance_after, hold_after, created_at,
        booking:bookings(id, booking_ref, date, start_time, user:users(name))
      `)
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .range(page * limit, page * limit + limit - 1)

    return json({
      data: {
        wallet: {
          id: wallet.id,
          balance: wallet.balance,
          hold_amount: wallet.hold_amount,
          total_released: wallet.total_released,
          total_cancelled: wallet.total_cancelled,
          updated_at: wallet.updated_at,
        },
        transactions: transactions ?? [],
      },
      error: null,
    })
  } catch (err) {
    console.error('owner-wallet-get error:', err)
    return error('Failed to fetch wallet', 500)
  }
})
