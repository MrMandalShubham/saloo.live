type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-border/70 text-secondary',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-600',
  info:    'bg-blue-100 text-blue-700',
  gold:    'bg-gold/15 text-gold border border-gold/30',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
      variants[variant],
      className,
    ].join(' ')}>
      {children}
    </span>
  )
}

// Booking status badge
import type { BookingStatus } from '@saloo/types'

const statusMap: Record<BookingStatus, { label: string; variant: BadgeVariant }> = {
  pending_payment: { label: 'Pending Payment', variant: 'warning' },
  confirmed:       { label: 'Confirmed',        variant: 'success' },
  in_chair:        { label: 'In Chair',         variant: 'info' },
  completed:       { label: 'Completed',        variant: 'default' },
  cancelled:       { label: 'Cancelled',        variant: 'danger' },
  no_show:         { label: 'No Show',          variant: 'danger' },
  disputed:        { label: 'Disputed',         variant: 'warning' },
  expired:         { label: 'Expired',          variant: 'default' },
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, variant } = statusMap[status]
  return <Badge variant={variant}>{label}</Badge>
}
