'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisitCard } from '@/components/medical-records/visit-card'
import { VisitForm } from '@/components/medical-records/visit-form'
import { Plus, ClipboardList, CheckCircle2 } from 'lucide-react'

interface PrescriptionRow {
  id: string
  medication_name: string
  dosage: string
  duration: string
  instructions?: string | null
}

interface VisitRecord {
  id: string
  visit_date: string
  created_at?: string
  notes: string | null
  appointment_id?: string | null
  is_ended?: boolean
  visit_fee?: number | null
  medication_only?: boolean
  prescriptions: PrescriptionRow[]
}

interface VisitListProps {
  visits: VisitRecord[]
  patientId: string
  /** Whether the current user can create prescriptions (doctor only) */
  canPrescribe?: boolean
  /** Whether the current user can end visits and set fees (doctor + secretary) */
  canEndVisit?: boolean
}

export function VisitList({ visits, patientId, canPrescribe = true, canEndVisit }: VisitListProps) {
  const t = useTranslations('visits')
  const [newVisitOpen, setNewVisitOpen] = useState(false)

  // Exclude medication-only records; data is already sorted oldest→newest from server
  const sortedVisits = visits.filter((v) => !v.medication_only)

  // Compute day queue numbers: for each unique visit_date, assign sequential numbers
  const dayCounters: Record<string, number> = {}
  const visitsWithQueue = sortedVisits.map((v) => {
    const day = v.visit_date.slice(0, 10) // YYYY-MM-DD
    dayCounters[day] = (dayCounters[day] ?? 0) + 1
    return { ...v, dayQueueNum: dayCounters[day] }
  })

  // Split into active and ended (preserve oldest-first order)
  const activeVisits = visitsWithQueue.filter((v) => !v.is_ended)
  const endedVisits = visitsWithQueue.filter((v) => v.is_ended)

  const hasAny = sortedVisits.length > 0

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <Button size="sm" onClick={() => setNewVisitOpen(true)}>
          <Plus className="h-4 w-4 me-1" />
          {t('create')}
        </Button>
      </div>

      {/* Empty state */}
      {!hasAny && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <ClipboardList className="h-10 w-10 opacity-40" />
          <p className="text-sm">{t('empty')}</p>
        </div>
      )}

      {/* Active visits */}
      {activeVisits.length > 0 && (
        <div className="space-y-3">
          {activeVisits.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              patientId={patientId}
              canPrescribe={canPrescribe}
              canEndVisit={canEndVisit}
              dayQueueNum={visit.dayQueueNum}
              redirectAfterEnd={false}
            />
          ))}
        </div>
      )}

      {/* Ended visits section */}
      {endedVisits.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-2 border-t">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <h3 className="text-base font-semibold text-muted-foreground">
              {t('endedVisits')}
            </h3>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {endedVisits.length}
            </span>
          </div>
          <div className="space-y-3">
            {endedVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                patientId={patientId}
                canPrescribe={canPrescribe}
                canEndVisit={canEndVisit}
                dayQueueNum={visit.dayQueueNum}
                redirectAfterEnd={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* New Visit Dialog */}
      <Dialog open={newVisitOpen} onOpenChange={setNewVisitOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('create')}</DialogTitle>
          </DialogHeader>
          <VisitForm
            patientId={patientId}
            onSuccess={() => setNewVisitOpen(false)}
            onCancel={() => setNewVisitOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
