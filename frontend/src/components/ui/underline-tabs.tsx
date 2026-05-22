import { createContext, useContext, useState, useLayoutEffect, useCallback, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TabsCtx {
  selected: string
  setSelected: (v: string) => void
  tabRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>
  refreshKey: number
  triggerRefresh: () => void
}

const Ctx = createContext<TabsCtx | null>(null)

function useTabsCtx() {
  const c = useContext(Ctx)
  if (!c) throw new Error('UnderlineTabs subcomponent used outside <UnderlineTabs>')
  return c
}

// ── UnderlineTabs ─────────────────────────────────────────────────────────────

interface UnderlineTabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  children: ReactNode
  className?: string
}

export function UnderlineTabs({ defaultValue = '', value, onValueChange, children, className }: UnderlineTabsProps) {
  const [internal, setInternal] = useState(defaultValue)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const selected = value !== undefined ? value : internal
  function setSelected(v: string) {
    if (value === undefined) setInternal(v)
    onValueChange?.(v)
  }

  return (
    <Ctx.Provider value={{ selected, setSelected, tabRefs, refreshKey, triggerRefresh }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  )
}

// ── UnderlineTabsList ─────────────────────────────────────────────────────────

export function UnderlineTabsList({ children, className }: { children: ReactNode; className?: string }) {
  const { selected, tabRefs, refreshKey } = useTabsCtx()
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const el = tabRefs.current.get(selected)
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
  }, [selected, tabRefs, refreshKey])

  return (
    <div className={cn('relative flex items-end border-b border-border', className)}>
      {children}
      {indicator && (
        <span
          className="absolute bottom-0 h-0.5 bg-primary pointer-events-none"
          style={{
            left: indicator.left,
            width: indicator.width,
            transition: 'left 250ms cubic-bezier(0.4,0,0.2,1), width 250ms cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}
    </div>
  )
}

// ── UnderlineTabsTrigger ──────────────────────────────────────────────────────

export function UnderlineTabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { selected, setSelected, tabRefs, triggerRefresh } = useTabsCtx()

  useLayoutEffect(() => {
    triggerRefresh()
    return () => { triggerRefresh() }
  }, [triggerRefresh])

  return (
    <button
      ref={el => {
        if (el) tabRefs.current.set(value, el)
        else tabRefs.current.delete(value)
      }}
      onClick={() => setSelected(value)}
      className={cn(
        'px-4 py-2 text-sm transition-colors whitespace-nowrap inline-flex items-center gap-1.5',
        selected === value ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  )
}

// ── UnderlineTabsContent ──────────────────────────────────────────────────────

export function UnderlineTabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { selected } = useTabsCtx()
  if (selected !== value) return null
  return <div className={className}>{children}</div>
}
