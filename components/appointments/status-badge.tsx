'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled'

interface StatusBadgeProps {
  status: AppointmentStatus
}

const statusClasses: Record<AppointmentStatus, string> = {
  scheduled:
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-transparent hover:bg-blue-100',
  confirmed:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent hover:bg-green-100',
  completed:
    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-transparent hover:bg-gray-100',
  cancelled:
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-transparent hover:bg-red-100',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('appointments')

  return (
    <Badge className={cn(statusClasses[status])}>
      {t(`status.${status}`)}
    </Badge>
  )
}
