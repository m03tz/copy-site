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

  // Cleanup: soft-delete ended visits from before today (i.e., ended before midnight)
  const cutoff = today.toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('medical_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('is_ended', true)
    .not('ended_at', 'is', null)
    .lt('ended_at', cutoff)
    .is('deleted_at', null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mrTable = (supabase as any).from('medical_records')

  // Fetch today's ACTIVE (non-ended) visits — oldest first for queue ordering
  const { data: todayVisits } = (await mrTable
    .select('id, patient_id, visit_date, chief_complaint, diagnosis, treatment_plan, vital_signs, notes, appointment_id, created_at, is_ended, visit_fee, prescriptions(*)')
    .eq('visit_date', todayStr)
    .eq('medication_only', false)
    .eq('is_ended', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })) as { data: RawVisitRow[] | null }

  // Fetch all ended visits — most recently ended first (exclude soft-deleted)
  const { data: allVisits } = (await mrTable
    .select('id, patient_id, visit_date, chief_complaint, diagnosis, treatment_plan, vital_signs, notes, appointment_id, created_at, is_ended, visit_fee, prescriptions(*)')
    .eq('medication_only', false)
    .eq('is_ended', true)
    .is('deleted_at', null)
    .order('ended_at', { ascending: false })
    .order('created_at', { ascending: false })) as { data: RawVisitRow[] | null }

  // Collect unique patient IDs
  const allPatientIds = [
    ...new Set([
      ...(todayVisits ?? []).map((v) => v.patient_id),
      ...(allVisits ?? []).map((v) => v.patient_id),
    ]),
  ]

  // Query FROM patients (with profiles join) — same proven pattern as operations page
  const { data: patientRows } = await supabase
    .from('patients')
    .select('id, national_id, patient_code, profiles!inner(full_name_ar, full_name_en, phone)') as unknown as {
    data: { id: string; national_id: string | null; patient_code: string | null; profiles: { full_name_ar: string; full_name_en: string | null; phone: string | null } }[] | null
  }

  const allPatientProfiles = (patientRows ?? []).map((p) => {
    const pr = p.profiles as { full_name_ar: string; full_name_en: string | null; phone: string | null }
    return {
      id: p.id,
      full_name_ar: pr.full_name_ar,
      full_name_en: pr.full_name_en,
      phone: pr.phone,
      national_id: p.national_id,
      patient_code: p.patient_code,
    }
  })

  const patientNames: Record<string, { full_name_ar: string; full_name_en: string | null; phone: string | null; patient_code: string | null }> = {}
  if (allPatientIds.length > 0) {
    for (const p of allPatientProfiles) {
      if (allPatientIds.includes(p.id)) {
        patientNames[p.id] = {
          full_name_ar: p.full_name_ar,
          full_name_en: p.full_name_en,
          phone: p.phone,
          patient_code: p.patient_code,
        }
      }
    }
    // Fallback: any patient_id not matched in the patients table → query profiles directly
    const missing = allPatientIds.filter((id) => !patientNames[id])
    if (missing.length > 0) {
      const { data: extraProfiles } = await supabase
        .from('profiles')
        .select('id, full_name_ar, full_name_en, phone')
        .in('id', missing)
      for (const p of extraProfiles ?? []) {
        patientNames[p.id] = {
          full_name_ar: p.full_name_ar,
          full_name_en: p.full_name_en,
          phone: p.phone ?? null,
          patient_code: null,
        }
      }
    }
  }

  // Build last ended visit date per patient
  // Include soft-deleted visits that still have a fee (ended visits > 24h old)
  const allProfileIds = allPatientProfiles.map((p) => p.id)
  const lastVisitDateByPatient: Record<string, string> = {}
  if (allProfileIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lastVisitRows } = await (supabase as any)
      .from('medical_records')
      .select('patient_id, visit_date')
      .in('patient_id', allProfileIds)
      .eq('is_ended', true)
      .or('deleted_at.is.null,visit_fee.not.is.null')
      .order('visit_date', { ascending: false }) as {
        data: { patient_id: string; visit_date: string }[] | null
      }
    for (const v of lastVisitRows ?? []) {
      if (!lastVisitDateByPatient[v.patient_id]) lastVisitDateByPatient[v.patient_id] = v.visit_date
    }
  }

  // Normalized visit type
  type VisitData = RawVisitRow & {
    patient_name_ar: string
    patient_name_en: string | null
    patient_phone: string | null
    patient_code: string | null
    last_visit_date: string | null
  }

  const normalizeVisits = (visits: RawVisitRow[] | null): VisitData[] => {
    return (visits ?? []).map((v) => ({
      ...v,
      prescriptions: v.prescriptions ?? [],
      patient_name_ar: patientNames[v.patient_id]?.full_name_ar ?? '',
      patient_name_en: patientNames[v.patient_id]?.full_name_en ?? null,
      patient_phone: patientNames[v.patient_id]?.phone ?? null,
      patient_code: patientNames[v.patient_id]?.patient_code ?? null,
      last_visit_date: lastVisitDateByPatient[v.patient_id] ?? null,
    }))
  }

  const patients = allPatientProfiles.map((p) => ({
    id: p.id,
    full_name_ar: p.full_name_ar,
    full_name_en: p.full_name_en,
    phone: p.phone,
    national_id: p.national_id,
    patient_code: p.patient_code,
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
