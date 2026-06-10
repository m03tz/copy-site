'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MeasurementForm } from '@/components/pregnancy/measurement-form'
import { MeasurementList } from '@/components/pregnancy/measurement-list'
import { getGestationalWeek, getDaysUntilDue } from '@/lib/utils/pregnancy'
import { updatePregnancyStatus, deletePregnancy, updatePregnancy } from '@/lib/actions/pregnancies'
import type { Pregnancy, PregnancyMeasurement } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type PregnancyWithMeasurements = Pregnancy & {
  pregnancy_measurements: PregnancyMeasurement[]
}

interface LatestVitals {
  blood_pressure?: string
  weight?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Parse genders (supports single string or JSON array) ────────────────────

export function parseGenders(baby_gender: string | null): string[] {
  if (!baby_gender) return []
  try {
    const parsed = JSON.parse(baby_gender)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // plain string
  }
  return [baby_gender]
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'delivered':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'miscarriage':
    case 'ectopic':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return ''
  }
}


// ─── Component ────────────────────────────────────────────────────────────────

interface PregnancyCardProps {
  pregnancy: PregnancyWithMeasurements
  latestVitals?: LatestVitals | null
}

export function PregnancyCard({ pregnancy, latestVitals }: PregnancyCardProps) {
  const t = useTranslations('pregnancy')
  const [isPending, startTransition] = useTransition()
  const [statusError, setStatusError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  function handleDeletePregnancy() {
    setDeleteError(null)
    setConfirmOpen(false)
    startTransition(async () => {
      const result = await deletePregnancy(pregnancy.id, pregnancy.patient_id)
      if (result.error) {
        setDeleteError(typeof result.error === 'string' ? result.error : t('deleteError'))
      }
    })
  }

  const isActive = pregnancy.status === 'active'
  const gestationalWeek = isActive ? getGestationalWeek(pregnancy.lmp_date) : null
  const daysUntilDue = isActive ? getDaysUntilDue(pregnancy.expected_due_date) : null
  const babyGenders = parseGenders(pregnancy.baby_gender)

  function handleStatusChange(newStatus: string) {
    setStatusError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('pregnancy_id', pregnancy.id)
      formData.set('status', newStatus)
      const result = await updatePregnancyStatus(formData)
      if (result.error) {
        setStatusError(typeof result.error === 'string' ? result.error : 'An error occurred')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Status badge + dates */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={getStatusBadgeClass(pregnancy.status)}
              >
                {t(`status.${pregnancy.status}`)}
              </Badge>

              {/* Baby gender badges — one per baby */}
              {babyGenders.length > 0 ? (
                babyGenders.map((g, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={
                      g === 'male'   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      g === 'female' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'text-muted-foreground'
                    }
                  >
                    {g === 'male' ? t('genderMaleOption') : g === 'female' ? t('genderFemaleOption') : t('genderUnspecified')}
                    {babyGenders.length > 1 && (
                      <span className="ms-1 font-normal opacity-60">({i + 1})</span>
                    )}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  {t('genderUnspecified')}
                </Badge>
              )}

              {/* Notes — shown inline next to gender badges */}
              {pregnancy.notes && (
                <span className="text-base font-semibold text-red-600">
                  {pregnancy.notes}
                </span>
              )}
            </div>

            <div className="space-y-1 text-sm">
              {/* LMP date */}
              <div className="flex gap-2">
                <span className="text-muted-foreground">{t('form.lmpDate')}:</span>
                <span>{format(new Date(pregnancy.lmp_date), 'dd-MM-yyyy')}</span>
              </div>

              {/* Expected due date */}
              <div className="flex gap-2">
                <span className="text-muted-foreground">{t('form.expectedDueDate')}:</span>
                <span>{format(new Date(pregnancy.expected_due_date), 'dd-MM-yyyy')}</span>
              </div>

              {/* Gestational week (active only) */}
              {isActive && gestationalWeek !== null && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">{t('timeline.currentWeek')}:</span>
                  <span className="font-medium">
                    {gestationalWeek} {t('timeline.weeksLabel')}
                  </span>
                </div>
              )}

              {/* Days until due (active only) */}
              {isActive && daysUntilDue !== null && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">{t('timeline.daysUntilDue')}:</span>
                  <span className={cn(
                    daysUntilDue >= 0 && daysUntilDue <= 7  && 'font-bold text-red-600',
                    daysUntilDue > 7  && daysUntilDue <= 14 && 'font-medium text-amber-600',
                  )}>
                    {daysUntilDue} {t('timeline.daysUntilDue')}
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 items-end">
            <MeasurementForm
              pregnancyId={pregnancy.id}
              lmpDate={pregnancy.lmp_date}
              latestVitals={latestVitals}
            />

            {/* Edit pregnancy button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5 me-1" />
              {t('editButton')}
            </Button>

            {/* Delete entire pregnancy */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-destructive border-destructive/40 hover:bg-destructive/10"
              disabled={isPending}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 me-1" />
              {t('deleteButton')}
            </Button>

            {/* Confirm delete dialog */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('deleteTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('deleteConfirmMsg')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                    {t('actions.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeletePregnancy}
                    disabled={isPending}
                  >
                    {t('actions.delete')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Status update select — available for all pregnancies */}
            <div className="w-48">
              <Select
                defaultValue={pregnancy.status}
                onValueChange={handleStatusChange}
                disabled={isPending}
              >
                <SelectTrigger className="text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('status.active')}</SelectItem>
                  <SelectItem value="delivered">{t('status.delivered')}</SelectItem>
                  <SelectItem value="miscarriage">{t('status.miscarriage')}</SelectItem>
                  <SelectItem value="ectopic">{t('status.ectopic')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {statusError && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{statusError}</AlertDescription>
          </Alert>
        )}
        {deleteError && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <p className="text-sm font-medium mb-3">{t('measurements.title')}</p>
        <MeasurementList
          measurements={pregnancy.pregnancy_measurements}
          patientId={pregnancy.patient_id}
          lmpDate={pregnancy.lmp_date}
        />
      </CardContent>

      {/* Edit Pregnancy Dialog */}
      <EditPregnancyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        pregnancy={pregnancy}
      />
    </Card>
  )
}

// ─── Edit Pregnancy Dialog ─────────────────────────────────────────────────────

function EditPregnancyDialog({
  open,
  onOpenChange,
  pregnancy,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  pregnancy: PregnancyWithMeasurements
}) {
  const t = useTranslations('pregnancy')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const initialGenders = parseGenders(pregnancy.baby_gender)
  const [numBabies, setNumBabies] = useState(Math.max(1, initialGenders.length))
  const [genders, setGenders] = useState<string[]>(() => {
    const arr = ['', '', '', '']
    initialGenders.forEach((g, i) => { arr[i] = g })
    return arr
  })

  function setGender(index: number, value: string) {
    setGenders((prev) => prev.map((g, i) => (i === index ? value : g)))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('pregnancy_id', pregnancy.id)
    const activeGenders = genders.slice(0, numBabies)
    if (numBabies === 1) {
      if (activeGenders[0]) formData.set('baby_gender', activeGenders[0])
    } else {
      formData.set('baby_gender', JSON.stringify(activeGenders))
    }

    startTransition(async () => {
      const result = await updatePregnancy(formData)
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : t('editError'))
      } else {
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('editDialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* LMP Date */}
          <div className="space-y-1">
            <Label htmlFor="edit_lmp_date">{t('editLmpDate')}</Label>
            <DatePickerInput
              id="edit_lmp_date"
              name="lmp_date"
              defaultValue={pregnancy.lmp_date}
              required
            />
          </div>

          {/* Number of babies */}
          <div className="space-y-2">
            <Label>عدد الأجنة</Label>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((n) => (
                <label key={n} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="edit_num_babies"
                    value={n}
                    checked={numBabies === n}
                    onChange={() => setNumBabies(n)}
                    className="accent-primary h-4 w-4"
                  />
                  <span className="text-sm font-medium">{n}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Baby gender(s) */}
          <div className="space-y-2">
            {Array.from({ length: numBabies }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Label>
                  {t('editBabyGender')}{numBabies > 1 ? ` (${i + 1})` : ''}
                </Label>
                <Select
                  value={genders[i] || 'unspecified'}
                  onValueChange={(v) => setGender(i, v === 'unspecified' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('genderUnspecifiedOption')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">{t('genderUnspecifiedOption')}</SelectItem>
                    <SelectItem value="male">{t('genderMaleOption')}</SelectItem>
                    <SelectItem value="female">{t('genderFemaleOption')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="edit_notes">{t('form.notes')}</Label>
            <Textarea
              id="edit_notes"
              name="notes"
              rows={3}
              defaultValue={pregnancy.notes ?? ''}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '...' : t('saveEdits')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
