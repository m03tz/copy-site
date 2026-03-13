'use client'

import { useTranslations } from 'next-intl'
import { Baby } from 'lucide-react'
import { PregnancyCard } from '@/components/pregnancy/pregnancy-card'
import { PregnancyForm } from '@/components/pregnancy/pregnancy-form'
import type { Pregnancy, PregnancyMeasurement } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type PregnancyWithMeasurements = Pregnancy & {
  pregnancy_measurements: PregnancyMeasurement[]
}

interface LatestVitals {
  blood_pressure?: string
  weight?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PregnancyListProps {
  pregnancies: PregnancyWithMeasurements[]
  patientId: string
  latestVitals?: LatestVitals | null
}

export function PregnancyList({ pregnancies, patientId, latestVitals }: PregnancyListProps) {
  const t = useTranslations('pregnancy')

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <PregnancyForm patientId={patientId} />
      </div>

      {/* Empty state */}
      {pregnancies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <Baby className="h-10 w-10 opacity-40" />
          <p className="text-sm">{t('noPregnancies')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pregnancies.map((pregnancy) => (
            <PregnancyCard key={pregnancy.id} pregnancy={pregnancy} latestVitals={latestVitals} />
          ))}
        </div>
      )}
    </div>
  )
}
