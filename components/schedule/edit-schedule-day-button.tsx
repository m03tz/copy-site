'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScheduleForm } from '@/components/schedule/schedule-form'
import type { DoctorSchedule } from '@/lib/types/database'

interface EditScheduleDayButtonProps {
  day: DoctorSchedule
}

export function EditScheduleDayButton({ day }: EditScheduleDayButtonProps) {
  const tCommon = useTranslations('common')
  const t = useTranslations('schedule')
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5 me-1" />
        {tCommon('edit')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('editDay')} — {t(`days.${day.day_of_week}` as Parameters<typeof t>[0])}
            </DialogTitle>
          </DialogHeader>
          <ScheduleForm
            existingDays={[]}
            defaultValues={{
              day_of_week: day.day_of_week,
              start_time: day.start_time,
              end_time: day.end_time,
              slot_duration_minutes: day.slot_duration_minutes,
            }}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
