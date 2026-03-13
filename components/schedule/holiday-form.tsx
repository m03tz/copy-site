'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { addHoliday } from '@/lib/actions/schedule'

interface HolidayFormProps {
  onSuccess?: () => void
}

type FormState = {
  success?: boolean
  error?: string | Record<string, string[]>
} | null

export function HolidayForm({ onSuccess }: HolidayFormProps) {
  const t = useTranslations('schedule')
  const tCommon = useTranslations('common')

  const todayIso = new Date().toISOString().split('T')[0]

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prev: FormState, formData: FormData) => {
      const result = await addHoliday(formData)
      if (result.success && onSuccess) {
        onSuccess()
      }
      return result
    },
    null
  )

  const errorMessage =
    state?.error
      ? typeof state.error === 'string'
        ? state.error
        : Object.values(state.error).flat().join(', ')
      : null

  return (
    <form action={formAction} className="space-y-4">
      {/* Holiday Date */}
      <div className="space-y-2">
        <Label htmlFor="holiday_date">{t('holidayDate')}</Label>
        <DatePickerInput
          id="holiday_date"
          name="holiday_date"
          min={todayIso}
          required
        />
      </div>

      {/* Reason (optional) */}
      <div className="space-y-2">
        <Label htmlFor="reason" className="flex gap-1 items-baseline">
          {t('reason')}
          <span className="text-muted-foreground text-xs font-normal">
            (optional)
          </span>
        </Label>
        <Textarea
          id="reason"
          name="reason"
          rows={2}
          className="w-full resize-none"
          placeholder={t('reason')}
        />
      </div>

      {/* Error message */}
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {/* Success message */}
      {state?.success && (
        <p className="text-sm text-green-600">{t('holidaySaved')}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? tCommon('loading') : t('addHoliday')}
      </Button>
    </form>
  )
}
