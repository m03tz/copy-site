'use client'

import { useState, useMemo, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Trash2, Check, X, Loader2, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/appointments/status-badge'
import { CancelDialog } from '@/components/appointments/cancel-dialog'
import { deleteAppointment, updateAppointment, getAvailableSlots } from '@/lib/actions/appointments'
import type { TimeSlot } from '@/lib/utils/slots'

const APPOINTMENT_TYPES = ['consultation', 'follow_up', 'prenatal', 'ultrasound', 'other'] as const

interface CalendarAppointment {
  id: string
  patient_id: string
  scheduled_start: string
  scheduled_end: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  appointment_type: string
  patient?: { full_name_ar: string; full_name_en: string | null } | null
}

interface AppointmentCalendarProps {
  appointments: CalendarAppointment[]
  doctorId?: string
}

const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function AppointmentCalendar({ appointments, doctorId }: AppointmentCalendarProps) {
  const t = useTranslations('appointments')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [editingAppt, setEditingAppt] = useState<CalendarAppointment | null>(null)
  const [editType, setEditType] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSlots, setEditSlots] = useState<TimeSlot[]>([])
  const [editSlotsLoading, setEditSlotsLoading] = useState(false)
  const [editSelectedSlot, setEditSelectedSlot] = useState<TimeSlot | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const router = useRouter()

  function handleDelete(appointmentId: string) {
    startTransition(async () => {
      await deleteAppointment(appointmentId)
      setDeleteConfirmId(null)
      router.refresh()
    })
  }

  async function openEdit(appt: CalendarAppointment) {
    const dateStr = appt.scheduled_start.slice(0, 10)
    setEditingAppt(appt)
    setEditType(appt.appointment_type)
    setEditDate(dateStr)
    setEditSelectedSlot(null)
    setEditSlots([])
    await loadSlotsForDate(dateStr, appt)
  }

  async function loadSlotsForDate(dateStr: string, appt: CalendarAppointment) {
    if (!doctorId) return
    setEditSlotsLoading(true)
    setEditSelectedSlot(null)
    const result = await getAvailableSlots(dateStr, doctorId)
    setEditSlotsLoading(false)
    const slots = result.slots ?? []
    // If same date as original, include current slot so it's selectable
    if (dateStr === appt.scheduled_start.slice(0, 10)) {
      const currentSlot: TimeSlot = {
        start: appt.scheduled_start,
        end: appt.scheduled_end,
        startDisplay: new Date(appt.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        endDisplay: new Date(appt.scheduled_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }
      const hasCurrent = slots.some((s) => s.start === appt.scheduled_start)
      const finalSlots = hasCurrent ? slots : [currentSlot, ...slots]
      setEditSlots(finalSlots)
      setEditSelectedSlot(currentSlot)
    } else {
      setEditSlots(slots)
    }
  }

  async function handleEditSave() {
    if (!editingAppt) return
    const slot = editSelectedSlot ?? { start: editingAppt.scheduled_start, end: editingAppt.scheduled_end }
    setEditSaving(true)
    const result = await updateAppointment({
      id: editingAppt.id,
      appointment_type: editType,
      scheduled_start: slot.start,
      scheduled_end: slot.end,
    })
    setEditSaving(false)
    if (!result.error) {
      setEditingAppt(null)
      router.refresh()
    }
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthName = currentDate.toLocaleDateString(isAr ? 'ar-JO' : 'en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Group appointments by date (YYYY-MM-DD)
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>()
    for (const appt of appointments) {
      const dateKey = appt.scheduled_start.slice(0, 10)
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(appt)
    }
    return map
  }, [appointments])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    const today = new Date().toISOString().slice(0, 10)
    setSelectedDate(today)
  }

  const weekdays = isAr ? WEEKDAYS_AR : WEEKDAYS_EN

  // Build calendar grid
  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

  const todayStr = new Date().toISOString().slice(0, 10)

  // Selected day's appointments
  const selectedDayAppointments = selectedDate
    ? (appointmentsByDate.get(selectedDate) ?? []).sort(
        (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
      )
    : []

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Calendar grid */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={isAr ? goToNextMonth : goToPrevMonth}>
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">{monthName}</CardTitle>
              <Button variant="outline" size="sm" onClick={goToToday}>
                {t('calendar.today')}
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={isAr ? goToPrevMonth : goToNextMonth}>
              {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekdays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-16" />
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayAppointments = appointmentsByDate.get(dateStr) ?? []
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const hasAppointments = dayAppointments.length > 0

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-16 rounded-md border text-start p-1 transition-colors hover:bg-accent ${
                    isSelected ? 'border-primary bg-accent' : 'border-transparent'
                  } ${isToday ? 'ring-1 ring-primary' : ''}`}
                >
                  <span
                    className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}
                  >
                    {day}
                  </span>
                  {hasAppointments && (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {dayAppointments.slice(0, 3).map((appt) => (
                        <span
                          key={appt.id}
                          className={`block h-1.5 w-1.5 rounded-full ${
                            appt.status === 'cancelled'
                              ? 'bg-destructive'
                              : appt.status === 'completed'
                                ? 'bg-green-500'
                                : 'bg-primary'
                          }`}
                        />
                      ))}
                      {dayAppointments.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{dayAppointments.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {selectedDate
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString(
                  isAr ? 'ar-JO' : 'en-US',
                  { weekday: 'long', day: 'numeric', month: 'long' }
                )
              : t('calendar.selectDay')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-sm text-muted-foreground">{t('calendar.selectDayHint')}</p>
          ) : selectedDayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('calendar.noAppointments')}</p>
          ) : (
            <div className="space-y-3">
              {selectedDayAppointments.map((appt) => {
                const start = new Date(appt.scheduled_start)
                const end = new Date(appt.scheduled_end)
                const timeStr = `${start.toLocaleTimeString(isAr ? 'ar-JO' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${end.toLocaleTimeString(isAr ? 'ar-JO' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                const patientName = appt.patient?.full_name_ar

                const canCancel = appt.status !== 'cancelled' && appt.status !== 'completed'

                return (
                  <div
                    key={appt.id}
                    className="rounded-md border p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{patientName ?? '—'}</span>
                      <StatusBadge status={appt.status} />
                    </div>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {timeStr}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`type.${appt.appointment_type}`)}
                    </p>
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      {canCancel && <CancelDialog appointmentId={appt.id} />}
                      {canCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => openEdit(appt)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {deleteConfirmId === appt.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(appt.id)}
                            disabled={isPending}
                          >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={isPending}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmId(appt.id)}
                          title={t('deleteAppointment')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit appointment dialog */}
      <Dialog open={!!editingAppt} onOpenChange={(v) => { if (!v) setEditingAppt(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          {editingAppt && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`type.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={async (e) => {
                    const d = e.target.value
                    setEditDate(d)
                    if (editingAppt) await loadSlotsForDate(d, editingAppt)
                  }}
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <Label>Time Slot</Label>
                {editSlotsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading slots...
                  </div>
                ) : editSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No slots available</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                    {editSlots.map((slot) => {
                      const start = new Date(slot.start)
                      const isSelected = editSelectedSlot?.start === slot.start
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => setEditSelectedSlot(slot)}
                          className={`rounded border px-2 py-1 text-xs transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border hover:bg-accent'
                          }`}
                        >
                          {start.toLocaleTimeString(isAr ? 'ar-JO' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEditingAppt(null)} disabled={editSaving}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={editSaving || !editSelectedSlot}>
                  {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
