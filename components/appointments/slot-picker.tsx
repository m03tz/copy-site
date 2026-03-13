'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import type { TimeSlot } from '@/lib/utils/slots'

interface SlotPickerProps {
  slots: TimeSlot[]
  selectedSlot: TimeSlot | null
  onSelect: (slot: TimeSlot) => void
}

export function SlotPicker({ slots, selectedSlot, onSelect }: SlotPickerProps) {
  const t = useTranslations('appointments')

  if (slots.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t('noAvailableSlots')}</p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {slots.map((slot) => {
        const isSelected =
          selectedSlot !== null && selectedSlot.start === slot.start

        return (
          <Button
            key={slot.start}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(slot)}
            className="text-sm"
          >
            {slot.startDisplay}
          </Button>
        )
      })}
    </div>
  )
}
