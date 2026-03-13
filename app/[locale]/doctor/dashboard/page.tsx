import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getDaysUntilDue } from '@/lib/utils/pregnancy'
import { format } from 'date-fns'
import { Calendar, Users, Baby, ShieldPlus } from 'lucide-react'
import { DueDateAlert } from '@/components/pregnancy/due-date-alert'
import { UpcomingOperations } from '@/components/operations/upcoming-operations'
import { StatCard } from '@/components/dashboard/stat-card'
import { AppointmentDayList } from '@/components/dashboard/appointment-day-list'
import { AddStaffButton } from '@/components/dashboard/add-staff-button'
import { StaffList } from '@/components/dashboard/staff-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Always show fresh data — no static rendering for the doctor dashboard
export const dynamic = 'force-dynamic'

export default async function DoctorDashboard() {
  const t = await getTranslations('dashboard')
  const supabase = await createClient()

  // ─── Shared date boundaries ────────────────────────────────────────────────

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = format(today, 'yyyy-MM-dd')

  const dayStart = new Date(`${todayStr}T00:00:00.000`)
  const dayEnd = new Date(`${todayStr}T23:59:59.999`)

  const twoWeeksFromNow = new Date(today)
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

  // ─── Type for raw appointment rows ──────────────────────────────────────
  type RawAppointmentRow = {
    id: string
    patient_id: string
    scheduled_start: string
    appointment_type: string
    status: string
  }

  // ─── Parallel data fetching with error handling ──────────────────────────

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
  let staffMembers: { id: string; full_name_ar: string; full_name_en: string | null; role: string; email: string | null; phone: string }[] = []
  let upcomingOperations: { id: string; patient_name: string; operation_date: string; hospital_name: string; operation_type: string; days_until: number }[] = []

  try {
    const [
      appointmentsResult,
      patientsCountResult,
      approachingDueCountResult,
      approachingDueDataResult,
      staffResult,
      operationsResult,
    ] = await Promise.all([
      // 1. Today's appointments (no FK join — patient names resolved below)
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

      // 2. Total patients count
      supabase.from('patients').select('id', { count: 'exact', head: true }),

      // 3. Approaching due count
      supabase
        .from('pregnancies')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('expected_due_date', today.toISOString().split('T')[0])
        .lte('expected_due_date', twoWeeksFromNow.toISOString().split('T')[0]),

      // 4. Approaching due data
      supabase
        .from('pregnancies')
        .select('id, patient_id, expected_due_date, lmp_date')
        .eq('status', 'active')
        .gte('expected_due_date', today.toISOString().split('T')[0])
        .lte('expected_due_date', twoWeeksFromNow.toISOString().split('T')[0])
        .order('expected_due_date', { ascending: true }),

      // 5. Staff members (doctors and secretaries)
      supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en, role, email, phone')
        .in('role', ['doctor', 'secretary'])
        .order('role', { ascending: true }),

      // 6. Upcoming operations (today and future)
      supabase
        .from('operations')
        .select(`id, patient_id, operation_date, hospital_name, operation_type, patients!inner(profiles!inner(full_name_ar))`)
        .gte('operation_date', todayStr)
        .order('operation_date', { ascending: true })
        .limit(10),
    ])

    // Process today's appointments — resolve patient names via profiles lookup
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

    // Staff members
    staffMembers = (staffResult.data ?? []) as typeof staffMembers

    // Upcoming operations
    const today0 = new Date()
    today0.setHours(0, 0, 0, 0)
    upcomingOperations = (operationsResult.data ?? []).map((row: Record<string, unknown>) => {
      const pat = row.patients as { profiles: { full_name_ar: string } } | null
      const opDate = new Date(row.operation_date as string)
      opDate.setHours(0, 0, 0, 0)
      const daysUntil = Math.floor((opDate.getTime() - today0.getTime()) / 86400000)
      return {
        id: row.id as string,
        patient_name: pat?.profiles?.full_name_ar ?? '—',
        operation_date: row.operation_date as string,
        hospital_name: row.hospital_name as string,
        operation_type: row.operation_type as string,
        days_until: daysUntil,
      }
    })
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('doctorTitle')}</h1>

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

      {/* Two-column layout: appointments + operations/due-date */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AppointmentDayList
            initialAppointments={todayAppointments}
            initialDate={todayStr}
          />
        </div>
        <div className="space-y-6">
          <UpcomingOperations operations={upcomingOperations} />
          <DueDateAlert alerts={alerts} />
        </div>
      </div>

      {/* Staff Management */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldPlus className="h-4 w-4 text-muted-foreground" />
              {t('staffManagement')}
            </CardTitle>
            <AddStaffButton />
          </div>
        </CardHeader>
        <CardContent>
          <StaffList members={staffMembers} />
        </CardContent>
      </Card>

    </div>
  )
}
