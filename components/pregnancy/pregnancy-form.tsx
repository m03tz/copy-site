'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { createPregnancy } from '@/lib/actions/pregnancies'
import { Plus } from 'lucide-react'

// ─── Validation schema ────────────────────────────────────────────────────────

const pregnancyFormSchema = z.object({
  lmp_date: z.string().min(1, 'LMP date is required'),
  notes: z.string().optional(),
})

type PregnancyFormValues = z.infer<typeof pregnancyFormSchema>

// ─── Component ────────────────────────────────────────────────────────────────

interface PregnancyFormProps {
  patientId: string
}

export function PregnancyForm({ patientId }: PregnancyFormProps) {
  const t = useTranslations('pregnancy')
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [numBabies, setNumBabies] = useState(1)
  const [genders, setGenders] = useState<string[]>(['', '', '', ''])

  const form = useForm<PregnancyFormValues>({
    resolver: zodResolver(pregnancyFormSchema),
    defaultValues: { lmp_date: '', notes: '' },
  })

  function setGender(index: number, value: string) {
    setGenders((prev) => prev.map((g, i) => (i === index ? value : g)))
  }

  function onSubmit(values: PregnancyFormValues) {
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('patient_id', patientId)
      formData.set('lmp_date', values.lmp_date)

      const activeGenders = genders.slice(0, numBabies)
      if (numBabies === 1) {
        if (activeGenders[0]) formData.set('baby_gender', activeGenders[0])
      } else {
        formData.set('baby_gender', JSON.stringify(activeGenders))
      }

      if (values.notes) formData.set('notes', values.notes)

      const result = await createPregnancy(formData)
      if (result.error) {
        setServerError(typeof result.error === 'string' ? result.error : 'An error occurred')
      } else {
        form.reset()
        setNumBabies(1)
        setGenders(['', '', '', ''])
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 me-1" />
          {t('addPregnancy')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('addPregnancy')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

          {/* LMP Date */}
          <div className="space-y-1">
            <Label htmlFor="lmp_date">{t('form.lmpDate')}</Label>
            <Controller
              name="lmp_date"
              control={form.control}
              render={({ field }) => (
                <DatePickerInput
                  id="lmp_date"
                  value={field.value}
                  onChange={field.onChange}
                  required
                />
              )}
            />
            {form.formState.errors.lmp_date && (
              <p className="text-xs text-destructive">
                {form.formState.errors.lmp_date.message}
              </p>
            )}
          </div>

          {/* Number of babies */}
          <div className="space-y-2">
            <Label>عدد الأجنة</Label>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((n) => (
                <label key={n} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="num_babies"
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

          {/* Baby gender(s) — duplicated per baby count */}
          <div className="space-y-2">
            {Array.from({ length: numBabies }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Label>
                  جنس المولود{numBabies > 1 ? ` (${i + 1})` : ''} (اختياري)
                </Label>
                <Select
                  value={genders[i] || 'unspecified'}
                  onValueChange={(v) => setGender(i, v === 'unspecified' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="غير محدد بعد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">غير محدد بعد</SelectItem>
                    <SelectItem value="male">ذكر 👦</SelectItem>
                    <SelectItem value="female">أنثى 👧</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="pregnancy_notes">{t('form.notes')}</Label>
            <Textarea
              id="pregnancy_notes"
              rows={2}
              placeholder={t('form.notes')}
              {...form.register('notes')}
            />
          </div>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '...' : t('actions.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
