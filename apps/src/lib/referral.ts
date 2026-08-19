// Pending referral code captured from a ?ref= deep link, persisted across the
// signup → email-confirm → first-login round-trip, then auto-applied once the
// user is authenticated (via the existing referral-apply function).

const KEY = 'lookson_ref'
export const REF_PARAM = 'ref'

export function storePendingReferral(code: string) {
  if (typeof localStorage === 'undefined') return
  const c = code.trim().toUpperCase().slice(0, 8)
  if (/^[A-Z0-9]{4,8}$/.test(c)) localStorage.setItem(KEY, c)
}

export function getPendingReferral(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function clearPendingReferral() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(KEY)
}
