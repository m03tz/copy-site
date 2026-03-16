'use client'

import { useState, useTransition, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SlotPicker } from '@/components/appointments/slot-picker'
import { getAvailableSlots, bookAppointment, getPatientFutureAppointments, updateAppointment } from '@/lib/actions/appointments'
import { searchPatients } from '@/lib/actions/patients'
import type { TimeSlot } from '@/lib/utils/slots'
import { ChevronsUpDown, Check, Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

type AppointmentType =
  | 'consultation'
  | 'follow_up'
  | 'prenatal'

interface Patient {
  id: string
  full_name_ar: string
  full_name_en: string | null
  phone?: string | null
  national_id?: string | null
  patient_code?: string | null
}

interface BookingFormProps {
  patients: Patient[]
  doctorId: string
  /** If provided, pre-selects this patient (for booking from patient profile) */
  preselectedPatientId?: string
  preselectedPatientName?: string
  /** Called after a successful booking — e.g. to close a dialog */
  onSuccess?: () => void
}

export function BookingForm({ patients, doctorId, preselectedPatientId, preselectedPatientName, onSuccess }: BookingFormProps) {
  const t = useTranslations('appointments')
  const tCommon = useTranslations('common')

  const [patientId, setPatientId] = useState<string>(preselectedPatientId ?? '')
  const [patientSearchOpen, setPatientSearchOpen] = useState(false)
  const [patientSearchQuery, setPatientSearchQuery] = useState('')
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>(patients.slice(0, 10))
  const [selectedPatientName, setSelectedPatientName] = useState<string>(preselectedPatientName ?? '')
  const [, startSearch] = useTransition()
  const [appointmentType, setAppointmentType] = useState<AppointmentType | ''>('')
  const [notes, setNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [futureAppointments, setFutureAppointments] = useState<{ id: string; scheduled_start: string; scheduled_end: string; appointment_type: string; status: string; notes: string | null }[]>([])

  // Edit appointment state
  const [editingAppt, setEditingAppt] = useState<{ id: string; scheduled_start: string; scheduled_end: string; appointment_type: string; notes: string | null } | null>(null)
  const [editType, setEditType] = useState<string>('')
  const [editDate, setEditDate] = useState<Date | undefined>()
  const [editSlots, setEditSlots] = useState<TimeSlot[]>([])
  const [editSlotsLoading, setEditSlotsLoading] = useState(false)
  const [editSlot, setEditSlot] = useState<TimeSlot | null>(null)
  const [editNotes, setEditNotes] = useState<string>('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editIsPending, startEditTransition] = useTransition()

  // Fetch patient's future appointments when patient is pre-selected (from patient profile)
  useEffect(() => {
    if (!preselectedPatientId) return
    getPatientFutureAppointments(preselectedPatientId).then((res) => {
      setFutureAppointments(res.appointments ?? [])
    })
  }, [preselectedPatientId])

  async function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date)
    setSelectedSlot(null)
    setSlots([])
    setError(null)

    if (!date) return

    setSlotsLoading(true)
    const result = await getAvailableSlots(
      format(date, 'yyyy-MM-dd'),
      doctorId
    )
    setSlotsLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSlots(result.slots)
    }

  }

  function openEditDialog(appt: typeof futureAppointments[number]) {
    setEditingAppt(appt)
    setEditType(appt.appointment_type)
    const d = new Date(appt.scheduled_start)
    setEditDate(d)
    setEditSlot(null)
    setEditSlots([])
    setEditNotes(appt.notes ?? '')
    setEditError(null)
    setEditSlotsLoading(true)
    getAvailableSlots(format(d, 'yyyy-MM-dd'), doctorId).then((res) => {
      setEditSlotsLoading(false)
      setEditSlots(res.slots ?? [])
      // Pre-select the existing slot
      const existing = (res.slots ?? []).find(
        (s) => s.start === format(new Date(appt.scheduled_start), 'HH:mm')
      )
      if (existing) setEditSlot(existing)
    })
  }

  function handleEditDateSelect(date: Date | undefined) {
    setEditDate(date)
    setEditSlot(null)
    setEditSlots([])
    if (!date) return
    setEditSlotsLoading(true)
    getAvailableSlots(format(date, 'yyyy-MM-dd'), doctorId).then((res) => {
      setEditSlotsLoading(false)
      setEditSlots(res.slots ?? [])
    })
  }

  function handleEditSave() {
    if (!editingAppt || !editType || !editDate || !editSlot) return
    setEditError(null)
    const dateStr = format(editDate, 'yyyy-MM-dd')
    const scheduled_start = `${dateStr}T${editSlot.start}:00`
    const scheduled_end   = `${dateStr}T${editSlot.end}:00`
    startEditTransition(async () => {
      const res = await updateAppointment({
        id: editingAppt.id,
        appointment_type: editType,
        scheduled_start,
        scheduled_end,
        notes: editNotes || undefined,
      })
      if (res.error) {
        setEditError(res.error)
      } else {
        setEditingAppt(null)
        // Refresh future appointments list
        const patId = preselectedPatientId ?? patientId
        if (patId) {
          getPatientFutureAppointments(patId).then((r) => setFutureAppointments(r.appointments ?? []))
        }
      }
    })
  }

  async function handleBook() {
    if (!patientId || !appointmentType || !selectedSlot) return

    setBookingLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('patient_id', patientId)
    formData.set('scheduled_start', selectedSlot.start)
    formData.set('scheduled_end', selectedSlot.end)
    formData.set('appointment_type', appointmentType)
    if (notes.trim()) {
      formData.set('notes', notes.trim())
    }

    const result = await bookAppointment(formData)

    setBookingLoading(false)

    if (result.error) {
      if (result.error === 'slotTaken') {
        setError(t('slotTaken'))
        // Refresh slots
        if (selectedDate) {
          setSlotsLoading(true)
          const refreshed = await getAvailableSlots(
            format(selectedDate, 'yyyy-MM-dd'),
            doctorId
          )
          setSlotsLoading(false)
          setSlots(refreshed.slots)
          setSelectedSlot(null)
        }
      } else if (result.error === 'patientHasActiveAppointment') {
        setError(t('patientHasActiveAppointment'))
      } else if (typeof result.error === 'string') {
        setError(result.error)
      } else {
        setError(t('bookingError'))
      }
      return
    }

    // Success: reset form (but keep pre-selected patient)
    setSuccess(true)
    if (!preselectedPatientId) {
      setPatientId('')
      setSelectedPatientName('')
    }
    setAppointmentType('')
    setNotes('')
    setSelectedDate(undefined)
    setSlots([])
    setSelectedSlot(null)

    setTimeout(() => {
      setSuccess(false)
      onSuccess?.()
    }, 1500)
  }

  function getPatientDisplayName(patient: Patient) {
    return patient.full_name_ar
  }

  const appointmentTypes: AppointmentType[] = [
    'consultation',
    'prenatal',
    'follow_up',
  ]

  async function handlePatientSearch(query: string) {
    setPatientSearchQuery(query)
    if (!query.trim()) {
      setPatientSearchResults(patients.slice(0, 10))
      return
    }
    startSearch(async () => {
      const { patients: found } = await searchPatients(query, 1, 20)
      setPatientSearchResults((found as Patient[] | undefined) ?? [])
    })
  }

  const canBook = patientId && appointmentType && selectedSlot && !bookingLoading

  return (
    <div className="space-y-6 max-w-2xl">
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {t('bookingSuccess')}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Patient + Type */}
      <div className="space-y-4">
        {/* Patient search combobox */}
        {!preselectedPatientId && (
          <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <Label>{t('selectPatient')}</Label>
            <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={patientSearchOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedPatientName || t('selectPatient')}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('selectPatient')}
                    value={patientSearchQuery}
                    onValueChange={handlePatientSearch}
                  />
                  <CommandList>
                    <CommandEmpty>{tCommon('search')}</CommandEmpty>
                    <CommandGroup>
                      {patientSearchResults.map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={patient.id}
                          onSelect={() => {
                            setPatientId(patient.id)
                            setSelectedPatientName(getPatientDisplayName(patient))
                            setPatientSearchOpen(false)
                            getPatientFutureAppointments(patient.id).then((res) => {
                              setFutureAppointments(res.appointments ?? [])
                            })
                          }}
                        >
                          <Check
                            className={`me-2 h-4 w-4 shrink-0 ${patientId === patient.id ? 'opacity-100' : 'opacity-0'}`}
                          />
                          <div className="flex flex-col">
                            <span>{patient.full_name_ar}</span>
                            <span className="text-xs text-muted-foreground flex gap-2">
                              {patient.patient_code && <span>{patient.patient_code}</span>}
                              {patient.national_id && <span>{patient.national_id}</span>}
                              {patient.phone && <span>{patient.phone}</span>}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {/* Future appointments squares */}
          {futureAppointments.length > 0 && (
            <FutureAppointmentSquares appointments={futureAppointments} onEdit={openEditDialog} />
          )}
          </div>
        )}
        {preselectedPatientId && (
          <div className="space-y-3">
            {futureAppointments.length > 0 && (
              <FutureAppointmentSquares appointments={futureAppointments} onEdit={openEditDialog} />
            )}
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{t('selectPatient')}: </span>
              <span className="font-medium">{preselectedPatientName}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t('selectType')}</Label>
          <Select
            value={appointmentType}
            onValueChange={(v) => setAppointmentType(v as AppointmentType)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectType')} />
            </SelectTrigger>
            <SelectContent>
              {appointmentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`type.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('notes')}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            rows={2}
            placeholder={t('notes')}
          />
        </div>
      </div>

      {/* Step 2: Date picker */}
      <div className="space-y-2">
        <Label>{t('selectDate')}</Label>
        <div className="w-full rounded-lg border bg-card p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={{ before: new Date() }}
            className="[--cell-size:3rem] text-base"
            fullWidth
          />
        </div>
      </div>

      {/* Step 3: Slot picker */}
      {selectedDate && (
        <div className="space-y-2">
          <Label>{t('selectTime')}</Label>
          {slotsLoading ? (
            <p className="text-muted-foreground text-sm">{tCommon('loading')}</p>
          ) : (
            <SlotPicker
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
            />
          )}
        </div>
      )}

      {/* Step 4: Confirm */}
      {selectedSlot && (
        <div className="space-y-3 rounded-md border p-4 text-sm">
          <p className="font-medium">{t('bookAppointment')}</p>
          <p>
            {selectedDate && format(selectedDate, 'PPP')} —{' '}
            {selectedSlot.startDisplay} – {selectedSlot.endDisplay}
          </p>
          <Button
            onClick={handleBook}
            disabled={!canBook}
            className="w-full"
          >
            {bookingLoading ? tCommon('loading') : tCommon('confirm')}
          </Button>
        </div>
      )}

      {/* Edit appointment dialog */}
      <Dialog open={!!editingAppt} onOpenChange={(open) => { if (!open) setEditingAppt(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>تعديل الموعد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Type */}
            <div className="space-y-1.5">
              <Label>{t('selectType')}</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['consultation','follow_up','prenatal','ultrasound','other'] as const).map((tp) => (
                    <SelectItem key={tp} value={tp}>{t(`type.${tp}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Date */}
            <div className="space-y-1.5">
              <Label>{t('selectDate')}</Label>
              <div className="rounded-lg border bg-card p-3">
                <Calendar
                  mode="single"
                  selected={editDate}
                  onSelect={handleEditDateSelect}
                  disabled={{ before: new Date() }}
                  className="[--cell-size:2.5rem]"
                  fullWidth
                />
              </div>
            </div>
            {/* Slots */}
            {editDate && (
              <div className="space-y-1.5">
                <Label>{t('selectTime')}</Label>
                {editSlotsLoading
                  ? <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
                  : <SlotPicker slots={editSlots} selectedSlot={editSlot} onSelect={setEditSlot} />
                }
              </div>
            )}
            {/* Notes */}
            <div className="space-y-1.5">
              <Label>{t('notes')}</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                rows={2}
                placeholder={t('notes')}
              />
            </div>
            {editError && <p className="text-xs text-destructive">{editError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingAppt(null)} disabled={editIsPending}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleEditSave} disabled={editIsPending || !editSlot}>
              {editIsPending ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Future appointments as clickable squares ──────────────────────────────────
function FutureAppointmentSquares({
  appointments,
  onEdit,
}: {
  appointments: { id: string; scheduled_start: string; appointment_type: string; notes: string | null; scheduled_end: string; status: string }[]
  onEdit: (appt: { id: string; scheduled_start: string; scheduled_end: string; appointment_type: string; status: string; notes: string | null }) => void
}) {
  return (
    <div className="w-full space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">مواعيد قادمة</p>
      <div className="flex flex-wrap gap-2">
        {appointments.map((appt) => (
          <button
            key={appt.id}
            type="button"
            onClick={() => onEdit(appt)}
            title={`${appt.appointment_type} — انقر للتعديل`}
            className="group relative flex flex-col items-start gap-0.5 rounded-md border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-colors cursor-pointer px-3 py-2 flex-1 min-w-[110px]"
          >
            <span className="text-[12px] font-bold text-primary leading-tight">
              {format(new Date(appt.scheduled_start), 'dd-MM-yyyy')}
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              {format(new Date(appt.scheduled_start), 'HH:mm')} · {appt.appointment_type}
            </span>
            <Pencil className="absolute top-1.5 left-1.5 h-2.5 w-2.5 text-primary/30 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  )
}
