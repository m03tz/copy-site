'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { GlobalSearch } from '@/components/global-search'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/actions/auth'

interface NavItem {
  href: string
  label: string
}

interface MobileSidebarProps {
  navItems: NavItem[]
  userName: string
  role: string
  logoutLabel: string
  showSearch?: boolean
}

export function MobileSidebar({
  navItems,
  userName,
  role,
  logoutLabel,
  showSearch = false,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-3 h-14 border-b bg-background/95 backdrop-blur-sm px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold text-sm truncate">{userName}</span>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`md:hidden fixed top-0 start-0 z-50 h-full w-64 bg-background border-e flex flex-col transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div>
            <p className="font-bold text-sm">{userName}</p>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="p-3 border-b shrink-0">
            <GlobalSearch />
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t space-y-1 shrink-0">
          <ThemeToggle />
          <LanguageToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              {logoutLabel}
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
