import { redirect } from 'next/navigation'
import { getAuthenticatedUser, signOut } from '@/lib/actions/auth'
import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { GlobalSearch } from '@/components/global-search'
import { Button } from '@/components/ui/button'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'

export default async function DoctorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const profile = await getAuthenticatedUser()

  // Verify authentication and role
  if (!profile || profile.role !== 'doctor') {
    redirect('/login')
  }

  const t = await getTranslations('nav')
  const tAuth = await getTranslations('auth')

  const navItems = [
    { href: '/doctor/dashboard', label: t('dashboard') },
    { href: '/doctor/patients', label: t('patients') },
    { href: '/doctor/appointments', label: t('appointments') },
    { href: '/doctor/medical-records', label: t('medicalRecords') },
    { href: '/doctor/operations', label: t('operations') },
    { href: '/doctor/schedule', label: t('schedule') },
    { href: '/doctor/financial', label: t('financial') },
  ]

  const userName = profile.full_name_ar || profile.full_name_en || 'Doctor'

  return (
    <div className="flex min-h-screen" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile nav */}
      <MobileSidebar
        navItems={navItems}
        userName={userName}
        role={profile.role}
        logoutLabel={tAuth('logout')}
        showSearch
      />

      {/* Sidebar – desktop only */}
      <aside className="hidden md:block w-64 shrink-0 border-e bg-muted/40 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold">{userName}</h1>
          <p className="text-sm text-muted-foreground">{profile.role}</p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8 space-y-2">
          <ThemeToggle />
          <LanguageToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              {tAuth('logout')}
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-4 md:p-8 pt-16 md:pt-8">
        <div className="mb-6 hidden md:block">
          <GlobalSearch />
        </div>
        {children}
      </main>
    </div>
  )
}
