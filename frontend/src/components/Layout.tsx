import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight,
  Tags, Target, Settings, Sun, Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '@/lib/theme'

function MiranteLogo() {
  return (
    <svg
      viewBox="0 0 130 40"
      className="h-9 select-none"
      aria-label="Mirante"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* inverted triangle — sits in the V above the M */}
      <polygon
        points="7.5,10 17.8,10 12.5,18"
        fill="var(--sidebar-primary)"
      />
      <text
        x="0" y="37"
        fontFamily="'Quicksand', sans-serif"
        fontSize={30}
        fontWeight={500}
        fill="var(--sidebar-primary)"
      >M</text>
      <text
        x="27" y="37"
        fontFamily="'Quicksand', sans-serif"
        fontSize={30}
        fontWeight={400}
        letterSpacing={1.4}
        fill="var(--sidebar-foreground)"
      >irante</text>
    </svg>
  )
}

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Extrato'       },
  { to: '/goals',        icon: Target,          label: 'Objetivos'     },
  { to: '/tags',         icon: Tags,            label: 'Tags'          },
  { to: '/settings',     icon: Settings,        label: 'Configurações' },
]

export default function Layout() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div className="h-0.75 bg-primary/70 shrink-0" />
      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <MiranteLogo />
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={toggle}
              >
                <div className="flex items-center gap-2 text-sidebar-foreground/60">
                  <Sun size={15} />
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={toggle}
                  onClick={e => e.stopPropagation()}
                  className="mx-2"
                />
                <div className="flex items-center gap-2 text-sidebar-foreground/60">
                  <Moon size={15} />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              Mudar tema claro/escuro
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <Toaster richColors position="top-right" />
      </div>
    </div>
  )
}
