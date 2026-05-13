'use client'

import { useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastData {
  id: string
  message: string
  type?: ToastType
  duration?: number
}

interface ToastProps extends ToastData {
  onRemove: (id: string) => void
}

const styles: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
}

const icons: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
}

export function Toast({ id, message, type = 'info', duration = 3500, onRemove }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(id), duration)
    return () => clearTimeout(t)
  }, [id, duration, onRemove])

  return (
    <div className={[
      'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium',
      'animate-in slide-in-from-top-2 fade-in duration-200',
      styles[type],
    ].join(' ')}>
      <span className="shrink-0 font-bold">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button onClick={() => onRemove(id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">✕</button>
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }: { toasts: ToastData[]; onRemove: (id: string) => void }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => <Toast key={t.id} {...t} onRemove={onRemove} />)}
    </div>
  )
}
