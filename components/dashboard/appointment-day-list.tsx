'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { format, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getDayAppointments } from '@/lib/actions/dashboard'
import type { DayAppointment } from '@/lib/actions/dashboard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppointmentDayListProps {
  initialAppointments: DayAppointment[]
  initialDate: string // 'yyyy-MM-dd'
  patientBasePath?: string // e.g. '/doctor/patients' or '/secretary/patients'
}

// ─── AppointmentDayList ───────────────────────────────────────────────────────

/**
 * Day-navigable chronological appointment list.
 * Prev/next arrows load appointments for adjacent days via server action.
 * Each appointment row links to the patient's profile page.
 */
export function AppointmentDayList({
  initialAppointments,
  initialDate,
  patientBasePath = '/doctor/patients',
}: AppointmentDayListProps) {
  const tDash = useTranslations('dashboard')
  const tAppt = useTranslations('appointments')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const [date, setDate] = useState<Date>(() => parseISO(initialDate))
  const [appointments, setAppointments] = useState<DayAppointment[]>(initialAppointments)
  const [loading, setLoading] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  async function loadDay(newDate: Date) {
    setLoading(true)
    const dateStr = format(newDate, 'yyyy-MM-dd')
    const result = await getDayAppointments(dateStr)
    setAppointments(result.appointments ?? [])
    setLoading(false)
  }

  async function handleDateSelect(newDate: Date | undefined) {
    if (!newDate) return
    setDate(newDate)
    setCalendarOpen(false)
    await loadDay(newDate)
  }

  // Format date for display — Arabic locale when in RTL mode
  const formattedDate = format(date, 'EEEE، d MMMM yyyy', {
    locale: isAr ? ar : undefined,
  })

  // Map appointment type to i18n key
  function getTypeLabel(type: string): string {
    const validTypes = ['consultation', 'follow_up', 'prenatal', 'ultrasound', 'other']
    if (validTypes.includes(type)) {
      return tAppt(`type.${type}` as Parameters<typeof tAppt>[0])
    }
    return type
  }

  return (
    <Card>
      {/* ── Day navigation header ── */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          {/* Current date */}
          <CardTitle className="text-base font-semibold flex-1 text-center">
            {formattedDate}
          </CardTitle>

          {/* Calendar date picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={loading}
                aria-label="اختر التاريخ"
              >
                <CalendarDays className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      {/* ── Appointment list ── */}
      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {tDash('searchLoading')}
          </p>
        ) : appointments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {tDash('noAppointmentsToday')}
          </p>
        ) : (
          <ul className="divide-y">
            {appointments.map((appt) => {
              const patientName =
                appt.patient?.full_name_ar || appt.patient?.full_name_en || '—'
              const timeStr = format(parseISO(appt.scheduled_start), 'HH:mm')

              return (
                <li key={appt.id}>
                  <Link
                    href={`${patientBasePath}/${appt.patient_id}`}
                    className="flex items-center gap-3 rounded-md px-2 py-3 hover:bg-accent transition-colors"
                  >
                    {/* Time — fixed width */}
                    <span className="w-12 shrink-0 text-sm font-mono text-muted-foreground">
                      {timeStr}
                    </span>

                    {/* Patient name */}
                    <span className="flex-1 truncate text-sm font-medium">
                      {patientName}
                    </span>

                    {/* Appointment type badge */}
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {getTypeLabel(appt.appointment_type)}
                    </Badge>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
