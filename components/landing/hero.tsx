'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import Image from 'next/image'

export function Hero() {
  const t = useTranslations('landing')

  return (
    <section
      id="about"
      className="bg-gradient-to-b from-medical-blue-50 to-background py-16 sm:py-24"
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Doctor photo and clinic logo */}
        <div className="flex items-center justify-center gap-8 mb-12">
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-medical-blue-200 shadow-lg">
            <Image
              src="/images/fadi.jpg"
              alt={t('clinicName')}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="relative w-64 h-64 sm:w-72 sm:h-72">
            <Image
              src="/images/site logo.png"
              alt={t('clinicName')}
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left column: Doctor info and CTA */}
          <div>
            <p className="text-medical-blue-600 font-semibold text-sm uppercase tracking-wide">
              {t('aboutDoctor')}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mt-2">
              {t('clinicName')}
            </h1>
            <p className="text-xl text-muted-foreground mt-4">
              {t('heroTitle')}
            </p>
            <p className="text-lg text-muted-foreground mt-2">
              {t('heroSubtitle')}
            </p>
            <Link
              href="/login"
              className="inline-block mt-8 px-8 py-4 bg-medical-blue-600 text-white text-lg rounded-lg hover:bg-medical-blue-700 transition-colors shadow-lg"
            >
              {t('bookAppointment')}
            </Link>
          </div>

          {/* Right column: Credentials card */}
          <div className="bg-card rounded-2xl shadow-lg p-8 border border-medical-blue-100">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {t('aboutDoctor')}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('aboutDoctorText')}
            </p>
            <div className="w-16 h-1 bg-medical-blue-500 rounded mt-6" />
          </div>
        </div>
      </div>
    </section>
  )
}
