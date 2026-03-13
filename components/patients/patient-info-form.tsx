'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { updatePatientInfo, deletePatient } from '@/lib/actions/patients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2 } from 'lucide-react'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

interface PatientInfoData {
  id: string
  full_name_ar: string
  full_name_en: string | null
  phone: string
  email: string | null
  patients:
    | {
        date_of_birth: string
        blood_type: string | null
        national_id: string | null
        patient_code: string | null
        nickname: string | null
        emergency_contact_name: string | null
        emergency_contact_phone: string | null
        notes: string | null
      }
    | null
}

interface PatientInfoFormProps {
  patient: PatientInfoData
}

export function PatientInfoForm({ patient }: PatientInfoFormProps) {
  const t = useTranslations('patients')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePending, setDeletePending] = useState(false)

  // Current blood type for controlled select
  const [bloodType, setBloodType] = useState(patient.patients?.blood_type ?? '')

  const patientRecord = patient.patients

  const handleSubmit = (formData: FormData) => {
    // Inject blood type from state (select is controlled)
    formData.set('patient_id', patient.id)
    formData.set('blood_type', bloodType)

    setMessage(null)
    startTransition(async () => {
      const result = await updatePatientInfo(formData)
      if (result.error) {
        setMessage({ type: 'error', text: String(result.error) })
      } else {
        setMessage({ type: 'success', text: t('actions.save') })
        setIsEditing(false)
      }
    })
  }

  const handleDelete = async () => {
    setDeletePending(true)
    const result = await deletePatient(patient.id)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
      setDeletePending(false)
      setShowDeleteConfirm(false)
    } else {
      router.push('/doctor/patients')
    }
  }

  if (!isEditing) {
    return (
      <div className="space-y-6">
        {/* View mode */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('profile.tabs.info')}</h2>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            {t('actions.edit')}
          </Button>
        </div>

        {patientRecord?.patient_code && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
            <span className="text-sm text-muted-foreground">{t('info.patientCode')}:</span>
            <span className="font-mono font-semibold text-sm tracking-wide" dir="ltr">{patientRecord.patient_code}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField label={t('info.fullNameAr')} value={patient.full_name_ar} />
          <InfoField label={t('info.fullNameEn')} value={patient.full_name_en} />
          <InfoField label={t('info.nickname')} value={patientRecord?.nickname} />
          <InfoField label={t('info.phone')} value={patient.phone} dir="ltr" />
          <InfoField label={t('info.email')} value={patient.email} />
          <InfoField label={t('info.dateOfBirth')} value={patientRecord?.date_of_birth} />
          <InfoField label={t('info.bloodType')} value={patientRecord?.blood_type} />
          <InfoField label={t('info.nationalId')} value={patientRecord?.national_id} />
          <InfoField
            label={t('info.emergencyContactName')}
            value={patientRecord?.emergency_contact_name}
          />
          <InfoField
            label={t('info.emergencyContactPhone')}
            value={patientRecord?.emergency_contact_phone}
            dir="ltr"
          />
        </div>
        {patientRecord?.notes && (
          <InfoField label={t('info.notes')} value={patientRecord.notes} />
        )}

        {/* Delete Patient Section */}
        <div className="border-t pt-4">
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 me-1" />
              {t('deletePatient')}
            </Button>
          ) : (
            <div className="space-y-2 rounded-md border border-destructive p-3">
              <p className="text-sm text-destructive font-medium">{t('deleteConfirm')}</p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deletePending}
                >
                  {deletePending ? '...' : tCommon('confirm')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {tCommon('cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {message && (
          <p
            className={
              message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-destructive'
            }
          >
            {message.text}
          </p>
        )}
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Hidden patient_id */}
      <input type="hidden" name="patient_id" value={patient.id} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('profile.tabs.info')}</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing(false)
              setMessage(null)
              setBloodType(patient.patients?.blood_type ?? '')
            }}
          >
            {t('actions.cancel')}
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? '...' : t('actions.save')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('info.fullNameAr')} required>
          <Input
            name="full_name_ar"
            defaultValue={patient.full_name_ar}
            required
            dir="rtl"
          />
        </FormField>
        <FormField label={t('info.fullNameEn')}>
          <Input
            name="full_name_en"
            defaultValue={patient.full_name_en ?? ''}
            dir="ltr"
          />
        </FormField>
        <FormField label={t('info.nickname')}>
          <Input
            name="nickname"
            defaultValue={patientRecord?.nickname ?? ''}
          />
        </FormField>
        <FormField label={t('info.phone')} required>
          <Input
            name="phone"
            defaultValue={patient.phone}
            required
            dir="ltr"
          />
        </FormField>
        <FormField label={t('info.email')}>
          <Input
            name="email"
            type="email"
            defaultValue={patient.email ?? ''}
            dir="ltr"
          />
        </FormField>
        <FormField label={t('info.dateOfBirth')}>
          <DatePickerInput
            name="date_of_birth"
            defaultValue={patientRecord?.date_of_birth ?? ''}
            max={new Date().toISOString().split('T')[0]}
          />
        </FormField>
        <FormField label={t('info.bloodType')}>
          <Select value={bloodType} onValueChange={setBloodType}>
            <SelectTrigger>
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              {BLOOD_TYPES.map((bt) => (
                <SelectItem key={bt} value={bt}>
                  {bt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label={t('info.nationalId')}>
          <Input
            name="national_id"
            defaultValue={patientRecord?.national_id ?? ''}
            maxLength={10}
            minLength={10}
            inputMode="numeric"
            pattern="[0-9]{10}"
            dir="ltr"
          />
        </FormField>
        <FormField label={t('info.emergencyContactName')}>
          <Input
            name="emergency_contact_name"
            defaultValue={patientRecord?.emergency_contact_name ?? ''}
          />
        </FormField>
        <FormField label={t('info.emergencyContactPhone')}>
          <Input
            name="emergency_contact_phone"
            defaultValue={patientRecord?.emergency_contact_phone ?? ''}
            dir="ltr"
          />
        </FormField>
      </div>

      <FormField label={t('info.notes')}>
        <Textarea
          name="notes"
          defaultValue={patientRecord?.notes ?? ''}
          rows={3}
        />
      </FormField>

      {message && (
        <p
          className={
            message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-destructive'
          }
        >
          {message.text}
        </p>
      )}
    </form>
  )
}

// ─── Helper Components ──────────────────────────────────────────────────────

function InfoField({
  label,
  value,
  dir,
}: {
  label: string
  value: string | null | undefined
  dir?: 'ltr' | 'rtl'
}) {
  if (!value) return null
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <p className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">{label}:</p>
      <p className="text-sm" dir={dir}>
        {value}
      </p>
    </div>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}
