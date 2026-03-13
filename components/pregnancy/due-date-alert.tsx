'use client'

import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Types ─────────────────────────────────────────────────────────────────

interface DueDateAlert {
  patient_id: string
  patient_name: string
  expected_due_date: string
  days_remaining: number
}

interface DueDateAlertProps {
  alerts: DueDateAlert[]
  patientBasePath?: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd-MM-yyyy')
  } catch {
    return dateStr
  }
}

function urgencyVariant(daysRemaining: number): 'destructive' | 'default' | 'secondary' {
  if (daysRemaining <= 3) return 'destructive'
  if (daysRemaining <= 7) return 'default'
  return 'secondary'
}

// ─── DueDateAlert ──────────────────────────────────────────────────────────

export function DueDateAlert({ alerts, patientBasePath = '/doctor/patients' }: DueDateAlertProps) {
  const t = useTranslations('dashboard')

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          {t('dueDateAlerts')}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noDueDateAlerts')}</p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li key={alert.patient_id}>
                <Link
                  href={`${patientBasePath}/${alert.patient_id}`}
                  className={cn(
                    'flex items-center justify-between rounded-md border px-3 py-2 transition-colors',
                    alert.days_remaining <= 7
                      ? 'border-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:border-red-800'
                      : 'hover:bg-accent'
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{alert.patient_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(alert.expected_due_date)}
                    </p>
                  </div>
                  <Badge
                    variant={urgencyVariant(alert.days_remaining)}
                    className="ms-3 shrink-0"
                  >
                    {alert.days_remaining === 0
                      ? t('dueToday')
                      : `${alert.days_remaining} ${t('daysRemaining')}`}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
