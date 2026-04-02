import { LayoutDashboard, Package, ReceiptText, ScanLine, Settings } from 'lucide-react'
import * as React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'

type NavItem = {
  to: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { to: '/products', label: 'Sản phẩm', icon: <Package className="size-4" /> },
  { to: '/orders', label: 'Hoá đơn', icon: <ReceiptText className="size-4" /> },
  { to: '/settings', label: 'Cài đặt', icon: <Settings className="size-4" /> },
]

function AppNavLink({ to, label, icon }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          isActive ? 'bg-muted text-foreground' : 'text-muted-foreground',
        )
      }
      end={to === '/'}
    >
      {icon}
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const leftItems = navItems.slice(0, 2)
  const rightItems = navItems.slice(2)
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-6 sm:py-6">
        <div className="grid gap-4 md:grid-cols-[240px_1fr] md:gap-6">
          <aside className="hidden md:block">
            <div className="rounded-2xl border bg-card p-3 shadow-xs">
              <div className="px-2 py-2">
                <div className="text-sm font-semibold">POS</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Cửa hàng đồ chơi Quế Hường
                </div>
              </div>
              <nav className="mt-2 grid gap-1">
                {navItems.map((it) => (
                  <AppNavLink key={it.to} {...it} />
                ))}
              </nav>
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur md:hidden">
        <button
          type="button"
          aria-label="Quét mã"
          className={cn(
            'absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2',
            'grid size-14 place-items-center rounded-2xl border bg-primary text-primary-foreground shadow-lg',
            'transition-transform active:translate-y-[calc(-50%+1px)]',
            'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          )}
          onClick={() => {
            navigate('/cart')
          }}
        >
          <ScanLine className="size-6" />
        </button>
        <div className="mx-auto grid max-w-3xl grid-cols-[1fr_1fr_auto_1fr_1fr] items-center gap-1 px-2 py-2">
          {leftItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive ? 'bg-muted text-foreground' : 'text-muted-foreground',
                )
              }
            >
              {it.icon}
              <span className="truncate">{it.label}</span>
            </NavLink>
          ))}
          <div aria-hidden className="h-10" />
          {rightItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive ? 'bg-muted text-foreground' : 'text-muted-foreground',
                )
              }
            >
              {it.icon}
              <span className="truncate">{it.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="h-16 md:hidden" />
    </div>
  )
}

