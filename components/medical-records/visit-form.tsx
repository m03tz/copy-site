'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createVisitRecord, updateVisitRecord } from '@/lib/actions/medical-records'
import { format } from 'date-fns'

interface VitalSigns {
  blood_pressure?: string
  weight?: string
  temperature?: string
  pulse?: string
}

interface VisitFormProps {
  patientId: string
  /** If provided, form is in edit mode */
  existingRecord?: {
    id: string
    visit_date: string
    chief_complaint?: string | null
    diagnosis?: string | null
    treatment_plan?: string | null
    vital_signs?: VitalSigns | null
    notes: string | null
    appointment_id?: string | null
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function VisitForm({
  patientId,
  existingRecord,
  onSuccess,
  onCancel,
}: VisitFormProps) {
  const t = useTranslations('visits')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [visitNote, setVisitNote] = useState<string>(existingRecord?.notes ?? '')

  const isEditMode = !!existingRecord
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Parse existing vital signs
  const existingVitalSigns = existingRecord?.vital_signs as VitalSigns | null

  function handleSubmit(formData: FormData) {
    setError(null)

    if (!visitNote) {
      setError(t('form.notesRequired'))
      return
    }

    // Inject notes (ANC/GYNE) from controlled Select
    formData.set('notes', visitNote)

    startTransition(async () => {
      let result: { success?: boolean; error?: string }

      if (isEditMode) {
        formData.set('record_id', existingRecord.id)
        result = await updateVisitRecord(formData)
      } else {
        formData.set('patient_id', patientId)
        result = await createVisitRecord(formData)
      }

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'An error occurred')
      } else {
        onSuccess?.()
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pe-2">
      {/* Visit Date */}
      <div className="space-y-1">
        <Label htmlFor="visit_date">{t('form.visitDate')}</Label>
        <DatePickerInput
          id="visit_date"
          name="visit_date"
          defaultValue={existingRecord?.visit_date ?? todayStr}
          required
        />
      </div>


      {/* Vital Signs */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">{t('form.vitalSigns')}</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="vital_signs_blood_pressure" className="text-xs">
              {t('form.bloodPressure')}
            </Label>
            <Input
              id="vital_signs_blood_pressure"
              name="vital_signs_blood_pressure"
              placeholder="120/80"
              defaultValue={existingVitalSigns?.blood_pressure ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vital_signs_weight" className="text-xs">
              {t('form.weight')}
            </Label>
            <Input
              id="vital_signs_weight"
              name="vital_signs_weight"
              placeholder="70"
              defaultValue={existingVitalSigns?.weight ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vital_signs_temperature" className="text-xs">
              {t('form.temperature')}
            </Label>
            <Input
              id="vital_signs_temperature"
              name="vital_signs_temperature"
              placeholder="37.0"
              defaultValue={existingVitalSigns?.temperature ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vital_signs_pulse" className="text-xs">
              {t('form.pulse')}
            </Label>
            <Input
              id="vital_signs_pulse"
              name="vital_signs_pulse"
              placeholder="72"
              defaultValue={existingVitalSigns?.pulse ?? ''}
            />
          </div>
        </div>
      </div>

      {/* Notes — visit type: ANC (red) or GYNE (green) */}
      <div className="space-y-1">
        <Label htmlFor="notes">{t('form.notes')} <span className="text-destructive">*</span></Label>
        <Select value={visitNote} onValueChange={setVisitNote}>
          <SelectTrigger id="notes">
            <SelectValue placeholder={t('form.notes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANC">
              <span className="font-semibold text-red-600">ANC</span>
            </SelectItem>
            <SelectItem value="GYNE">
              <span className="font-semibold text-green-600">GYNE</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            {t('actions.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? '...' : t('actions.save')}
        </Button>
      </div>
    </form>
  )
}
