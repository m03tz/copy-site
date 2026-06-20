import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PatientInfoForm } from '@/components/patients/patient-info-form'
import { PrintReportButton } from '@/components/patients/print-report-button'
import { PatientSnapshot } from '@/components/patients/patient-snapshot'
import { CurrentMedications } from '@/components/patients/current-medications'
import { ClinicalFormTabs } from '@/components/patients/clinical-form-tabs'
import { StandaloneMedicationButton } from '@/components/prescriptions/standalone-medication-button'
import type { Pregnancy, PregnancyMeasurement, InfertilityRecord } from '@/lib/types/database'

interface DoctorPatientProfilePageProps {
  params: Promise<{ id: string; locale: string }>
}

export default async function DoctorPatientProfilePage({ params }: DoctorPatientProfilePageProps) {
  const { id } = await params
  const t = await getTranslations('patients')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const doctorId = user?.id ?? ''

  // Fetch patient profile with nested patient record
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*, patients(*)')
    .eq('id', id)
    .single() as {
      data: {
        id: string
        full_name_ar: string
        full_name_en: string | null
        phone: string
        email: string | null
        patients:
          | {
              date_of_birth: string
              blood_type: string | null
              national_id: string | null
              patient_code: string | null
              nickname: string | null
              emergency_contact_name: string | null
              emergency_contact_phone: string | null
              notes: string | null
              job_description: string | null
              pmh: string | null
              psh: string | null
              pdh: string | null
              parity: string | null
              gravida: number | null
              para: number | null
            }
          | null
      } | null
      error: { message: string } | null
    }

  if (profileError || !profileData) {
    notFound()
  }

  // Normalize patients field
  const patientRecord = Array.isArray(profileData.patients)
    ? (profileData.patients[0] ?? null)
    : profileData.patients

  const patient = { ...profileData, patients: patientRecord }
  const patientCode = patientRecord?.patient_code ?? null

  // Fetch visit records with embedded prescriptions (exclude soft-deleted)
  const { data: visitRecords } = await supabase
    .from('medical_records')
    .select('*, prescriptions(*)')
    .eq('patient_id', id)
    .is('deleted_at', null)
    .order('visit_date', { ascending: true })
    .order('created_at', { ascending: true }) as {
      data: {
        id: string
        visit_date: string
        created_at: string
        chief_complaint: string | null
        diagnosis: string | null
        treatment_plan: string | null
        vital_signs: Record<string, string> | null
        notes: string | null
        appointment_id: string | null
        is_ended: boolean
        visit_fee: number | null
        medication_only: boolean
        prescriptions: {
          id: string
          medical_record_id: string
          medication_name: string
          dosage: string
          duration: string
          instructions: string | null
          quantity: string | null
        }[]
      }[] | null
    }

  // Fetch patient files
  const { data: patientFiles } = await supabase
    .from('patient_files')
    .select('*')
    .eq('patient_id', id)
    .order('created_at', { ascending: false }) as {
      data: {
        id: string
        file_name: string
        file_type: string
        file_path: string
        description: string | null
        medical_record_id: string | null
        created_at: string
      }[] | null
    }

  // Fetch pregnancies with embedded measurements
  const { data: pregnancyData } = await supabase
    .from('pregnancies')
    .select('*, pregnancy_measurements(*)')
    .eq('patient_id', id)
    .order('created_at', { ascending: false }) as {
      data: (Pregnancy & { pregnancy_measurements: PregnancyMeasurement[] })[] | null
    }

  // Fetch infertility records (newest first)
  const { data: infertilityData } = await supabase
    .from('infertility_records')
    .select('*')
    .eq('patient_id', id)
    .order('record_date', { ascending: false }) as {
      data: InfertilityRecord[] | null
    }

  const visits = visitRecords ?? []
  const files = patientFiles ?? []
  const infertilityRecords = infertilityData ?? []

  // Fetch last ended visit date — includes soft-deleted visits that still have a fee
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastVisitRow } = await (supabase as any)
    .from('medical_records')
    .select('visit_date')
    .eq('patient_id', id)
    .eq('is_ended', true)
    .or('deleted_at.is.null,visit_fee.not.is.null')
    .order('visit_date', { ascending: false })
    .limit(1)
    .single() as { data: { visit_date: string } | null }
  const lastVisitDate = lastVisitRow?.visit_date ?? null

  // Extract latest vital signs (most recent visit with a blood pressure reading)
  const vitalsVisit = [...visits].reverse().find(v => {
    const vs = v.vital_signs as { blood_pressure?: string } | null
    return vs?.blood_pressure
  })
  const latestVitals = vitalsVisit?.vital_signs
    ? (vitalsVisit.vital_signs as { blood_pressure?: string; weight?: string })
    : null

  // Sort measurements by measured_at descending
  const pregnancies = (pregnancyData ?? []).map((p) => ({
    ...p,
    pregnancy_measurements: [...(p.pregnancy_measurements ?? [])].sort(
      (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
    ),
  }))

  // ─── Patient alert notes ────────────────────────────────────────────────────
  // Show any patient notes as a red alert at the top
  const alertNotes = patientRecord?.notes

  // Active pregnancy info for ANC tab display
  const activePregnancy = pregnancies.find((p) => p.status === 'active')

  return (
    <div className="space-y-6">
      {/* ── Patient header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{patient.full_name_ar}</h1>
            {patientRecord?.nickname && (
              <span className="text-base text-muted-foreground">({patientRecord.nickname})</span>
            )}
          </div>
          {patient.full_name_en && (
            <p className="text-muted-foreground">{patient.full_name_en}</p>
          )}
          {patientCode && (
            <p className="text-sm text-muted-foreground mt-1">
              {t('profile.fileNumber')}: <span className="font-mono font-semibold text-foreground">{patientCode}</span>
            </p>
          )}
        </div>
        <PrintReportButton patientId={id} />
      </div>

      {/* ── Important Alerts ── */}
      {alertNotes && (
        <div className="rounded-lg border-2 border-destructive bg-destructive/10 px-4 py-3">
          <p className="text-sm font-semibold text-destructive mb-1">⚠ {t('profile.importantNotes')}</p>
          <p className="text-sm text-destructive/90 whitespace-pre-wrap">{alertNotes}</p>
        </div>
      )}

      {/* ── Patient Snapshot ── */}
      <PatientSnapshot patient={patient} visits={visits} pregnancies={pregnancies} lastVisitDate={lastVisitDate} />

      {/* ── Current Medications ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div />
          <StandaloneMedicationButton patientId={id} patientName={patient.full_name_ar} />
        </div>
        <CurrentMedications visits={visits} />
      </div>

      {/* ── Tabbed profile ── */}
      <Tabs defaultValue="info">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="info" className="shrink-0 whitespace-nowrap">{t('profile.tabs.info')}</TabsTrigger>
          <TabsTrigger value="clinical" className="shrink-0 whitespace-nowrap">{t('profile.tabs.clinical')}</TabsTrigger>
        </TabsList>

        {/* Info tab */}
        <TabsContent value="info" className="mt-6">
          <PatientInfoForm patient={patient} />
        </TabsContent>

        {/* Clinical Record tab — Infertility / ANC / Prescriptions / Files / Test Request + Book Appointment */}
        <TabsContent value="clinical" className="mt-6 space-y-8">
          <ClinicalFormTabs
            patientId={id}
            patientName={patient.full_name_ar}
            infertilityRecords={infertilityRecords}
            pregnancies={pregnancies}
            activePregnancy={activePregnancy ?? null}
            latestVitals={latestVitals}
            visits={visits}
            files={files}
            doctorId={doctorId}
            gravida={patientRecord?.gravida}
            para={patientRecord?.para}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
