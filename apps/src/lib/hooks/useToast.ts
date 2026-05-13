'use client'

import { useCallback } from 'react'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import type { ToastData } from '@/components/ui/Toast'

export function useToast() {
  const addToast = useNotificationStore(s => s.addToast)

  const toast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    addToast({ id: crypto.randomUUID(), message, type })
  }, [addToast])

  return {
    toast,
    success: (msg: string) => toast(msg, 'success'),
    error:   (msg: string) => toast(msg, 'error'),
    warning: (msg: string) => toast(msg, 'warning'),
    info:    (msg: string) => toast(msg, 'info'),
  }
}
