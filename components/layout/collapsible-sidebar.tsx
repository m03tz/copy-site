'use client'

import { useState } from 'react'
import {
  ChevronLeft, ChevronRight,
  LayoutDashboard, Users, Calendar, ClipboardList,
  Scissors, Clock, DollarSign, LogOut, LucideIcon,
} from 'lucide-react'
import { Link, usePathname } from '@/i18n/routing'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { signOut } from '@/lib/actions/auth'

interface NavItem {
  href: string
  label: string
}

interface CollapsibleSidebarProps {
  navItems: NavItem[]
  userName: string
  role: string
  logoutLabel: string
  locale: string
}

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard:         LayoutDashboard,
  patients:          Users,
  appointments:      Calendar,
  'medical-records': ClipboardList,
  operations:        Scissors,
  schedule:          Clock,
  financial:         DollarSign,
}

function getIcon(href: string): LucideIcon {
  const segment = href.split('/').pop() ?? ''
  return ICON_MAP[segment] ?? LayoutDashboard
}

/** Navigates normally, but if already on the page it refreshes instead. */
function NavLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  function handleClick(e: React.MouseEvent) {
    if (isActive) {
      e.preventDefault()
      router.refresh()
    }
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}

export function CollapsibleSidebar({
  navItems,
  userName,
  role,
  logoutLabel,
  locale,
}: CollapsibleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const isRtl = locale === 'ar'

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={`hidden md:flex flex-col shrink-0 border-e transition-all duration-300 relative
          ${collapsed ? 'w-14' : 'w-64'}`}
        style={{ backgroundColor: '#0a1628' }}
      >
        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -end-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-colors"
          style={{ backgroundColor: '#4a90d9', color: '#fff', border: '2px solid #2563eb' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? (isRtl ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)
            : (isRtl ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />)
          }
        </button>

        {collapsed ? (
          /* ── Collapsed: icon-only nav ── */
          <nav className="flex flex-col items-center gap-1 pt-10 flex-1">
            {navItems.map((item) => {
              const Icon = getIcon(item.href)
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <NavLink
                      href={item.href}
                      className="flex h-10 w-10 items-center justify-center rounded-md text-sky-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side={isRtl ? 'left' : 'right'}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}

            {/* Divider */}
            <div className="my-2 w-8 border-t border-white/10" />

            {/* Logout icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex h-10 w-10 items-center justify-center rounded-md text-sky-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </form>
              </TooltipTrigger>
              <TooltipContent side={isRtl ? 'left' : 'right'}>
                {logoutLabel}
              </TooltipContent>
            </Tooltip>
          </nav>
        ) : (
          /* ── Expanded: full sidebar ── */
          <>
            {/* User info */}
            <div className="mb-6 p-4">
              <h1 className="text-xl font-bold truncate text-white">{userName}</h1>
              <p className="text-sm text-sky-300">{role}</p>
            </div>

            {/* Nav */}
            <nav className="space-y-1 px-3">
              {navItems.map((item) => {
                const Icon = getIcon(item.href)
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sky-100 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-sky-300" />
                    {item.label}
                  </NavLink>
                )
              })}
            </nav>

            {/* Footer — immediately below nav */}
            <div className="mt-4 border-t border-white/10 pt-3 space-y-1 px-3 pb-4">
              <div className="[&_button]:text-sky-100 [&_button]:hover:bg-white/10 [&_button]:hover:text-white [&_button]:w-full [&_button]:justify-start [&_button]:gap-3">
                <ThemeToggle />
                <LanguageToggle />
              </div>
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full justify-start gap-3 text-sky-100 hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  {logoutLabel}
                </Button>
              </form>
            </div>
          </>
        )}
      </aside>
    </TooltipProvider>
  )
}
