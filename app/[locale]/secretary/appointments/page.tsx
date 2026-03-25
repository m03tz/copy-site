import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { AppointmentsTabs } from '@/components/appointments/appointments-tabs'
import { BookAppointmentButton } from '@/components/appointments/book-appointment-button'
import { ExportAppointmentsButton } from '@/components/export/export-appointments-button'
import { format } from 'date-fns'

type RawAppointment = {
  id: string
  patient_id: string
  scheduled_start: string
  scheduled_end: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  appointment_type: string
  cancellation_reason: string | null
  patients: {
    patient_code: string | null
    national_id: string | null
    profiles: { full_name_ar: string; full_name_en: string | null } | null
  } | null
}

export default async function SecretaryAppointmentsPage() {
  const t = await getTranslations('appointments')

  const supabase = await createClient()

  // Get first doctor (secretary manages one clinic)
  const { data: doctorProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor')
    .limit(1) as { data: { id: string }[] | null }
  const doctorId = doctorProfiles?.[0]?.id ?? ''

  const [appointmentsResult, patientsResult, invoicesResult] = await Promise.all([
    (supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        scheduled_start,
        scheduled_end,
        status,
        appointment_type,
        cancellation_reason,
        patients(patient_code, national_id, profiles(full_name_ar, full_name_en))
      `)
      .order('scheduled_start', { ascending: false })) as unknown as Promise<{
      data: RawAppointment[] | null
    }>,
    (supabase
      .from('profiles')
      .select('id, full_name_ar, full_name_en, phone, patients!inner(id, patient_code, national_id)')
      .eq('role', 'patient')) as unknown as Promise<{
      data: { id: string; full_name_ar: string; full_name_en: string | null; phone: string | null; patients: { patient_code: string | null; national_id: string | null }[] | { patient_code: string | null; national_id: string | null } }[] | null
    }>,
    (supabase
      .from('invoices')
      .select('patient_id, amount_jod, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)) as unknown as Promise<{
      data: { patient_id: string; amount_jod: number | null; created_at: string }[] | null
    }>,
  ])

  const rawAppointments = appointmentsResult.data ?? []
  const patients = patientsResult.data ?? []
  const invoices = invoicesResult.data ?? []

  // Build invoice fee map: patient_id + date -> amount_jod
  const invoiceFees: Record<string, number> = {}
  for (const inv of invoices) {
    if (!inv.patient_id || !inv.created_at) continue
    const dateKey = format(new Date(inv.created_at), 'yyyy-MM-dd')
    const key = `${inv.patient_id}_${dateKey}`
    if (!(key in invoiceFees)) {
      invoiceFees[key] = inv.amount_jod ?? 0
    }
  }

  // Reshape appointments — patient data is now embedded via FK join
  const appointments = rawAppointments.map((appt) => ({
    id: appt.id,
    patient_id: appt.patient_id,
    scheduled_start: appt.scheduled_start,
    scheduled_end: appt.scheduled_end,
    status: appt.status,
    appointment_type: appt.appointment_type,
    cancellation_reason: appt.cancellation_reason,
    patient: appt.patients
      ? {
          full_name_ar: appt.patients.profiles?.full_name_ar ?? '',
          full_name_en: appt.patients.profiles?.full_name_en ?? null,
          patient_code: appt.patients.patient_code ?? null,
          national_id: appt.patients.national_id ?? null,
        }
      : null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <ExportAppointmentsButton />
          {doctorId && <BookAppointmentButton patients={patients} doctorId={doctorId} />}
        </div>
      </div>

      <AppointmentsTabs
        appointments={appointments}
        showInvoice={true}
        showComplete={true}
        invoiceFees={invoiceFees}
        doctorId={doctorId}
      />
    </div>
  )
}
