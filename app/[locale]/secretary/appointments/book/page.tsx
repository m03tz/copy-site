import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { BookingForm } from '@/components/appointments/booking-form'

export default async function SecretaryBookAppointmentPage() {
  const t = await getTranslations('appointments')

  const supabase = await createClient()

  // Fetch all patients (profiles with a linked patient record)
  const { data: patientProfiles } = await supabase
    .from('profiles')
    .select('id, full_name_ar, full_name_en, phone, patients!inner(id, national_id, patient_code)')
    .eq('role', 'patient') as {
      data: {
        id: string
        full_name_ar: string
        full_name_en: string | null
        phone: string | null
        patients: { id: string; national_id: string | null; patient_code: string | null }[]
      }[] | null
    }

  // Get first doctor (for secretary booking)
  const { data: doctorProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor')
    .limit(1) as { data: { id: string }[] | null }

  const patients = (patientProfiles ?? []).map((p) => ({
    id: p.id,
    full_name_ar: p.full_name_ar,
    full_name_en: p.full_name_en,
    phone: p.phone ?? null,
    national_id: p.patients?.[0]?.national_id ?? null,
    patient_code: p.patients?.[0]?.patient_code ?? null,
  }))
  const doctorId = doctorProfiles?.[0]?.id ?? ''

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('bookAppointment')}</h1>

      {doctorId ? (
        <BookingForm patients={patients} doctorId={doctorId} />
      ) : (
        <p className="text-muted-foreground text-sm">
          No doctor profile found.
        </p>
      )}
    </div>
  )
}
