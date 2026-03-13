'use client'

import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Scissors } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface UpcomingOperation {
  id: string
  patient_name: string
  operation_date: string
  hospital_name: string
  operation_type: string
  days_until: number
}

interface UpcomingOperationsProps {
  operations: UpcomingOperation[]
}

function urgencyVariant(days: number): 'destructive' | 'default' | 'secondary' {
  if (days <= 1) return 'destructive'
  if (days <= 7) return 'default'
  return 'secondary'
}

export function UpcomingOperations({ operations }: UpcomingOperationsProps) {
  const t = useTranslations('operations')

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scissors className="h-4 w-4 text-muted-foreground" />
          {t('upcomingTitle')}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {operations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noUpcoming')}</p>
        ) : (
          <ul className="space-y-3">
            {operations.map((op) => (
              <li key={op.id}>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{op.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{op.operation_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(op.operation_date), 'dd-MM-yyyy')} — {op.hospital_name}
                    </p>
                  </div>
                  <Badge
                    variant={urgencyVariant(op.days_until)}
                    className="ms-3 shrink-0"
                  >
                    {op.days_until === 0
                      ? t('operationToday')
                      : `${op.days_until} ${t('daysUntil')}`}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
