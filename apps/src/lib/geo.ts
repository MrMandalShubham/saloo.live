// Device location for "nearby" search. Falls back to Indore if the user
// denies permission or geolocation is unavailable. Result is cached briefly
// so we don't re-prompt on every page.

export const DEFAULT_COORDS = { lat: 22.7196, lng: 75.8577 } // Indore
const CACHE_KEY = 'lookson_coords'
const CACHE_TTL = 30 * 60 * 1000 // 30 min

export type Coords = { lat: number; lng: number; source: 'gps' | 'cache' | 'default' }

/** Resolve the user's coordinates: fresh cache → GPS prompt → Indore fallback. */
export async function getUserCoords(): Promise<Coords> {
  // 1) Recent cached fix
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (typeof c.lat === 'number' && Date.now() - c.t < CACHE_TTL) {
        return { lat: c.lat, lng: c.lng, source: 'cache' }
      }
    }
  } catch { /* ignore */ }

  // 2) Ask the device (browser shows the permission prompt on first use)
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { ...DEFAULT_COORDS, source: 'default' }
  }
  return new Promise<Coords>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...c, t: Date.now() })) } catch { /* ignore */ }
        resolve({ ...c, source: 'gps' })
      },
      () => resolve({ ...DEFAULT_COORDS, source: 'default' }), // denied / timeout / error
      { timeout: 8000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false },
    )
  })
}
