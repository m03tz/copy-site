'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ClipboardPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisitForm } from '@/components/medical-records/visit-form'
import { completeAppointment } from '@/lib/actions/appointments'

interface CreateVisitButtonProps {
  appointmentId: string
  patientId: string
  scheduledStart: string
  appointmentType: string
}

export function CreateVisitButton({
  appointmentId,
  patientId,
  scheduledStart,
  appointmentType,
}: CreateVisitButtonProps) {
  const t = useTranslations('visits')
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSuccess() {
    setOpen(false)
    startTransition(async () => {
      await completeAppointment(appointmentId)
      router.refresh()
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ClipboardPlus className="h-4 w-4" />
        )}
        {t('createVisit')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('createVisit')}</DialogTitle>
          </DialogHeader>
          <VisitForm
            patientId={patientId}
            appointments={[{ id: appointmentId, scheduled_start: scheduledStart, appointment_type: appointmentType }]}
            defaultAppointmentId={appointmentId}
            onSuccess={handleSuccess}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
