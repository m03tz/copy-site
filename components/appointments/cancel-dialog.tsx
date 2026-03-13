'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cancelAppointment } from '@/lib/actions/appointments'

interface CancelDialogProps {
  appointmentId: string
  onCancelled?: () => void
}

export function CancelDialog({ appointmentId, onCancelled }: CancelDialogProps) {
  const t = useTranslations('appointments')
  const tCommon = useTranslations('common')

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [reason, setReason] = useState('')

  async function handleConfirm() {
    if (!reason.trim()) return

    setLoading(true)
    setError(null)

    const result = await cancelAppointment(appointmentId, reason.trim())

    setLoading(false)

    if (result.error) {
      setError(t('cancelError'))
      return
    }

    setSuccess(true)
    setOpen(false)
    setReason('')
    setSuccess(false)
    onCancelled?.()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null)
      setReason('')
      setSuccess(false)
    }
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {t('cancelAppointment')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cancelAppointment')}</DialogTitle>
          <DialogDescription>{t('cancelConfirm')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">{t('cancelReason')}</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
          />
        </div>

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}

        {success && (
          <p className="text-sm text-green-600">{t('cancelSuccess')}</p>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
          >
            {loading ? tCommon('loading') : tCommon('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
