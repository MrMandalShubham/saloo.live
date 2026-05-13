type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  name?: string | null
  src?: string | null
  size?: AvatarSize
  className?: string
}

const sizes: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const initial = name?.trim()[0]?.toUpperCase() ?? '?'

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'Avatar'}
        className={['rounded-full object-cover shrink-0', sizes[size], className].join(' ')}
      />
    )
  }

  return (
    <div className={[
      'rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0 font-syne font-bold text-gold',
      sizes[size],
      className,
    ].join(' ')}>
      {initial}
    </div>
  )
}
