import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { MedicalRecordsTabs } from '@/components/medical-records/medical-records-tabs'
import { AddRecordButton } from '@/components/medical-records/add-record-button'

export const dynamic = 'force-dynamic'

// Raw type for the Supabase join query
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

export default async function MedicalRecordsPage() {
  const t = await getTranslations('medicalRecords')
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = format(today, 'yyyy-MM-dd')

  // Cleanup: soft-delete ended visits older than 24 hours (preserves financial data)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('medical_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('is_ended', true)
    .not('ended_at', 'is', null)
    .lt('ended_at', cutoff)
    .is('deleted_at', null)

  // Fetch today's ACTIVE (non-ended) visits — oldest first for queue ordering
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

  // Fetch all ended visits — most recently ended first (exclude soft-deleted)
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

  // Collect unique patient IDs
  const allPatientIds = [
    ...new Set([
      ...(todayVisits ?? []).map((v) => v.patient_id),
      ...(allVisits ?? []).map((v) => v.patient_id),
    ]),
  ]

  // Fetch patient names + all patients for the add button
  const { data: allPatientProfiles } = (await supabase
    .from('profiles')
    .select('id, full_name_ar, full_name_en, phone, patients!inner(id, national_id, patient_code)')
    .eq('role', 'patient')) as unknown as {
    data: { id: string; full_name_ar: string; full_name_en: string | null; phone: string | null; patients: { id: string; national_id: string | null; patient_code: string | null } | null }[] | null
  }

  let patientNames: Record<string, { full_name_ar: string; full_name_en: string | null }> = {}
  if (allPatientIds.length > 0) {
    const relevantProfiles = (allPatientProfiles ?? []).filter((p) => allPatientIds.includes(p.id))
    if (relevantProfiles.length > 0) {
      patientNames = relevantProfiles.reduce(
        (acc, p) => {
          acc[p.id] = { full_name_ar: p.full_name_ar, full_name_en: p.full_name_en }
          return acc
        },
        {} as typeof patientNames
      )
    }
    if (Object.keys(patientNames).length < allPatientIds.length) {
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
  }

  // Build last ended visit date per patient
  const lastVisitDateByPatient: Record<string, string> = {}
  for (const v of allVisits ?? []) {
    if (!lastVisitDateByPatient[v.patient_id]) {
      lastVisitDateByPatient[v.patient_id] = v.visit_date
    }
  }

  // Normalized visit type
  type VisitData = RawVisitRow & {
    patient_name_ar: string
    patient_name_en: string | null
    last_visit_date: string | null
  }

  const normalizeVisits = (visits: RawVisitRow[] | null): VisitData[] => {
    return (visits ?? []).map((v) => ({
      ...v,
      prescriptions: v.prescriptions ?? [],
      patient_name_ar: patientNames[v.patient_id]?.full_name_ar ?? '',
      patient_name_en: patientNames[v.patient_id]?.full_name_en ?? null,
      last_visit_date: lastVisitDateByPatient[v.patient_id] ?? null,
    }))
  }

  const patients = (allPatientProfiles ?? []).map((p) => ({
    id: p.id,
    full_name_ar: p.full_name_ar,
    full_name_en: p.full_name_en,
    phone: p.phone ?? null,
    national_id: (p.patients as { national_id: string | null } | null)?.national_id ?? null,
    patient_code: (p.patients as { patient_code: string | null } | null)?.patient_code ?? null,
    last_visit_date: lastVisitDateByPatient[p.id] ?? null,
  }))

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
