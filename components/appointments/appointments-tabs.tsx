'use client'

import { useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { format, startOfDay, isSameDay } from 'date-fns'
import { ar } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2, Check, X, Search, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/appointments/status-badge'
import { CancelDialog } from '@/components/appointments/cancel-dialog'
import { AppointmentCalendar } from '@/components/appointments/appointment-calendar'
import { AppointmentInvoiceButton } from '@/components/appointments/appointment-invoice'
import { CompleteVisitDialog } from '@/components/appointments/complete-visit-dialog'
import { CreateVisitButton } from '@/components/appointments/create-visit-button'
import { deleteAppointment, updateAppointment, getAvailableSlots } from '@/lib/actions/appointments'
import type { TimeSlot } from '@/lib/utils/slots'

const APPOINTMENT_TYPES = ['consultation', 'follow_up', 'prenatal', 'ultrasound', 'other'] as const

interface Appointment {
  id: string
  patient_id: string
  scheduled_start: string
  scheduled_end: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  appointment_type: string
  cancellation_reason?: string | null
  patient?: {
    full_name_ar: string
    full_name_en: string | null
    patient_code?: string | null
    national_id?: string | null
    phone?: string | null
  } | null
}

interface AppointmentsTabsProps {
  appointments: Appointment[]
  showBookLink?: boolean
  showInvoice?: boolean
  showComplete?: boolean
  invoiceFees?: Record<string, number>
  doctorId?: string
}

export function AppointmentsTabs({ appointments, showInvoice, showComplete, invoiceFees, doctorId }: AppointmentsTabsProps) {
  const t = useTranslations('appointments')
  const locale = useLocale()
  const dateLocale = locale === 'ar' ? ar : undefined
  const router = useRouter()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null)
  const [editType, setEditType] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSlots, setEditSlots] = useState<TimeSlot[]>([])
  const [editSlotsLoading, setEditSlotsLoading] = useState(false)
  const [editSelectedSlot, setEditSelectedSlot] = useState<TimeSlot | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  function handleDelete(appointmentId: string) {
    startTransition(async () => {
      await deleteAppointment(appointmentId)
      setDeleteConfirmId(null)
      router.refresh()
    })
  }

  async function openEdit(appt: Appointment) {
    setEditingAppt(appt)
    setEditType(appt.appointment_type)
    setEditSelectedSlot(null)
    setEditSlots([])
    const dateStr = appt.scheduled_start.slice(0, 10)
    setEditDate(dateStr)
    if (doctorId) {
      setEditSlotsLoading(true)
      const result = await getAvailableSlots(dateStr, doctorId)
      setEditSlotsLoading(false)
      const currentSlot: TimeSlot = {
        start: appt.scheduled_start,
        end: appt.scheduled_end,
        startDisplay: new Date(appt.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        endDisplay: new Date(appt.scheduled_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }
      const slots = result.slots ?? []
      const hasCurrent = slots.some((s) => s.start === appt.scheduled_start)
      setEditSlots(hasCurrent ? slots : [currentSlot, ...slots])
      setEditSelectedSlot(currentSlot)
    }
  }

  async function loadSlotsForDate(appt: Appointment, dateStr: string) {
    if (!doctorId) return
    setEditSlotsLoading(true)
    setEditSlots([])
    setEditSelectedSlot(null)
    const result = await getAvailableSlots(dateStr, doctorId)
    setEditSlotsLoading(false)
    setEditSlots(result.slots ?? [])
  }

  async function handleEditSave() {
    if (!editingAppt) return
    const slot = editSelectedSlot ?? { start: editingAppt.scheduled_start, end: editingAppt.scheduled_end }
    setEditSaving(true)
    await updateAppointment({
      id: editingAppt.id,
      appointment_type: editType,
      scheduled_start: slot.start,
      scheduled_end: slot.end,
    })
    setEditSaving(false)
    setEditingAppt(null)
    router.refresh()
  }

  const now = new Date()

  function matchesSearch(a: Appointment): boolean {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    const p = a.patient
    if (!p) return false
    return (
      p.full_name_ar?.toLowerCase().includes(q) ||
      (p.full_name_en?.toLowerCase().includes(q) ?? false) ||
      (p.national_id?.toLowerCase().includes(q) ?? false) ||
      (p.patient_code?.toLowerCase().includes(q) ?? false) ||
      (p.phone?.toLowerCase().includes(q) ?? false)
    )
  }

  // Today: active appointments for today
  const todayAppts = appointments.filter((a) => {
    if (a.status === 'cancelled' || a.status === 'completed') return false
    return isSameDay(new Date(a.scheduled_start), now) && matchesSearch(a)
  })

  // All: every active (non-cancelled, non-completed) appointment
  const weekAppts = appointments.filter((a) => {
    if (a.status === 'cancelled' || a.status === 'completed') return false
    return matchesSearch(a)
  })

  // Completed appointments
  const completed = appointments.filter((a) => a.status === 'completed' && matchesSearch(a))

  function getPatientName(appt: Appointment) {
    if (!appt.patient) return '—'
    if (locale === 'en' && appt.patient.full_name_en) return appt.patient.full_name_en
    return appt.patient.full_name_ar
  }

  function getInvoiceFee(appt: Appointment): number | null {
    if (!invoiceFees) return null
    const dateKey = format(new Date(appt.scheduled_start), 'yyyy-MM-dd')
    return invoiceFees[`${appt.patient_id}_${dateKey}`] ?? null
  }

  function renderRows(list: Appointment[], opts?: { withInvoice?: boolean; withComplete?: boolean; withFee?: boolean; withDate?: boolean }) {
    if (list.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-6">
            {t('noAppointments')}
          </TableCell>
        </TableRow>
      )
    }

    return list.map((appt) => {
      const start = new Date(appt.scheduled_start)
      const end = new Date(appt.scheduled_end)
      const canCancel = appt.status !== 'cancelled' && appt.status !== 'completed'
      const fee = opts?.withFee ? getInvoiceFee(appt) : null

      return (
        <TableRow key={appt.id}>
          <TableCell className="font-medium">{appt.patient?.full_name_ar ?? '—'}</TableCell>
          <TableCell className="text-muted-foreground font-mono text-xs">{appt.patient?.patient_code ?? '—'}</TableCell>
          <TableCell className="text-muted-foreground text-xs">{appt.patient?.national_id ?? '—'}</TableCell>
          {opts?.withDate && (
            <TableCell className="text-muted-foreground text-xs">{format(start, 'dd-MM-yyyy')}</TableCell>
          )}
          <TableCell dir="ltr" className="text-start">{format(start, 'p')} – {format(end, 'p')}</TableCell>
          <TableCell>{t(`type.${appt.appointment_type}`)}</TableCell>
          <TableCell>
            <StatusBadge status={appt.status} />
            {appt.status === 'cancelled' && appt.cancellation_reason && (
              <p className="text-muted-foreground mt-1 text-xs">{appt.cancellation_reason}</p>
            )}
          </TableCell>
          {opts?.withFee && (
            <TableCell className="font-semibold">{fee !== null ? fee.toFixed(2) : '—'}</TableCell>
          )}
          <TableCell>
            <div className="flex items-center gap-2 flex-wrap">
              {canCancel && <CancelDialog appointmentId={appt.id} />}
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => openEdit(appt)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {opts?.withComplete && canCancel && appt.patient && (
                <>
                  <CreateVisitButton
                    appointmentId={appt.id}
                    patientId={appt.patient_id}
                    scheduledStart={appt.scheduled_start}
                    appointmentType={appt.appointment_type}
                  />
                  <CompleteVisitDialog
                    appointmentId={appt.id}
                    patientId={appt.patient_id}
                    patientName={getPatientName(appt)}
                    appointmentTypeLabel={t(`type.${appt.appointment_type}`)}
                  />
                </>
              )}
              {opts?.withInvoice && appt.patient && <AppointmentInvoiceButton appointment={appt} />}
              {opts?.withFee && appt.patient && (
                <div className="flex items-center gap-2 flex-wrap">
                  <AppointmentInvoiceButton appointment={appt} />
                  <Link
                    href={`/doctor/patients/${appt.patient_id}`}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    {t('editVisit')}
                  </Link>
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
              )}
            </div>
          </TableCell>
        </TableRow>
      )
    })
  }

  function renderTable(list: Appointment[], opts?: { withInvoice?: boolean; withComplete?: boolean; withFee?: boolean; withDate?: boolean }) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start">{t('patient')}</TableHead>
            <TableHead className="text-start">رقم الملف</TableHead>
            <TableHead className="text-start">الرقم الوطني</TableHead>
            {opts?.withDate && <TableHead className="text-start">{t('date')}</TableHead>}
            <TableHead className="text-start">{t('time')}</TableHead>
            <TableHead className="text-start">{t('selectType')}</TableHead>
            <TableHead className="text-start">{t('all')}</TableHead>
            {opts?.withFee && <TableHead className="text-start">{t('fees')}</TableHead>}
            <TableHead className="w-64"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderRows(list, opts)}
        </TableBody>
      </Table>
    )
  }

  // Week grouped by day
  function renderWeekGrouped() {
    if (weekAppts.length === 0) {
      return <p className="text-muted-foreground text-sm py-4">{t('noAppointments')}</p>
    }

    const days: Date[] = []
    weekAppts.forEach((a) => {
      const d = startOfDay(new Date(a.scheduled_start))
      if (!days.find((x) => isSameDay(x, d))) days.push(d)
    })
    days.sort((a, b) => a.getTime() - b.getTime())

    return (
      <div className="space-y-8">
        {days.map((day) => {
          const dayAppts = weekAppts.filter((a) => isSameDay(new Date(a.scheduled_start), day))
          const dayLabel = format(day, 'EEEE، d MMMM', { locale: dateLocale })
          return (
            <div key={day.toISOString()}>
              <div className="flex items-center gap-2 mb-3 pb-1 border-b">
                <p className="text-sm font-semibold">{dayLabel}</p>
                <Badge variant="secondary" className="text-xs">{dayAppts.length}</Badge>
              </div>
              {renderTable(dayAppts, { withInvoice: showInvoice, withComplete: showComplete })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Tabs defaultValue="today">
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الرقم الوطني أو رقم الملف أو الهاتف"
          className="ps-9"
          dir="rtl"
        />
      </div>
      <TabsList>
        <TabsTrigger value="today">
          اليوم
          {todayAppts.length > 0 && (
            <span className="ms-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
              {todayAppts.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="week">
          جميع المواعيد
          {weekAppts.length > 0 && (
            <span className="ms-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground px-1">
              {weekAppts.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed">{t('completed')}</TabsTrigger>
        <TabsTrigger value="calendar">{t('calendar.title')}</TabsTrigger>
      </TabsList>

      {/* Today */}
      <TabsContent value="today" className="mt-4">
        <div className="mb-3 flex items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {format(now, 'EEEE، d MMMM yyyy', { locale: dateLocale })}
          </p>
          <Badge variant="outline">{todayAppts.length} موعد</Badge>
        </div>
        {renderTable(todayAppts, { withInvoice: showInvoice, withComplete: showComplete })}
      </TabsContent>

      {/* This week grouped by day */}
      <TabsContent value="week" className="mt-4">
        {renderWeekGrouped()}
      </TabsContent>

      {/* Completed */}
      <TabsContent value="completed" className="mt-4">
        {renderTable(completed, { withFee: true, withDate: true })}
      </TabsContent>

      {/* Calendar */}
      <TabsContent value="calendar" className="mt-4">
        <AppointmentCalendar appointments={appointments} doctorId={doctorId} />
      </TabsContent>

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
              {doctorId && (
                <>
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editDate}
                      onChange={(e) => {
                        setEditDate(e.target.value)
                        if (e.target.value && editingAppt) loadSlotsForDate(editingAppt, e.target.value)
                      }}
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
                              {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEditingAppt(null)} disabled={editSaving}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={editSaving || (!!doctorId && !editSelectedSlot)}>
                  {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
