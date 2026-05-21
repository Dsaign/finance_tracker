import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Upload,
  Tags, Target, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Extrato'      },
  { to: '/import',       icon: Upload,          label: 'Importar'     },
  { to: '/goals',        icon: Target,          label: 'Objetivos'    },
  { to: '/tags',         icon: Tags,            label: 'Tags'         },
  { to: '/settings',     icon: Settings,        label: 'Configurações' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-neutral-200">
        <div className="px-6 py-5 border-b border-neutral-200">
          <span className="text-lg font-bold tracking-tight">Finance Tracker</span>
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
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <Toaster richColors position="top-right" />
    </div>
  )
}
