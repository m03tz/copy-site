'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisitForm } from '@/components/medical-records/visit-form'

interface NewVisitButtonProps {
  patientId: string
}

export function NewVisitButton({ patientId }: NewVisitButtonProps) {
  const t = useTranslations('visits')
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={handleClick}
      >
        <FilePlus className="h-4 w-4 me-1" />
        {t('create')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('create')}</DialogTitle>
          </DialogHeader>
          <VisitForm
            patientId={patientId}
            onSuccess={() => {
              setOpen(false)
              router.refresh()
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
