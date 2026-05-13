import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  hint?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-secondary uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className={[
          'flex items-center gap-2 bg-white border rounded-xl px-3.5 transition-all',
          error ? 'border-red-400 focus-within:border-red-500' : 'border-border focus-within:border-gold focus-within:shadow-gold/10 focus-within:shadow-sm',
        ].join(' ')}>
          {prefix && <span className="text-muted shrink-0">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={['flex-1 py-3 text-sm text-navy placeholder-muted bg-transparent outline-none', className].join(' ')}
            {...props}
          />
          {suffix && <span className="text-muted shrink-0">{suffix}</span>}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
