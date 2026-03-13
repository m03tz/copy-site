'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PrescriptionCard } from '@/components/prescriptions/prescription-card'
import { PrescriptionForm } from '@/components/prescriptions/prescription-form'
import { FileX, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MedicationRow {
  id: string
  medical_record_id: string
  medication_name: string
  dosage: string
  duration: string
  instructions?: string | null
  quantity?: string | null
}

interface VisitWithPrescriptions {
  id: string
  visit_date: string
  created_at?: string
  prescriptions: MedicationRow[]
}

interface PrescriptionListProps {
  visits: VisitWithPrescriptions[]
  patientName: string
  patientId?: string
}

export function PrescriptionList({ visits, patientName, patientId }: PrescriptionListProps) {
  const t = useTranslations('prescriptions')
  const [addOpen, setAddOpen] = useState(false)

  const visitsWithPrescriptions = visits
    .filter((v) => v.prescriptions && v.prescriptions.length > 0)
    .sort((a, b) => {
      const dateDiff = b.visit_date.localeCompare(a.visit_date)
      if (dateDiff !== 0) return dateDiff
      // Same date: sort by created_at descending (newest first)
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          {patientId && (
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 me-1" />
              {t('create')}
            </Button>
          )}
        </div>

        {visitsWithPrescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <FileX className="h-10 w-10 opacity-40" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        ) : (
          visitsWithPrescriptions.map((visit) => (
            <PrescriptionCard
              key={visit.id}
              medications={visit.prescriptions}
              visitDate={visit.visit_date}
              patientName={patientName}
              patientId={patientId}
            />
          ))
        )}
      </div>

      {/* Add Prescription Dialog — opens form directly, no visit selection needed */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('create')}</DialogTitle>
          </DialogHeader>
          <PrescriptionForm
            patientId={patientId!}
            patientName={patientName}
            onSuccess={() => setAddOpen(false)}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
