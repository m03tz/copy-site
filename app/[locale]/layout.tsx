import type { Metadata } from "next"
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeProvider } from '@/components/theme-provider'
import "../globals.css"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const title = locale === 'ar' ? 'عيادة الدكتور فادي' : 'Dr. Fadi Clinic'
  const description = locale === 'ar'
    ? 'نظام إدارة العيادة للمواعيد والسجلات الطبية'
    : 'Clinic management system for appointments and medical records'

  return {
    title,
    description,
    icons: {
      icon: '/images/site logo.png',
      shortcut: '/images/site logo.png',
      apple: '/images/site logo.png',
    },
  }
}

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as 'ar' | 'en')) {
    notFound()
  }

  const messages = await getMessages()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <style>{`
          body {
            font-family: ${locale === 'ar' ? "'Tahoma', 'Arial', sans-serif" : "system-ui, -apple-system, sans-serif"};
          }
        `}</style>
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
