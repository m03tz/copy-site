'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/actions/auth'

export type SearchResult = {
  id: string
  type: 'patient' | 'appointment' | 'visit'
  title: string
  subtitle: string
  href: string
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const profile = await getAuthenticatedUser()
  if (!profile || !['doctor', 'secretary'].includes(profile.role)) return []

  const supabase = await createClient()
  const q = query.trim()
  const rolePrefix = profile.role === 'doctor' ? '/doctor' : '/secretary'

  const results: SearchResult[] = []

  // Search patients by name, phone, or patient_code
  // First try exact/prefix match on patient_code via patients table
  const { data: codeMatches } = await supabase
    .from('patients')
    .select('id, patient_code')
    .ilike('patient_code', `${q}%`)
    .limit(5)

  const codeMatchIds = (codeMatches ?? []).map((p) => p.id)

  // Search profiles by name/phone, then merge with code matches
  const { data: nameMatches } = await supabase
    .from('profiles')
    .select('id, full_name_ar, full_name_en, phone, role')
    .eq('role', 'patient')
    .or(`full_name_ar.ilike.%${q}%,full_name_en.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(5)

  // If we have code matches, also fetch their profile info
  let codeProfiles: typeof nameMatches = []
  if (codeMatchIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name_ar, full_name_en, phone, role')
      .in('id', codeMatchIds)
    codeProfiles = data ?? []
  }

  // Merge and deduplicate by id
  const seen = new Set<string>()
  const patients = [...(codeProfiles ?? []), ...(nameMatches ?? [])].filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  }).slice(0, 5)

  if (patients) {
    for (const p of patients) {
      results.push({
        id: p.id,
        type: 'patient',
        title: p.full_name_ar || p.full_name_en || '',
        subtitle: p.phone || '',
        href: `${rolePrefix}/patients/${p.id}`,
      })
    }
  }

  // Search appointments (by patient name via join-free approach)
  const patientIds = patients?.map((p) => p.id) ?? []
  if (patientIds.length > 0) {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, patient_id, scheduled_start, appointment_type, status')
      .in('patient_id', patientIds)
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_start', { ascending: false })
      .limit(3)

    if (appointments) {
      const patientNameMap = (patients ?? []).reduce(
        (acc, p) => {
          acc[p.id] = p.full_name_ar || p.full_name_en || ''
          return acc
        },
        {} as Record<string, string>
      )

      for (const a of appointments) {
        const date = new Date(a.scheduled_start)
        results.push({
          id: a.id,
          type: 'appointment',
          title: patientNameMap[a.patient_id] || '',
          subtitle: date.toLocaleDateString('ar-JO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          href: `${rolePrefix}/appointments`,
        })
      }
    }
  }

  // Search visits by diagnosis or chief complaint
  if (profile.role === 'doctor') {
    const { data: visits } = await supabase
      .from('medical_records')
      .select('id, patient_id, visit_date, diagnosis, chief_complaint')
      .or(`diagnosis.ilike.%${q}%,chief_complaint.ilike.%${q}%`)
      .order('visit_date', { ascending: false })
      .limit(3)

    if (visits) {
      // Resolve patient names
      const visitPatientIds = [...new Set(visits.map((v) => v.patient_id))]
      let visitPatientNames: Record<string, string> = {}
      if (visitPatientIds.length > 0) {
        const { data: visitProfiles } = await supabase
          .from('profiles')
          .select('id, full_name_ar, full_name_en')
          .in('id', visitPatientIds)

        visitPatientNames = (visitProfiles ?? []).reduce(
          (acc, p) => {
            acc[p.id] = p.full_name_ar || p.full_name_en || ''
            return acc
          },
          {} as Record<string, string>
        )
      }

      for (const v of visits) {
        results.push({
          id: v.id,
          type: 'visit',
          title: v.diagnosis || v.chief_complaint || '',
          subtitle: visitPatientNames[v.patient_id] || v.visit_date,
          href: `/doctor/patients/${v.patient_id}`,
        })
      }
    }
  }

  return results
}
