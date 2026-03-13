'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, CheckCircle } from 'lucide-react'
import { createPatient } from '@/lib/actions/users'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export function AddPatientButton() {
  const t = useTranslations('patients')
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [bloodType, setBloodType] = useState<string>('')

  function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)
    if (bloodType) {
      formData.set('blood_type', bloodType)
    }

    startTransition(async () => {
      const result = await createPatient(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          setBloodType('')
        }, 1500)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); setSuccess(false) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 me-1" />
          {t('addPatient')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('addPatient')}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">{t('patientCreated')}</p>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            {/* Full Name Arabic */}
            <div className="space-y-1">
              <Label htmlFor="patient_name_ar">{t('patientNameAr')} <span className="text-destructive">*</span></Label>
              <Input id="patient_name_ar" name="full_name_ar" required />
            </div>

            {/* Full Name English */}
            <div className="space-y-1">
              <Label htmlFor="patient_name_en">{t('patientNameEn')}</Label>
              <Input id="patient_name_en" name="full_name_en" dir="ltr" />
            </div>

            {/* Nickname */}
            <div className="space-y-1">
              <Label htmlFor="patient_nickname">{t('patientNickname')}</Label>
              <Input id="patient_nickname" name="nickname" />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="patient_phone">{t('patientPhone')}</Label>
              <Input id="patient_phone" name="phone" dir="ltr" />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="patient_email">{t('patientEmail')}</Label>
              <Input id="patient_email" name="email" type="email" dir="ltr" />
            </div>

            {/* Date of Birth */}
            <div className="space-y-1">
              <Label htmlFor="patient_dob">{t('patientDob')} <span className="text-destructive">*</span></Label>
              <DatePickerInput
                id="patient_dob"
                name="date_of_birth"
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Blood Type */}
            <div className="space-y-1">
              <Label>{t('patientBloodType')}</Label>
              <Select value={bloodType} onValueChange={setBloodType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectBloodType')} />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* National ID */}
            <div className="space-y-1">
              <Label htmlFor="patient_national_id">{t('patientNationalId')}</Label>
              <Input id="patient_national_id" name="national_id" dir="ltr" maxLength={10} minLength={10} inputMode="numeric" pattern="[0-9]{10}" />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? '...' : t('addPatient')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
