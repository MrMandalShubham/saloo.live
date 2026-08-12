// Web push opt-in. Reuses the existing Firebase Cloud Messaging setup: the token
// obtained here is saved to users.fcm_token, which every server push already targets.
// Everything is gated on the NEXT_PUBLIC_FIREBASE_* env being present, so this is a
// no-op until the keys are configured.

import { createClient } from '@/lib/supabase/client'

const firebaseConfig = {
  apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID'],
}
const VAPID_KEY = process.env['NEXT_PUBLIC_FIREBASE_VAPID_KEY']

/** True once the Firebase web config + VAPID key are set in the environment. */
export function isPushConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId && firebaseConfig.appId && VAPID_KEY)
}

export type PushState = 'unsupported' | 'unconfigured' | 'default' | 'granted' | 'denied'

/** Current opt-in state, for driving the UI. */
export function getPushState(): PushState {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  if (!isPushConfigured()) return 'unconfigured'
  return Notification.permission as PushState
}

/** Request permission, get an FCM token and store it on the user's row. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') return { ok: false, error: 'Unavailable' }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, error: 'This browser does not support notifications.' }
  }
  if (!isPushConfigured()) return { ok: false, error: 'Push notifications are not configured yet.' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: permission === 'denied'
      ? 'Notifications are blocked — enable them in your browser settings.'
      : 'Permission was not granted.' }
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const { initializeApp, getApps } = await import('firebase/app')
    const { getMessaging, getToken, onMessage, isSupported } = await import('firebase/messaging')
    if (!(await isSupported())) return { ok: false, error: 'Push is not supported on this device.' }

    const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig)
    const messaging = getMessaging(app)
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
    if (!token) return { ok: false, error: 'Could not obtain a device token.' }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Please sign in to enable notifications.' }
    await (supabase as any).from('users').update({ fcm_token: token }).eq('id', user.id)

    // Foreground messages (app open) — show them ourselves; background is handled by the SW.
    onMessage(messaging, (payload: any) => {
      const n = payload?.notification ?? payload?.data ?? {}
      if (n.title && Notification.permission === 'granted') {
        new Notification(n.title, { body: n.body, icon: '/icon-192.png' })
      }
    })

    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Failed to enable notifications.' }
  }
}
