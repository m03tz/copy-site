'use client'

import { useTranslations } from 'next-intl'
import { Pill } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Prescription {
  id: string
  medical_record_id: string
  medication_name: string
  dosage: string
  duration: string
  instructions: string | null  // stores pills_per_day
  quantity: string | null      // stores pill_count
}

interface Visit {
  id: string
  visit_date: string
  prescriptions: Prescription[]
}

interface CurrentMedicationsProps {
  visits: Visit[]
}

export function CurrentMedications({ visits }: CurrentMedicationsProps) {
  const t = useTranslations('patients.medications')

  // Find the latest visit that has prescriptions (visits sorted oldest-first, search from end)
  const latestVisitWithPrescriptions = [...visits].reverse().find(
    (visit) => visit.prescriptions && visit.prescriptions.length > 0
  )

  if (!latestVisitWithPrescriptions) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('noMedications')}</p>
        </CardContent>
      </Card>
    )
  }

  const { prescriptions, visit_date } = latestVisitWithPrescriptions

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pill className="h-4 w-4" />
          {t('title')}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('fromVisit')} {new Date(visit_date).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-start px-4 py-2 font-medium text-xs text-muted-foreground">Drug</th>
                <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground">Dose</th>
                <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground">Per/Day</th>
                <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground">Duration</th>
                <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((prescription) => (
                <tr key={prescription.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-semibold">{prescription.medication_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{prescription.dosage}</td>
                  <td className="px-3 py-2 text-muted-foreground">{prescription.instructions ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{prescription.duration}</td>
                  <td className="px-3 py-2 text-muted-foreground">{prescription.quantity ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
