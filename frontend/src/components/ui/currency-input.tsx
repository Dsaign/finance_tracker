import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

function toCents(apiValue: string): number {
  if (!apiValue) return 0
  return Math.round(parseFloat(apiValue) * 100)
}

function centsToDisplay(cents: number): string {
  if (cents === 0) return ''
  const str = String(cents).padStart(3, '0')
  const dec = str.slice(-2)
  const int = str.slice(0, -2).replace(/^0+/, '') || '0'
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec
}

function centsToApi(cents: number): string {
  return cents === 0 ? '' : (cents / 100).toFixed(2)
}

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string
  onChange: (value: string) => void
  prefix?: string
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, prefix, className, ...props }, ref) => {
    const display = centsToDisplay(toCents(value))

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const digits = e.target.value.replace(/\D/g, '')
      const cents = parseInt(digits || '0', 10)
      onChange(centsToApi(cents))
    }

    if (!prefix) {
      return (
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          className={className}
        />
      )
    }

    return (
      <div className="relative flex items-center">
        <span className="absolute left-3 text-sm text-muted-foreground pointer-events-none select-none">
          {prefix}
        </span>
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          className={cn('pl-9', className)}
        />
      </div>
    )
  }
)
CurrencyInput.displayName = 'CurrencyInput'
