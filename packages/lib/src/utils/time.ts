// IST helpers — OnO operates in India Standard Time (UTC+5:30)

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/** Get current IST Date object */
export function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS)
}

/** Format a time string "HH:MM" → "11:00 AM" */
export function formatTime(time: string): string {
  const [hourStr, minStr] = time.split(':')
  const hour = parseInt(hourStr ?? '0', 10)
  const min = minStr ?? '00'
  const ampm = hour < 12 ? 'AM' : 'PM'
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}:${min} ${ampm}`
}

/** Format a date string "YYYY-MM-DD" → "Mon, 17 Mar" */
export function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Relative time: "2h ago", "just now", "Mar 3" */
export function relativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(isoString.split('T')[0] ?? isoString)
}

/** Generate 7-day date strip from today (YYYY-MM-DD strings) */
export function next7Days(): string[] {
  const days: string[] = []
  const today = nowIST()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0] ?? '')
  }
  return days
}

/** Check if a shop is currently open given its hours */
export function isOpenNow(
  hours: Array<{ day_of_week: number; open_time: string; close_time: string; is_closed: boolean }>
): boolean {
  const now = nowIST()
  const dayOfWeek = now.getDay()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const todayHours = hours.find(h => h.day_of_week === dayOfWeek)
  if (!todayHours || todayHours.is_closed) return false
  return currentTime >= todayHours.open_time && currentTime < todayHours.close_time
}

/** Format duration: 90 → "1h 30m", 30 → "30 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
