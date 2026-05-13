import { NextRequest, NextResponse } from 'next/server'

// Proxy Razorpay webhooks to Supabase Edge Function (payments-verify)
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature') ?? ''

    const res = await fetch(
      `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/payments-verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signature,
          // Service role key for webhook — bypasses JWT auth
          Authorization: `Bearer ${process.env['SUPABASE_SERVICE_ROLE_KEY']}`,
        },
        body,
      }
    )

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.error }, { status: res.status })
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
