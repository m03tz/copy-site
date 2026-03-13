'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateMyInfo } from '@/lib/actions/patient-profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPen, Save, X, CheckCircle2 } from 'lucide-react'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

interface PatientProfileData {
  full_name_ar: string
  phone: string
  date_of_birth: string
  blood_type: string | null
  national_id: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

interface PatientProfileFormProps {
  initialData: PatientProfileData
}

export function PatientProfileForm({ initialData }: PatientProfileFormProps) {
  const t = useTranslations('patientProfile')
  const tCommon = useTranslations('common')

  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form fields
  const [fullNameAr, setFullNameAr] = useState(initialData.full_name_ar)
  const [phone, setPhone] = useState(initialData.phone)
  const [dateOfBirth, setDateOfBirth] = useState(initialData.date_of_birth)
  const [bloodType, setBloodType] = useState(initialData.blood_type ?? '')
  const [nationalId, setNationalId] = useState(initialData.national_id ?? '')
  const [emergencyName, setEmergencyName] = useState(initialData.emergency_contact_name ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(initialData.emergency_contact_phone ?? '')

  const handleCancel = () => {
    // Reset to initial values
    setFullNameAr(initialData.full_name_ar)
    setPhone(initialData.phone)
    setDateOfBirth(initialData.date_of_birth)
    setBloodType(initialData.blood_type ?? '')
    setNationalId(initialData.national_id ?? '')
    setEmergencyName(initialData.emergency_contact_name ?? '')
    setEmergencyPhone(initialData.emergency_contact_phone ?? '')
    setError(null)
    setIsEditing(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.set('full_name_ar', fullNameAr)
    formData.set('phone', phone)
    formData.set('date_of_birth', dateOfBirth)
    if (bloodType) formData.set('blood_type', bloodType)
    if (nationalId) formData.set('national_id', nationalId)
    if (emergencyName) formData.set('emergency_contact_name', emergencyName)
    if (emergencyPhone) formData.set('emergency_contact_phone', emergencyPhone)

    const result = await updateMyInfo(formData)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(true)
    setIsEditing(false)
    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPen className="h-5 w-5 text-primary" />
            {t('title')}
          </CardTitle>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              {tCommon('edit')}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {success && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300 mb-4">
            <CheckCircle2 className="h-4 w-4" />
            {t('saveSuccess')}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        {!isEditing ? (
          /* ── View mode ── */
          <div className="space-y-3 text-sm">
            <InfoRow label={t('fullNameAr')} value={initialData.full_name_ar} />
            <InfoRow label={t('phone')} value={initialData.phone} dir="ltr" />
            <InfoRow label={t('dateOfBirth')} value={initialData.date_of_birth} dir="ltr" />
            <InfoRow label={t('bloodType')} value={initialData.blood_type ?? '—'} />
            <InfoRow label={t('nationalId')} value={initialData.national_id ?? '—'} dir="ltr" />
            <InfoRow label={t('emergencyContactName')} value={initialData.emergency_contact_name ?? '—'} />
            <InfoRow label={t('emergencyContactPhone')} value={initialData.emergency_contact_phone ?? '—'} dir="ltr" />
          </div>
        ) : (
          /* ── Edit mode ── */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Full name Arabic */}
              <div className="space-y-1">
                <Label>{t('fullNameAr')}</Label>
                <Input
                  dir="rtl"
                  value={fullNameAr}
                  onChange={(e) => setFullNameAr(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <Label>{t('phone')}</Label>
                <Input
                  dir="ltr"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Date of birth */}
              <div className="space-y-1">
                <Label>{t('dateOfBirth')}</Label>
                <DatePickerInput
                  value={dateOfBirth}
                  onChange={(v) => setDateOfBirth(v)}
                  required
                  disabled={loading}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Blood type */}
              <div className="space-y-1">
                <Label>{t('bloodType')}</Label>
                <Select
                  value={bloodType}
                  onValueChange={setBloodType}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectBloodType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map((bt) => (
                      <SelectItem key={bt} value={bt}>
                        {bt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* National ID */}
              <div className="space-y-1">
                <Label>{t('nationalId')}</Label>
                <Input
                  dir="ltr"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Emergency contact name */}
              <div className="space-y-1">
                <Label>{t('emergencyContactName')}</Label>
                <Input
                  dir="rtl"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Emergency contact phone */}
              <div className="space-y-1 sm:col-span-2">
                <Label>{t('emergencyContactPhone')}</Label>
                <Input
                  dir="ltr"
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} size="sm">
                <Save className="h-4 w-4 me-1" />
                {loading ? tCommon('loading') : tCommon('save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="h-4 w-4 me-1" />
                {tCommon('cancel')}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

// ── Helper: read-only info row ────────────────────────────────────────────────
function InfoRow({
  label,
  value,
  dir,
}: {
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-6 last:border-0 last:pb-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-end" dir={dir}>
        {value}
      </span>
    </div>
  )
}
