'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { VisitCard } from '@/components/medical-records/visit-card'
import { Search, CalendarDays, CheckCircle2 } from 'lucide-react'

interface VisitData {
  id: string
  patient_id: string
  visit_date: string
  chief_complaint: string | null
  diagnosis: string | null
  treatment_plan: string | null
  vital_signs: Record<string, string> | null
  notes: string | null
  appointment_id: string | null
  created_at: string
  is_ended: boolean
  visit_fee: number | null
  prescriptions: {
    id: string
    medication_name: string
    dosage: string
    duration: string
    instructions: string | null
  }[]
  patient_name_ar: string
  patient_name_en: string | null
}

interface MedicalRecordsTabsProps {
  todayVisits: VisitData[]
  allVisits: VisitData[]
}

// Compute day queue numbers for a list of visits (already sorted oldest→newest within day)
function addQueueNums(visits: VisitData[]) {
  const dayCounters: Record<string, number> = {}
  return visits.map((v) => {
    const day = v.visit_date.slice(0, 10)
    dayCounters[day] = (dayCounters[day] ?? 0) + 1
    return { ...v, dayQueueNum: dayCounters[day] }
  })
}

export function MedicalRecordsTabs({ todayVisits, allVisits }: MedicalRecordsTabsProps) {
  const t = useTranslations('medicalRecords')
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [todaySearch, setTodaySearch] = useState('')

  function goToPatient(patientId: string) {
    const locale = (params?.locale as string) || 'ar'
    const role = pathname?.includes('/secretary/') ? 'secretary' : 'doctor'
    router.push(`/${locale}/${role}/patients/${patientId}`)
  }

  function matchesQuery(visit: VisitData, query: string): boolean {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return !!(
      visit.patient_name_ar?.toLowerCase().includes(q) ||
      visit.patient_name_en?.toLowerCase().includes(q) ||
      visit.chief_complaint?.toLowerCase().includes(q) ||
      visit.diagnosis?.toLowerCase().includes(q) ||
      visit.notes?.toLowerCase().includes(q) ||
      visit.visit_date.includes(q)
    )
  }

  // Filter all visits by search query
  const filteredVisits = allVisits.filter((visit) => matchesQuery(visit, searchQuery))

  const todayWithQueue = addQueueNums(todayVisits).filter((visit) => matchesQuery(visit, todaySearch))

  return (
    <Tabs defaultValue="today" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="today" className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          {t('todayTab')} ({todayVisits.length})
        </TabsTrigger>
        <TabsTrigger value="ended" className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {t('endedVisits')} ({allVisits.length})
        </TabsTrigger>
      </TabsList>

      {/* Today's Active Visits */}
      <TabsContent value="today" className="mt-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={todaySearch}
            onChange={(e) => setTodaySearch(e.target.value)}
            className="ps-9"
          />
        </div>
        {todayWithQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <CalendarDays className="h-10 w-10 opacity-40" />
            <p className="text-sm">{t('noVisitsToday')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayWithQueue.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                patientId={visit.patient_id}
                canPrescribe={false}
                canEndVisit={true}
                patientName={visit.patient_name_ar || visit.patient_name_en || ''}
                dayQueueNum={visit.dayQueueNum}
                redirectAfterEnd={false}
                onPatientClick={() => goToPatient(visit.patient_id)}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Ended Visits — all ended visits pending 24h deletion */}
      <TabsContent value="ended" className="mt-6 space-y-4">
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

        {filteredVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <CheckCircle2 className="h-10 w-10 opacity-40" />
            <p className="text-sm">{t('noVisitsFound')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                patientId={visit.patient_id}
                canPrescribe={false}
                canEndVisit={true}
                patientName={visit.patient_name_ar || visit.patient_name_en || ''}
                redirectAfterEnd={false}
                onPatientClick={() => goToPatient(visit.patient_id)}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
