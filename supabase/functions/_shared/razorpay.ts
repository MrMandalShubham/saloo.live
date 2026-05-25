const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
const BASE = 'https://api.razorpay.com/v1'

// Dev mode: when no real Razorpay keys are set, simulate payment flow
export const IS_DEV_MODE = !KEY_ID || KEY_ID.startsWith('rzp_demo') || KEY_ID === 'demo'

function authHeader(): string {
  return 'Basic ' + btoa(`${KEY_ID}:${KEY_SECRET}`)
}

/** HMAC-SHA256 using native Web Crypto API */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
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
  if (IS_DEV_MODE) return true
  const digest = await hmacSha256(KEY_SECRET, `${orderId}|${paymentId}`)
  return digest === signature
}

/** Verify Razorpay webhook signature */
export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''
  const digest = await hmacSha256(webhookSecret, payload)
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
