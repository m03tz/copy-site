'use server'

import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayAppointment {
  id: string
  patient_id: string
  scheduled_start: string
  appointment_type: string
  status: string
  patient: {
    full_name_ar: string
    full_name_en: string | null
  } | null
}

export interface GetDayAppointmentsResult {
  appointments?: DayAppointment[]
  error?: string
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Fetch scheduled/confirmed appointments for a specific date.
 * Used by the AppointmentDayList component for day navigation.
 *
 * @param date - ISO date string in 'yyyy-MM-dd' format
 * @returns appointments ordered chronologically, or error
 */
export async function getDayAppointments(
  date: string
): Promise<GetDayAppointmentsResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Build day boundaries
  const dayStart = new Date(`${date}T00:00:00.000`)
  const dayEnd = new Date(`${date}T23:59:59.999`)

  // Fetch appointments without FK join (FK goes to patients table, not profiles)
  const { data, error } = (await supabase
    .from('appointments')
    .select('id, patient_id, scheduled_start, appointment_type, status')
    .gte('scheduled_start', dayStart.toISOString())
    .lte('scheduled_start', dayEnd.toISOString())
    .in('status', ['scheduled', 'confirmed'])
    .order('scheduled_start', { ascending: true })) as unknown as {
    data: Array<{
      id: string
      patient_id: string
      scheduled_start: string
      appointment_type: string
      status: string
    }> | null
    error: { message: string } | null
  }

  if (error) return { error: error.message }

  // Resolve patient names via separate profiles lookup
  const patientIds = [...new Set((data ?? []).map((a) => a.patient_id))]
  let nameMap: Record<string, { full_name_ar: string; full_name_en: string | null }> = {}

  if (patientIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name_ar, full_name_en')
      .in('id', patientIds)

    nameMap = (profiles ?? []).reduce(
      (acc, p) => {
        acc[p.id] = { full_name_ar: p.full_name_ar, full_name_en: p.full_name_en }
        return acc
      },
      {} as typeof nameMap
    )
  }

  const appointments: DayAppointment[] = (data ?? []).map((row) => ({
    id: row.id,
    patient_id: row.patient_id,
    scheduled_start: row.scheduled_start,
    appointment_type: row.appointment_type,
    status: row.status,
    patient: nameMap[row.patient_id] ?? null,
  }))

  return { appointments }
}
