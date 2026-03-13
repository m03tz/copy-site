import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { PatientInfoForm } from '@/components/patients/patient-info-form'

interface SecretaryPatientProfilePageProps {
  params: Promise<{ id: string; locale: string }>
}

export default async function SecretaryPatientProfilePage({
  params,
}: SecretaryPatientProfilePageProps) {
  const { id } = await params
  const t = await getTranslations('patients')

  const supabase = await createClient()

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
            }
          | null
      } | null
      error: { message: string } | null
    }

  if (profileError || !profileData) {
    notFound()
  }

  // Normalize patients field (Supabase may return array for one-to-many join)
  const patientRecord = Array.isArray(profileData.patients)
    ? (profileData.patients[0] ?? null)
    : profileData.patients

  const patient = { ...profileData, patients: patientRecord }
  const patientCode = patientRecord?.patient_code ?? null

  return (
    <div className="space-y-6">
      {/* Patient header */}
      <div>
        <div className="flex items-baseline gap-2">
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

      <PatientInfoForm patient={patient} />
    </div>
  )
}
