import { create } from 'zustand'
import type { ToastData } from '@/components/ui/Toast'

interface NotificationStore {
  // In-app toast queue
  toasts: ToastData[]
  addToast: (toast: ToastData) => void
  removeToast: (id: string) => void

  // Unread notification count (synced from backend)
  unreadCount: number
  setUnreadCount: (count: number) => void
  decrementUnread: (by?: number) => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set(s => ({ toasts: [...s.toasts, toast] })),
  removeToast: (id) =>
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementUnread: (by = 1) =>
    set(s => ({ unreadCount: Math.max(0, s.unreadCount - by) })),
}))
