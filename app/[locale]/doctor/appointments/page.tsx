import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { AppointmentsTabs } from '@/components/appointments/appointments-tabs'
import { BookAppointmentButton } from '@/components/appointments/book-appointment-button'
import { ExportAppointmentsButton } from '@/components/export/export-appointments-button'
import { deleteStaleAppointments } from '@/lib/actions/appointments'
import { format } from 'date-fns'

export default async function DoctorAppointmentsPage() {
  const t = await getTranslations('appointments')

  // Auto-delete stale unattended appointments (scheduled/confirmed, >24h past)
  await deleteStaleAppointments()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const doctorId = user?.id ?? ''

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
        cancellation_reason
      `)
      .order('scheduled_start', { ascending: false })) as unknown as Promise<{
      data: {
        id: string
        patient_id: string
        scheduled_start: string
        scheduled_end: string
        status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
        appointment_type: string
        cancellation_reason: string | null
      }[] | null
    }>,
    (supabase
      .from('profiles')
      .select('id, full_name_ar, full_name_en, patients!inner(id, patient_code, national_id)')
      .eq('role', 'patient')) as unknown as Promise<{
      data: { id: string; full_name_ar: string; full_name_en: string | null; patients: { patient_code: string | null; national_id: string | null }[] | { patient_code: string | null; national_id: string | null } }[] | null
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

  // Build a lookup map for patient names + patient_code
  const patientNameMap = new Map(
    patients.map((p) => {
      const patientsRecord = Array.isArray(p.patients) ? p.patients[0] : p.patients
      return [p.id, {
        full_name_ar: p.full_name_ar,
        full_name_en: p.full_name_en,
        patient_code: patientsRecord?.patient_code ?? null,
        national_id: patientsRecord?.national_id ?? null,
      }]
    })
  )

  // Build invoice fee map: patient_id + date -> amount_jod (take first/highest per day)
  const invoiceFees: Record<string, number> = {}
  for (const inv of invoices) {
    if (!inv.patient_id || !inv.created_at) continue
    const dateKey = format(new Date(inv.created_at), 'yyyy-MM-dd')
    const key = `${inv.patient_id}_${dateKey}`
    if (!(key in invoiceFees)) {
      invoiceFees[key] = inv.amount_jod ?? 0
    }
  }

  // Enrich appointments with patient names
  const appointments = rawAppointments.map((appt) => ({
    ...appt,
    patient: patientNameMap.get(appt.patient_id) ?? null,
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
