import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { PrescriptionsPageClient } from '@/components/prescriptions/prescriptions-page-client'
import { AddPrescriptionButton } from '@/components/prescriptions/add-prescription-button'

export const dynamic = 'force-dynamic'

export default async function PrescriptionsPage() {
  const t = await getTranslations('prescriptionsPage')
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = format(today, 'yyyy-MM-dd')

  // Fetch all prescriptions with their medical records and patient info
  // We join through medical_records to get visit_date and patient_id
  const { data: allPrescriptions } = await supabase
    .from('prescriptions')
    .select(`
      id,
      medical_record_id,
      patient_id,
      medication_name,
      dosage,
      duration,
      instructions,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  // Fetch related medical records for visit dates
  const medicalRecordIds = [...new Set((allPrescriptions ?? []).map((p) => p.medical_record_id))]
  let medicalRecordsMap: Record<string, { visit_date: string; patient_id: string }> = {}

  if (medicalRecordIds.length > 0) {
    const { data: records } = await supabase
      .from('medical_records')
      .select('id, visit_date, patient_id')
      .in('id', medicalRecordIds)

    medicalRecordsMap = (records ?? []).reduce(
      (acc, r) => {
        acc[r.id] = { visit_date: r.visit_date, patient_id: r.patient_id }
        return acc
      },
      {} as typeof medicalRecordsMap
    )
  }

  // Collect unique patient IDs
  const patientIds = [...new Set((allPrescriptions ?? []).map((p) => p.patient_id))]

  // Fetch patient names
  let patientNames: Record<string, { full_name_ar: string; full_name_en: string | null }> = {}
  if (patientIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name_ar, full_name_en')
      .in('id', patientIds)

    patientNames = (profiles ?? []).reduce(
      (acc, p) => {
        acc[p.id] = { full_name_ar: p.full_name_ar, full_name_en: p.full_name_en }
        return acc
      },
      {} as typeof patientNames
    )
  }

  // Group prescriptions by medical_record_id (visit)
  type PrescriptionGroup = {
    medical_record_id: string
    patient_id: string
    patient_name_ar: string
    patient_name_en: string | null
    visit_date: string
    medications: {
      id: string
      medication_name: string
      dosage: string
      duration: string
      instructions: string | null
    }[]
  }

  const groupsMap = new Map<string, PrescriptionGroup>()

  for (const p of allPrescriptions ?? []) {
    const record = medicalRecordsMap[p.medical_record_id]
    const visitDate = record?.visit_date ?? ''
    const patientId = p.patient_id
    const patientInfo = patientNames[patientId]

    if (!groupsMap.has(p.medical_record_id)) {
      groupsMap.set(p.medical_record_id, {
        medical_record_id: p.medical_record_id,
        patient_id: patientId,
        patient_name_ar: patientInfo?.full_name_ar ?? '',
        patient_name_en: patientInfo?.full_name_en ?? null,
        visit_date: visitDate,
        medications: [],
      })
    }

    groupsMap.get(p.medical_record_id)!.medications.push({
      id: p.id,
      medication_name: p.medication_name,
      dosage: p.dosage,
      duration: p.duration,
      instructions: p.instructions,
    })
  }

  const allGroups = Array.from(groupsMap.values()).sort((a, b) =>
    b.visit_date.localeCompare(a.visit_date)
  )

  // Split into today's and all
  const todayGroups = allGroups.filter((g) => g.visit_date === todayStr)

  // Fetch all patients for the add prescription button
  const { data: allPatientProfiles } = (await supabase
    .from('profiles')
    .select('id, full_name_ar, full_name_en, patients!inner(id)')
    .eq('role', 'patient')) as unknown as {
    data: { id: string; full_name_ar: string; full_name_en: string | null }[] | null
  }

  const patients = (allPatientProfiles ?? []).map((p) => ({
    id: p.id,
    full_name_ar: p.full_name_ar,
    full_name_en: p.full_name_en,
  }))

  // Fetch recent medical records for the prescription form (to link to a visit)
  const { data: recentRecords } = await supabase
    .from('medical_records')
    .select('id, patient_id, visit_date')
    .order('visit_date', { ascending: false })
    .limit(50)

  const recentVisits = (recentRecords ?? []).map((r) => {
    const pName = patientNames[r.patient_id] ??
      (allPatientProfiles ?? []).find((p) => p.id === r.patient_id)
    return {
      id: r.id,
      patient_id: r.patient_id,
      visit_date: r.visit_date,
      patient_name: pName?.full_name_ar || '',
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <AddPrescriptionButton patients={patients} recentVisits={recentVisits} />
      </div>
      <PrescriptionsPageClient
        todayGroups={todayGroups}
        allGroups={allGroups}
      />
    </div>
  )
}
