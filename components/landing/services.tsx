'use client'

import { useTranslations } from 'next-intl'
import { Hospital, Baby, HeartPulse, Stethoscope } from 'lucide-react'

const services = [
  {
    icon: Hospital,
    titleKey: 'serviceObgyn',
    descKey: 'serviceObgynDesc',
  },
  {
    icon: Baby,
    titleKey: 'servicePregnancy',
    descKey: 'servicePregnancyDesc',
  },
  {
    icon: HeartPulse,
    titleKey: 'serviceInfertility',
    descKey: 'serviceInfertilityDesc',
  },
  {
    icon: Stethoscope,
    titleKey: 'serviceSurgery',
    descKey: 'serviceSurgeryDesc',
  },
] as const

export function Services() {
  const t = useTranslations('landing')

  return (
    <section id="services" className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          {t('servicesTitle')}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <div
                key={index}
                className="bg-medical-blue-50 p-6 rounded-xl hover:shadow-md transition-shadow border border-transparent hover:border-medical-blue-100"
              >
                <Icon className="w-12 h-12 text-medical-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  {t(service.titleKey)}
                </h3>
                <p className="text-muted-foreground">
                  {t(service.descKey)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
