'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { upsertScheduleDay } from '@/lib/actions/schedule'

interface ScheduleFormProps {
  existingDays: number[]
  onSuccess?: () => void
  /** When editing an existing day, pass its current values */
  defaultValues?: {
    day_of_week: number
    start_time: string
    end_time: string
    slot_duration_minutes: number
  }
}

type FormState = {
  success?: boolean
  error?: string | Record<string, string[]>
} | null

const SLOT_DURATIONS = [1, 5, 10, 15, 20, 30, 45, 60]

export function ScheduleForm({ existingDays, onSuccess, defaultValues }: ScheduleFormProps) {
  const t = useTranslations('schedule')
  const tCommon = useTranslations('common')

  const isEditing = defaultValues !== undefined

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prev: FormState, formData: FormData) => {
      const result = await upsertScheduleDay(formData)
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
      {/* Day of Week */}
      <div className="space-y-2">
        <Label htmlFor="day_of_week">{t('dayOfWeek')}</Label>
        {isEditing ? (
          <>
            {/* When editing, show the day as text and pass it as hidden input */}
            <div className="bg-muted rounded-md px-3 py-2 text-sm font-medium">
              {t(`days.${defaultValues.day_of_week}` as Parameters<typeof t>[0])}
            </div>
            <input type="hidden" name="day_of_week" value={defaultValues.day_of_week} />
          </>
        ) : (
          <Select name="day_of_week" required>
            <SelectTrigger id="day_of_week">
              <SelectValue placeholder={t('dayOfWeek')} />
            </SelectTrigger>
            <SelectContent>
              {([0, 1, 2, 3, 4, 5, 6] as const).map((day) => (
                <SelectItem
                  key={day}
                  value={String(day)}
                  disabled={existingDays.includes(day)}
                >
                  {t(`days.${day}` as Parameters<typeof t>[0])}
                  {existingDays.includes(day) ? ` (${t('active')})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Start Time */}
      <div className="space-y-2">
        <Label htmlFor="start_time">{t('startTime')}</Label>
        <Input
          id="start_time"
          name="start_time"
          type="time"
          required
          defaultValue={defaultValues?.start_time?.slice(0, 5) ?? ''}
          className="w-full"
        />
      </div>

      {/* End Time */}
      <div className="space-y-2">
        <Label htmlFor="end_time">{t('endTime')}</Label>
        <Input
          id="end_time"
          name="end_time"
          type="time"
          required
          defaultValue={defaultValues?.end_time?.slice(0, 5) ?? ''}
          className="w-full"
        />
      </div>

      {/* Slot Duration */}
      <div className="space-y-2">
        <Label htmlFor="slot_duration_minutes">{t('slotDuration')}</Label>
        <Select
          name="slot_duration_minutes"
          defaultValue={String(defaultValues?.slot_duration_minutes ?? 30)}
        >
          <SelectTrigger id="slot_duration_minutes">
            <SelectValue placeholder="30" />
          </SelectTrigger>
          <SelectContent>
            {SLOT_DURATIONS.map((duration) => (
              <SelectItem key={duration} value={String(duration)}>
                {duration} min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error message */}
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {/* Success message */}
      {state?.success && (
        <p className="text-sm text-green-600">{t('saved')}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? tCommon('loading') : tCommon('save')}
      </Button>
    </form>
  )
}
