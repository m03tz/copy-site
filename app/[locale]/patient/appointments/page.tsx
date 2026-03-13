import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/appointments/status-badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Appointment } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

export default async function PatientAppointmentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const now = new Date().toISOString()

  // Show only upcoming appointments (no past)
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', user.id)
    .gt('scheduled_start', now)
    .in('status', ['scheduled', 'confirmed'])
    .order('scheduled_start', { ascending: true })

  if (error) {
    console.error('Failed to load appointments:', error)
  }

  const upcomingAppointments: Appointment[] = appointments ?? []

  const t = await getTranslations('appointments')

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t('myAppointments')}</h1>

      {upcomingAppointments.length === 0 ? (
        <p className="text-muted-foreground text-start py-8">{t('noUpcomingAppointments')}</p>
      ) : (
        <div className="flex flex-col gap-4 max-w-xl">
          {upcomingAppointments.map((appointment) => {
            const startDate = parseISO(appointment.scheduled_start)
            const endDate = parseISO(appointment.scheduled_end)
            const dateFormatted = format(startDate, 'EEEE, MMMM d, yyyy')
            const timeStart = format(startDate, 'h:mm a')
            const timeEnd = format(endDate, 'h:mm a')

            return (
              <Card key={appointment.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-start">
                      <p className="font-semibold text-base">{dateFormatted}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {timeStart} &ndash; {timeEnd}
                      </p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="space-y-2 text-start">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t('selectType')}:</span>
                      <span className="text-sm font-medium">
                        {t(`type.${appointment.appointment_type}`)}
                      </span>
                    </div>
                    {appointment.notes && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">{t('notes')}:</span>{' '}
                        {appointment.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
