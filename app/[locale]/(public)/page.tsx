'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'
import {
  Stethoscope,
  Baby,
  HeartPulse,
  Activity,
  MapPin,
  Phone,
  Clock,
  ChevronRight,
} from 'lucide-react'

export default function HomePage() {
  const t = useTranslations('landing')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <div className="flex flex-col min-h-screen bg-white" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="relative w-12 h-12">
              <Image src="/images/site logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="text-xl font-black text-primary tracking-tight">
              {t('clinicName')}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#about" className="hover:text-primary transition-colors">{t('navAbout')}</a>
            <a href="#services" className="hover:text-primary transition-colors">{t('navServices')}</a>
            <a href="#contact" className="hover:text-primary transition-colors">{t('navContact')}</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/" locale={locale === 'en' ? 'ar' : 'en'} className="text-xs font-medium hover:underline">
              {locale === 'en' ? 'العربية' : 'English'}
            </Link>
            <Button asChild size="sm">
              <Link href="/login">{t('navLogin')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero */}
        <section id="about" className="relative min-h-[85vh] flex flex-col items-center justify-center py-12 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
            <div className="max-w-3xl space-y-6">
              <div className="space-y-3 flex flex-col items-center">
                <div className="mb-8 flex items-center justify-center gap-6 lg:gap-10">
                  <div className="relative w-36 h-36 lg:w-56 lg:h-56">
                    <Image src="/images/site logo.png" alt="Clinic Logo" fill className="object-contain" priority />
                  </div>
                  <div className="relative w-36 h-36 lg:w-56 lg:h-56 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                    <Image src="/images/fadi.jpg" alt="Dr. Fadi" fill className="object-cover" priority />
                  </div>
                </div>
                <h1 className="text-3xl lg:text-5xl font-black text-slate-900 leading-[1.1]">
                  {t('clinicName')}
                </h1>
                <p className="text-base lg:text-lg text-slate-500 max-w-xl mx-auto font-medium">
                  {t('heroTitle')}
                </p>
                <p className="text-sm text-slate-400 max-w-lg mx-auto">
                  {t('heroSubtitle')}
                </p>
              </div>

              <div className="flex justify-center">
                <Button asChild size="lg" className="rounded-full px-8 text-base h-12 shadow-lg">
                  <Link href="/login" className="flex items-center gap-2">
                    {t('bookAppointment')}
                    <ChevronRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
                  </Link>
                </Button>
              </div>
            </div>

            {/* About card */}
            <div className="mt-12 w-full max-w-xl relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-primary/5 rounded-[2rem] blur opacity-75 group-hover:opacity-100 transition duration-1000" />
              <Card className="relative border-none shadow-xl overflow-hidden rounded-[2rem]">
                <CardContent className="p-6 lg:p-10 space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-0.5 w-8 bg-primary/30 rounded-full" />
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{t('aboutDoctor')}</h3>
                    <div className="h-0.5 w-8 bg-primary/30 rounded-full" />
                  </div>
                  <p className="text-slate-600 leading-relaxed text-sm lg:text-base font-medium">
                    {t('aboutDoctorText')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="py-16 lg:py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center text-center space-y-3 mb-12">
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{t('servicesTitle')}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-7xl mx-auto">
              {[
                { icon: Stethoscope, title: t('serviceObgyn'), desc: t('serviceObgynDesc') },
                { icon: Baby, title: t('servicePregnancy'), desc: t('servicePregnancyDesc') },
                { icon: HeartPulse, title: t('serviceInfertility'), desc: t('serviceInfertilityDesc') },
                { icon: Activity, title: t('serviceSurgery'), desc: t('serviceSurgeryDesc') },
              ].map((service, index) => (
                <div key={index} className="rounded-2xl bg-[#eef2ff] p-6 flex flex-col gap-4">
                  <div className="p-2.5 bg-white rounded-xl w-fit shadow-sm">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{service.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{service.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-16 lg:py-24 bg-slate-100">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center text-center space-y-3 mb-12">
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{t('contactTitle')}</h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start max-w-5xl mx-auto">
              <div className="space-y-6">
                {/* Address */}
                <div className="flex gap-4 items-start">
                  <div className="p-2.5 bg-blue-100 rounded-full shrink-0">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-0.5">{t('address')}</h4>
                    <p className="text-slate-500 text-sm">{t('clinicAddress')}</p>
                  </div>
                </div>

                {/* Phone — WhatsApp link */}
                <div className="flex gap-4 items-start">
                  <div className="p-2.5 bg-green-100 rounded-full shrink-0">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-0.5">{t('phone')}</h4>
                    <a
                      href={`https://wa.me/${t('clinicPhone').replace(/\s+/g, '').replace('+', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 font-medium text-sm hover:underline"
                      dir="ltr"
                    >
                      {t('clinicPhone')}
                    </a>
                  </div>
                </div>

                {/* Working hours */}
                <div className="flex gap-4 items-start">
                  <div className="p-2.5 bg-blue-100 rounded-full shrink-0">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-0.5">{t('workingHours')}</h4>
                    <p className="text-slate-500 text-sm">{t('weekdayHours')}</p>
                    <p className="text-slate-500 text-sm">{t('weekendHours')}</p>
                  </div>
                </div>
              </div>

              {/* Booking card */}
              <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">{t('bookingCTA')}</h3>
                  <p className="text-slate-400 text-sm">{t('bookingDescription')}</p>
                  <Button asChild size="lg" className="px-10 h-11">
                    <Link href="/login">{t('bookNow')}</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

    </div>
  )
}
