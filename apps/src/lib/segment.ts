// Guest (not-logged-in) section choice. Logged-in users use users.segment instead.
// Stored in a cookie so both the server layout (gate) and client fetchers can read it.

export const GUEST_SEGMENT_COOKIE = 'guest_segment'
export type Segment = 'men' | 'women'

/** Read the guest's chosen section on the client. Defaults to 'men' if unset. */
export function getGuestSegment(): Segment {
  if (typeof document === 'undefined') return 'men'
  const m = document.cookie.match(/(?:^|;\s*)guest_segment=(men|women)\b/)
  return (m?.[1] as Segment) ?? 'men'
}

/** Persist the guest's chosen section (1 year). */
export function setGuestSegment(seg: Segment) {
  if (typeof document === 'undefined') return
  document.cookie = `${GUEST_SEGMENT_COOKIE}=${seg}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

/** Forget the guest's choice — re-opens the section chooser. */
export function clearGuestSegment() {
  if (typeof document === 'undefined') return
  document.cookie = `${GUEST_SEGMENT_COOKIE}=; path=/; max-age=0; samesite=lax`
}
