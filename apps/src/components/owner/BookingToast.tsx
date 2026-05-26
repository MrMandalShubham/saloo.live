'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ToastNotification {
  id: string
  title: string
  body: string
  booking_id?: string
  created_at: string
}

export function BookingToast({ ownerId }: { ownerId: string }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const router = useRouter()
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to new notifications for this owner
    const channel = supabase
      .channel('owner-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${ownerId}`,
        },
        (payload: any) => {
          const notif = payload.new
          // Only show booking-related notifications as toast
          if (notif.type === 'booking_pending' || notif.type === 'booking_confirmed' || notif.type === 'booking_cancelled') {
            const toast: ToastNotification = {
              id: notif.id,
              title: notif.title,
              body: notif.body,
              booking_id: notif.data?.booking_id,
              created_at: notif.created_at,
            }
            setToasts(prev => [toast, ...prev])

            // Play notification sound (short beep via oscillator)
            try {
              const ctx = new AudioContext()
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.frequency.value = 880
              osc.type = 'sine'
              gain.gain.setValueAtTime(0.3, ctx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
              osc.start(ctx.currentTime)
              osc.stop(ctx.currentTime + 0.3)
            } catch {}

            // Auto-dismiss after 5 seconds
            setTimeout(() => {
              dismissToast(notif.id)
            }, 5000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ownerId, dismissToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
          onClick={() => {
            dismissToast(toast.id)
            if (toast.booking_id) {
              router.push(`/owner/bookings/${toast.booking_id}`)
            } else {
              router.push('/owner/bookings?status=pending_confirmation')
            }
          }}
        />
      ))}
    </div>
  )
}

function ToastItem({
  toast,
  onDismiss,
  onClick,
}: {
  toast: ToastNotification
  onDismiss: () => void
  onClick: () => void
}) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [translateX, setTranslateX] = useState(0)
  const [isExiting, setIsExiting] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const diff = e.touches[0].clientX - touchStart
    setTranslateX(diff)
  }

  const handleTouchEnd = () => {
    if (Math.abs(translateX) > 80) {
      // Swiped far enough — dismiss
      setIsExiting(true)
      setTimeout(onDismiss, 200)
    } else {
      setTranslateX(0)
    }
    setTouchStart(null)
  }

  return (
    <div
      className={`pointer-events-auto bg-white border border-gray-200 rounded-2xl shadow-lg p-4 cursor-pointer
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'animate-slide-in-right'}`}
      style={{ transform: isExiting ? undefined : `translateX(${translateX}px)`, opacity: isExiting ? 0 : Math.max(0.3, 1 - Math.abs(translateX) / 200) }}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-xl">📋</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-syne font-bold text-sm text-gray-900">{toast.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{toast.body}</p>
          <p className="text-[10px] text-saloo-teal font-semibold mt-1.5 uppercase tracking-wide">Tap to view →</p>
        </div>

        {/* Close button */}
        <button
          onClick={e => { e.stopPropagation(); onDismiss() }}
          className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 -mt-1 -mr-1 p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar — auto dismiss timer */}
      <div className="mt-3 h-0.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-400 to-saloo-teal rounded-full animate-shrink-width" />
      </div>
    </div>
  )
}
