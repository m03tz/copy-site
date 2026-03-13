'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAvailableSlotsForPatient, bookAppointmentAsPatient } from '@/lib/actions/patient-booking'
import type { TimeSlot } from '@/lib/utils/slots'

type AppointmentType = 'consultation' | 'follow_up' | 'prenatal' | 'ultrasound' | 'other'

const appointmentTypes: AppointmentType[] = [
  'consultation',
  'follow_up',
  'prenatal',
  'ultrasound',
  'other',
]

export function PatientBookingForm() {
  const t = useTranslations('appointments')
  const tCommon = useTranslations('common')

  const [appointmentType, setAppointmentType] = useState<AppointmentType | ''>('')
  const [notes, setNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)

  async function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date)
    setSelectedSlot(null)
    setSlots([])
    setError(null)

    if (!date) return

    setSlotsLoading(true)
    const result = await getAvailableSlotsForPatient(format(date, 'yyyy-MM-dd'))
    setSlotsLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSlots(result.slots)
    }
  }

  async function handleBook() {
    if (!appointmentType || !selectedSlot) return

    setBookingLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('scheduled_start', selectedSlot.start)
    formData.set('scheduled_end', selectedSlot.end)
    formData.set('appointment_type', appointmentType)
    if (notes.trim()) {
      formData.set('notes', notes.trim())
    }

    const result = await bookAppointmentAsPatient(formData)
    setBookingLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(true)
    setAppointmentType('')
    setNotes('')
    setSelectedDate(undefined)
    setSlots([])
    setSelectedSlot(null)

    setTimeout(() => setSuccess(false), 6000)
  }

  const canBook = appointmentType && selectedSlot && !bookingLoading

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('bookAppointment')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
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

          {/* Appointment type */}
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

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t('notes')}
            />
          </div>

          {/* Date picker — inline calendar */}
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

          {/* Time slots */}
          {selectedDate && (
            <div className="space-y-2">
              <Label>{t('selectTime')}</Label>
              {slotsLoading ? (
                <p className="text-muted-foreground text-sm">{tCommon('loading')}</p>
              ) : slots.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('noAvailableSlots')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.start === slot.start
                    return (
                      <Button
                        key={slot.start}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedSlot(slot)}
                        className="text-sm"
                      >
                        {slot.startDisplay}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Confirm */}
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
        </div>
      </CardContent>
    </Card>
  )
}
