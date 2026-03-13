'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, CalendarDays, Pill, FileX, User } from 'lucide-react'
import { format } from 'date-fns'
import { Link } from '@/i18n/routing'
import { PrescriptionPrint } from '@/components/prescriptions/prescription-print'

interface MedicationItem {
  id: string
  medication_name: string
  dosage: string
  duration: string
  instructions: string | null
}

interface PrescriptionGroup {
  medical_record_id: string
  patient_id: string
  patient_name_ar: string
  patient_name_en: string | null
  visit_date: string
  medications: MedicationItem[]
}

interface PrescriptionsPageClientProps {
  todayGroups: PrescriptionGroup[]
  allGroups: PrescriptionGroup[]
}

function PrescriptionGroupCard({ group }: { group: PrescriptionGroup }) {
  const t = useTranslations('prescriptionsPage')
  const tPrescriptions = useTranslations('prescriptions')

  let formattedDate = group.visit_date
  try {
    formattedDate = format(new Date(group.visit_date), 'dd-MM-yyyy')
  } catch {
    // keep original
  }

  const patientName = group.patient_name_ar || group.patient_name_en || ''

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {formattedDate}
            </CardTitle>
            <Link
              href={`/doctor/patients/${group.patient_id}`}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <User className="h-3.5 w-3.5" />
              {patientName}
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="divide-y">
          {group.medications.map((med) => (
            <div key={med.id} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{med.medication_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tPrescriptions('form.dosage')}: {med.dosage} · {tPrescriptions('form.duration')}: {med.duration}
                  </p>
                  {med.instructions && (
                    <p className="text-xs text-muted-foreground">
                      {tPrescriptions('form.instructions')}: {med.instructions}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons moved to bottom */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Pill className="h-3 w-3" />
            {group.medications.length} {t('medicationsCount')}
          </Badge>
          <PrescriptionPrint
            medications={group.medications}
            visitDate={group.visit_date}
            patientName={patientName}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function PrescriptionsPageClient({ todayGroups, allGroups }: PrescriptionsPageClientProps) {
  const t = useTranslations('prescriptionsPage')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter groups by search query
  const filteredGroups = allGroups.filter((group) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      group.patient_name_ar?.toLowerCase().includes(query) ||
      group.patient_name_en?.toLowerCase().includes(query) ||
      group.medications.some((m) =>
        m.medication_name.toLowerCase().includes(query)
      ) ||
      group.visit_date.includes(query)
    )
  })

  return (
    <div className="space-y-6">
      {/* Today's Prescriptions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {t('todayPrescriptions')} ({todayGroups.length})
        </h2>
        {todayGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3 border rounded-lg">
            <Pill className="h-10 w-10 opacity-40" />
            <p className="text-sm">{t('noPrescriptionsToday')}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {todayGroups.map((group) => (
              <PrescriptionGroupCard key={group.medical_record_id} group={group} />
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-t" />

      {/* All Prescriptions with Search */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t('allPrescriptions')}</h2>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <FileX className="h-10 w-10 opacity-40" />
            <p className="text-sm">{t('noPrescriptionsFound')}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredGroups.map((group) => (
              <PrescriptionGroupCard key={group.medical_record_id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
