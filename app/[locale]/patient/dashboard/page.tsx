import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { PatientBookingForm } from '@/components/appointments/patient-booking-form'
import { PatientProfileForm } from '@/components/patient/patient-profile-form'

export const dynamic = 'force-dynamic'

export default async function PatientDashboard() {
  const t = await getTranslations('dashboard')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile + patient data together
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name_ar, full_name_en, phone')
    .eq('id', user.id)
    .single() as {
      data: { full_name_ar: string; full_name_en: string | null; phone: string } | null
    }

  const { data: patientData } = await supabase
    .from('patients')
    .select('date_of_birth, blood_type, national_id, emergency_contact_name, emergency_contact_phone')
    .eq('id', user.id)
    .single() as {
      data: {
        date_of_birth: string
        blood_type: string | null
        national_id: string | null
        emergency_contact_name: string | null
        emergency_contact_phone: string | null
      } | null
    }

  const patientName = profile?.full_name_ar || profile?.full_name_en || ''

  const profileData = profile && patientData
    ? {
        full_name_ar: profile.full_name_ar,
        phone: profile.phone,
        date_of_birth: patientData.date_of_birth,
        blood_type: patientData.blood_type,
        national_id: patientData.national_id,
        emergency_contact_name: patientData.emergency_contact_name,
        emergency_contact_phone: patientData.emergency_contact_phone,
      }
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('patientTitle')}</h1>
        {patientName && (
          <p className="text-muted-foreground mt-1">{t('welcomeBack')}، {patientName}</p>
        )}
      </div>

      {/* Two columns: booking on the right, profile on the left */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Book Appointment */}
        <PatientBookingForm />

        {/* My Information */}
        {profileData && (
          <PatientProfileForm initialData={profileData} />
        )}
      </div>
    </div>
  )
}
