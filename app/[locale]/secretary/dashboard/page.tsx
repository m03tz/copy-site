import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getDaysUntilDue } from '@/lib/utils/pregnancy'
import { format } from 'date-fns'
import { Calendar, Users, Baby } from 'lucide-react'
import { DueDateAlert } from '@/components/pregnancy/due-date-alert'
import { StatCard } from '@/components/dashboard/stat-card'
import { AppointmentDayList } from '@/components/dashboard/appointment-day-list'
import { PatientAutocomplete } from '@/components/dashboard/patient-autocomplete'

export const dynamic = 'force-dynamic'

export default async function SecretaryDashboard() {
  const t = await getTranslations('dashboard')
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = format(today, 'yyyy-MM-dd')

  const dayStart = new Date(`${todayStr}T00:00:00.000`)
  const dayEnd = new Date(`${todayStr}T23:59:59.999`)

  const twoWeeksFromNow = new Date(today)
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

  type RawAppointmentRow = {
    id: string
    patient_id: string
    scheduled_start: string
    appointment_type: string
    status: string
  }

  let todayAppointments: {
    id: string
    patient_id: string
    scheduled_start: string
    appointment_type: string
    status: string
    patient: { full_name_ar: string; full_name_en: string | null } | null
  }[] = []
  let todayCount = 0
  let totalPatients = 0
  let approachingDueCount = 0
  let alerts: {
    patient_id: string
    patient_name: string
    expected_due_date: string
    days_remaining: number
  }[] = []

  try {
    const [
      appointmentsResult,
      patientsCountResult,
      approachingDueCountResult,
      approachingDueDataResult,
    ] = await Promise.all([
      (supabase
        .from('appointments')
        .select('id, patient_id, scheduled_start, appointment_type, status')
        .gte('scheduled_start', dayStart.toISOString())
        .lte('scheduled_start', dayEnd.toISOString())
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_start', { ascending: true })) as unknown as Promise<{
        data: RawAppointmentRow[] | null
        error: { message: string } | null
      }>,

      supabase.from('patients').select('id', { count: 'exact', head: true }),

      supabase
        .from('pregnancies')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('expected_due_date', today.toISOString().split('T')[0])
        .lte('expected_due_date', twoWeeksFromNow.toISOString().split('T')[0]),

      supabase
        .from('pregnancies')
        .select('id, patient_id, expected_due_date, lmp_date')
        .eq('status', 'active')
        .gte('expected_due_date', today.toISOString().split('T')[0])
        .lte('expected_due_date', twoWeeksFromNow.toISOString().split('T')[0])
        .order('expected_due_date', { ascending: true }),
    ])

    // Resolve patient names
    const rawAppointments: RawAppointmentRow[] = appointmentsResult.data ?? []
    const appointmentPatientIds = [...new Set(rawAppointments.map((a) => a.patient_id))]

    let appointmentPatientNames: Record<string, { full_name_ar: string; full_name_en: string | null }> = {}
    if (appointmentPatientIds.length > 0) {
      const { data: apptProfiles } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en')
        .in('id', appointmentPatientIds)

      appointmentPatientNames = (apptProfiles ?? []).reduce(
        (acc, p) => {
          acc[p.id] = { full_name_ar: p.full_name_ar, full_name_en: p.full_name_en }
          return acc
        },
        {} as typeof appointmentPatientNames
      )
    }

    todayAppointments = rawAppointments.map((row) => ({
      ...row,
      patient: appointmentPatientNames[row.patient_id] ?? null,
    }))

    todayCount = todayAppointments.length
    totalPatients = patientsCountResult.count ?? 0
    approachingDueCount = approachingDueCountResult.count ?? 0

    // Process due-date alerts
    const approachingDue = approachingDueDataResult.data ?? []
    const patientIds = [...new Set(approachingDue.map((p) => p.patient_id))]

    let profileNames: Record<string, { full_name_ar: string; full_name_en: string | null }> = {}
    if (patientIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en')
        .in('id', patientIds)

      profileNames = (profiles ?? []).reduce(
        (acc, p) => {
          acc[p.id] = { full_name_ar: p.full_name_ar, full_name_en: p.full_name_en }
          return acc
        },
        {} as typeof profileNames
      )
    }

    const alertsByPatient = new Map<string, (typeof alerts)[0]>()
    for (const preg of approachingDue) {
      const existing = alertsByPatient.get(preg.patient_id)
      const daysRemaining = getDaysUntilDue(preg.expected_due_date)
      const name = profileNames[preg.patient_id]
      const patientName = name?.full_name_ar || name?.full_name_en || ''

      if (!existing || daysRemaining < existing.days_remaining) {
        alertsByPatient.set(preg.patient_id, {
          patient_id: preg.patient_id,
          patient_name: patientName,
          expected_due_date: preg.expected_due_date,
          days_remaining: daysRemaining,
        })
      }
    }

    alerts = Array.from(alertsByPatient.values())
      .filter((a) => a.days_remaining >= 0)
      .sort((a, b) => a.days_remaining - b.days_remaining)
  } catch (error) {
    console.error('Secretary dashboard data fetch error:', error)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('secretaryTitle')}</h1>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t('todayAppointments')}
          value={todayCount}
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatCard
          label={t('totalPatients')}
          value={totalPatients}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label={t('approachingDueDate')}
          value={approachingDueCount}
          icon={<Baby className="h-4 w-4" />}
        />
      </div>

      {/* Quick patient search */}
      <PatientAutocomplete basePath="/secretary/patients" />

      {/* Two-column layout: appointments + due-date alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AppointmentDayList
            initialAppointments={todayAppointments}
            initialDate={todayStr}
            patientBasePath="/secretary/patients"
          />
        </div>
        <div>
          <DueDateAlert alerts={alerts} patientBasePath="/secretary/patients" />
        </div>
      </div>
    </div>
  )
}
