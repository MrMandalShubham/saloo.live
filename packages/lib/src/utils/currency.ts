/**
 * Format a number as Indian Rupees.
 * formatINR(349) → "₹349"
 * formatINR(1249.5) → "₹1,249.50"
 */
export function formatINR(amount: number, showDecimal = false): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimal ? 2 : 0,
    maximumFractionDigits: showDecimal ? 2 : 0,
  }).format(amount)
}

/** Convert rupees to paise (Razorpay expects paise) */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

/** Convert paise to rupees */
export function fromPaise(paise: number): number {
  return paise / 100
}

/** Calculate 30% advance amount */
export function calcAdvance(total: number): number {
  return Math.ceil(total * 0.3)
}
