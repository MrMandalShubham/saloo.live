import { createHmac } from 'https://deno.land/std@0.224.0/crypto/mod.ts'

const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
const BASE = 'https://api.razorpay.com/v1'

// Dev mode: when no real Razorpay keys are set, simulate payment flow
export const IS_DEV_MODE = !KEY_ID || KEY_ID.startsWith('rzp_demo') || KEY_ID === 'demo'

function authHeader(): string {
  return 'Basic ' + btoa(`${KEY_ID}:${KEY_SECRET}`)
}

/** Create a Razorpay order. amount is in paise. */
export async function createOrder(params: {
  amount: number    // paise
  receipt: string   // hold_id or booking_ref
  notes?: Record<string, string>
}) {
  if (IS_DEV_MODE) {
    // Return a mock order for dev/demo
    return {
      id: `order_demo_${crypto.randomUUID().slice(0, 12)}`,
      amount: params.amount,
      currency: 'INR',
      receipt: params.receipt,
      status: 'created',
    }
  }

  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amount,
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  })
  if (!res.ok) throw new Error(`Razorpay createOrder failed: ${await res.text()}`)
  return res.json()
}

/** Verify Razorpay payment signature */
export async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  // Dev mode: accept demo signatures
  if (IS_DEV_MODE) return true

  const payload = `${orderId}|${paymentId}`
  const key = new TextEncoder().encode(KEY_SECRET)
  const data = new TextEncoder().encode(payload)
  const hmac = createHmac('sha256', key)
  await hmac.update(data)
  const digest = Array.from(new Uint8Array(await hmac.digest()))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return digest === signature
}

/** Verify Razorpay webhook signature */
export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!
  const key = new TextEncoder().encode(webhookSecret)
  const data = new TextEncoder().encode(payload)
  const hmac = createHmac('sha256', key)
  await hmac.update(data)
  const digest = Array.from(new Uint8Array(await hmac.digest()))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return digest === signature
}

/** Create a refund */
export async function createRefund(paymentId: string, amount: number) {
  const res = await fetch(`${BASE}/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
  if (!res.ok) throw new Error(`Razorpay refund failed: ${await res.text()}`)
  return res.json()
}
