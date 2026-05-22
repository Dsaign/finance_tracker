import { useState } from 'react'
import { cn } from '@/lib/utils'

interface InstitutionLogoProps {
  slug: string
  name: string
  size?: number
  className?: string
}

function InitialBadge({ name, size, className }: { name: string; size: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center shrink-0 rounded-sm',
        'bg-accent text-accent-foreground font-bold leading-none select-none',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function InstitutionLogo({ slug, name, size = 16, className }: InstitutionLogoProps) {
  const [useFallback, setUseFallback] = useState(false)
  const logoUrl = `/assets/logos/${slug}.svg`

  if (useFallback) {
    return <InitialBadge name={name} size={size} className={className} />
  }

  return (
    <>
      <img src={logoUrl} alt="" style={{ display: 'none' }} onError={() => setUseFallback(true)} />
      <span
        className={cn('inline-block shrink-0 text-primary', className)}
        style={{
          width: size,
          height: size,
          backgroundColor: 'currentColor',
          maskImage: `url('${logoUrl}')`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskImage: `url('${logoUrl}')`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
        }}
        aria-label={name}
      />
    </>
  )
}

interface InstitutionNameProps {
  slug: string
  name: string
  logoSize?: number
  className?: string
}

export function InstitutionName({ slug, name, logoSize = 16, className }: InstitutionNameProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <InstitutionLogo slug={slug} name={name} size={logoSize} />
      {name}
    </span>
  )
}
