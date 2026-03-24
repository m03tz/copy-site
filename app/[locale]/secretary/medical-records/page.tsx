import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { MedicalRecordsTabs } from '@/components/medical-records/medical-records-tabs'
import { AddRecordButton } from '@/components/medical-records/add-record-button'

export const dynamic = 'force-dynamic'

type RawVisitRow = {
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
}

export default async function SecretaryMedicalRecordsPage() {
  const t = await getTranslations('medicalRecords')
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = format(today, 'yyyy-MM-dd')

  const { data: todayVisits } = (await supabase
    .from('medical_records')
    .select('id, patient_id, visit_date, chief_complaint, diagnosis, treatment_plan, vital_signs, notes, appointment_id, created_at, is_ended, visit_fee, prescriptions(*)')
    .eq('visit_date', todayStr)
    .eq('medication_only', false)
    .eq('is_ended', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })) as unknown as {
    data: RawVisitRow[] | null
  }

  const { data: allVisits } = (await supabase
    .from('medical_records')
    .select('id, patient_id, visit_date, chief_complaint, diagnosis, treatment_plan, vital_signs, notes, appointment_id, created_at, is_ended, visit_fee, prescriptions(*)')
    .eq('medication_only', false)
    .eq('is_ended', true)
    .is('deleted_at', null)
    .order('ended_at', { ascending: false })
    .order('created_at', { ascending: false })) as unknown as {
    data: RawVisitRow[] | null
  }

  const allPatientIds = [
    ...new Set([
      ...(todayVisits ?? []).map((v) => v.patient_id),
      ...(allVisits ?? []).map((v) => v.patient_id),
    ]),
  ]

  const { data: allPatientProfiles } = await supabase
    .from('patients')
    .select('id, national_id, patient_code, profiles!inner(full_name_ar, full_name_en, phone)') as unknown as {
    data: { id: string; national_id: string | null; patient_code: string | null; profiles: { full_name_ar: string; full_name_en: string | null; phone: string | null } }[] | null
  }

  // Build lookup: patient id → profile + patient data
  const patientProfileMap: Record<string, { full_name_ar: string; full_name_en: string | null; phone: string | null; national_id: string | null; patient_code: string | null }> = {}
  for (const p of allPatientProfiles ?? []) {
    const pr = p.profiles as { full_name_ar: string; full_name_en: string | null; phone: string | null }
    patientProfileMap[p.id] = {
      full_name_ar: pr.full_name_ar,
      full_name_en: pr.full_name_en,
      phone: pr.phone,
      national_id: p.national_id,
      patient_code: p.patient_code,
    }
  }

  let patientNames: Record<string, { full_name_ar: string; full_name_en: string | null }> = {}
  if (allPatientIds.length > 0) {
    for (const id of allPatientIds) {
      if (patientProfileMap[id]) {
        patientNames[id] = { full_name_ar: patientProfileMap[id].full_name_ar, full_name_en: patientProfileMap[id].full_name_en }
      }
    }
    const missing = allPatientIds.filter((id) => !patientNames[id])
    if (missing.length > 0) {
      const { data: extraProfiles } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en')
        .in('id', missing)
      for (const p of extraProfiles ?? []) {
        patientNames[p.id] = { full_name_ar: p.full_name_ar, full_name_en: p.full_name_en }
      }
    }
  }

  type VisitData = RawVisitRow & {
    patient_name_ar: string
    patient_name_en: string | null
  }

  const normalizeVisits = (visits: RawVisitRow[] | null): VisitData[] =>
    (visits ?? []).map((v) => ({
      ...v,
      prescriptions: v.prescriptions ?? [],
      patient_name_ar: patientNames[v.patient_id]?.full_name_ar ?? '',
      patient_name_en: patientNames[v.patient_id]?.full_name_en ?? null,
    }))

  const patients = (allPatientProfiles ?? []).map((p) => {
    const pr = p.profiles as { full_name_ar: string; full_name_en: string | null; phone: string | null }
    return {
      id: p.id,
      full_name_ar: pr.full_name_ar,
      full_name_en: pr.full_name_en,
      phone: pr.phone ?? null,
      national_id: p.national_id,
      patient_code: p.patient_code,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <AddRecordButton patients={patients} />
      </div>
      <MedicalRecordsTabs
        todayVisits={normalizeVisits(todayVisits)}
        allVisits={normalizeVisits(allVisits)}
      />
    </div>
  )
}
