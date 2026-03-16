import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/actions/auth'
import { getTranslations } from 'next-intl/server'
import { GlobalSearch } from '@/components/global-search'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import { CollapsibleSidebar } from '@/components/layout/collapsible-sidebar'

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
      <CollapsibleSidebar
        navItems={navItems}
        userName={userName}
        role={profile.role}
        logoutLabel={tAuth('logout')}
        locale={locale}
      />

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
