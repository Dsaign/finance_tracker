import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Upload,
  Tags, Target, Settings, Sun, Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '@/lib/theme'

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Extrato'       },
  { to: '/import',       icon: Upload,          label: 'Importar'      },
  { to: '/goals',        icon: Target,          label: 'Objetivos'     },
  { to: '/tags',         icon: Tags,            label: 'Tags'          },
  { to: '/settings',     icon: Settings,        label: 'Configurações' },
]

export default function Layout() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <span className="text-lg font-bold tracking-tight text-sidebar-primary">Finance Tracker</span>
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
  )
}
