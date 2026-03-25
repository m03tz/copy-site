'use server'

import { createClient } from '@/lib/supabase/server'

export interface ExportPatient {
  full_name_ar: string
  full_name_en: string
  phone: string
  date_of_birth: string
  blood_type: string
  national_id: string
  patient_code: string
}

export interface ExportAppointment {
  patient_name: string
  patient_code: string
  phone: string
  scheduled_start: string
  scheduled_end: string
  appointment_type: string
  status: string
}

/**
 * Fetch all patients for Excel export.
 * Only doctor or secretary can access.
 */
export async function getExportPatients(): Promise<{
  data?: ExportPatient[]
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Unauthorized' }
  }

  type ProfileRow = {
    full_name_ar: string
    full_name_en: string | null
    phone: string
    patients: { date_of_birth: string; blood_type: string | null; national_id: string | null; patient_code: string | null } | null
  }

  const allData: ProfileRow[] = []
  const PAGE = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name_ar, full_name_en, phone, patients(date_of_birth, blood_type, national_id, patient_code)')
      .eq('role', 'patient')
      .order('full_name_ar')
      .range(from, from + PAGE - 1) as { data: ProfileRow[] | null; error: unknown }

    if (error) return { error: 'Failed to fetch patients' }
    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }

  return {
    data: allData.map((p) => {
      const patient = Array.isArray(p.patients) ? p.patients[0] : p.patients
      return {
        full_name_ar: p.full_name_ar,
        full_name_en: p.full_name_en ?? '',
        phone: p.phone,
        date_of_birth: patient?.date_of_birth ?? '',
        blood_type: patient?.blood_type ?? '',
        national_id: patient?.national_id ?? '',
        patient_code: patient?.patient_code ?? '',
      }
    }),
  }
}

/**
 * Fetch appointments for Excel export.
 * Optionally filter by a specific date (YYYY-MM-DD).
 * Only doctor or secretary can access.
 */
export async function getExportAppointments(dateFilter?: string): Promise<{
  data?: ExportAppointment[]
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Unauthorized' }
  }

  let query = supabase
    .from('appointments')
    .select('patient_id, scheduled_start, scheduled_end, appointment_type, status')
    .order('scheduled_start', { ascending: true })

  if (dateFilter) {
    const dayStart = `${dateFilter}T00:00:00.000`
    const dayEnd = `${dateFilter}T23:59:59.999`
    query = query.gte('scheduled_start', dayStart).lte('scheduled_start', dayEnd)
  }

  const { data, error } = await query as {
    data: {
      patient_id: string
      scheduled_start: string
      scheduled_end: string
      appointment_type: string
      status: string
    }[] | null
    error: unknown
  }

  if (error || !data) return { error: 'Failed to fetch appointments' }

  // Get patient names, codes, and phones
  const patientIds = [...new Set(data.map((a) => a.patient_id))]
  const { data: patients } = await supabase
    .from('profiles')
    .select('id, full_name_ar, phone, patients(patient_code)')
    .in('id', patientIds) as {
      data: {
        id: string
        full_name_ar: string
        phone: string
        patients: { patient_code: string | null } | { patient_code: string | null }[] | null
      }[] | null
    }

  const patientMap = new Map(
    (patients ?? []).map((p) => {
      const patientRecord = Array.isArray(p.patients) ? p.patients[0] : p.patients
      return [p.id, {
        name: p.full_name_ar,
        phone: p.phone ?? '',
        code: patientRecord?.patient_code ?? '',
      }]
    })
  )

  return {
    data: data.map((a) => {
      const info = patientMap.get(a.patient_id)
      return {
        patient_name: info?.name ?? '',
        patient_code: info?.code ?? '',
        phone: info?.phone ?? '',
        scheduled_start: a.scheduled_start,
        scheduled_end: a.scheduled_end,
        appointment_type: a.appointment_type,
        status: a.status,
      }
    }),
  }
}
