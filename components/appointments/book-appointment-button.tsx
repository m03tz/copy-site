'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CalendarPlus } from 'lucide-react'
import { BookingForm } from '@/components/appointments/booking-form'

interface Patient {
  id: string
  full_name_ar: string
  full_name_en: string | null
}

interface BookAppointmentButtonProps {
  patients: Patient[]
  doctorId: string
}

export function BookAppointmentButton({ patients, doctorId }: BookAppointmentButtonProps) {
  const t = useTranslations('appointments')
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus className="h-4 w-4 me-1" />
          {t('bookAppointment')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('bookAppointment')}</DialogTitle>
        </DialogHeader>
        <BookingForm patients={patients} doctorId={doctorId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
