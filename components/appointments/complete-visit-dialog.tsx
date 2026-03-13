'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { completeAppointment } from '@/lib/actions/appointments'

interface CompleteVisitDialogProps {
  appointmentId: string
  patientId: string
  patientName: string
  appointmentTypeLabel: string
}

export function CompleteVisitDialog({
  appointmentId,
}: CompleteVisitDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleComplete() {
    startTransition(async () => {
      await completeAppointment(appointmentId)
      router.refresh()
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
      onClick={handleComplete}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      Complete
    </Button>
  )
}
