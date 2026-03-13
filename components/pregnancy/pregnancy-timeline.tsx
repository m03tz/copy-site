'use client'

import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Baby, Calendar } from 'lucide-react'
import { getGestationalWeek, getDaysUntilDue } from '@/lib/utils/pregnancy'
import type { Pregnancy, PregnancyMeasurement } from '@/lib/types/database'

// ─── Types ─────────────────────────────────────────────────────────────────

type PregnancyWithMeasurements = Pregnancy & {
  pregnancy_measurements: PregnancyMeasurement[]
}

interface PregnancyTimelineProps {
  pregnancies: PregnancyWithMeasurements[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd-MM-yyyy')
  } catch {
    return dateStr
  }
}

function StatusBadge({ status }: { status: Pregnancy['status'] }) {
  const t = useTranslations('pregnancy')

  const variantMap: Record<Pregnancy['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    delivered: 'secondary',
    miscarriage: 'destructive',
    ectopic: 'destructive',
  }

  return (
    <Badge variant={variantMap[status]}>
      {t(`status.${status}`)}
    </Badge>
  )
}

// ─── Measurement Table ──────────────────────────────────────────────────────

function MeasurementTable({ measurements }: { measurements: PregnancyMeasurement[] }) {
  const t = useTranslations('pregnancy')

  if (measurements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        {t('measurements.empty')}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-start py-2 pe-3 font-medium text-muted-foreground">
              {t('measurements.measuredAt')}
            </th>
            <th className="text-start py-2 pe-3 font-medium text-muted-foreground">
              {t('measurements.gestationalWeek')}
            </th>
            <th className="text-start py-2 pe-3 font-medium text-muted-foreground">
              {t('measurements.weightKg')}
            </th>
            <th className="text-start py-2 pe-3 font-medium text-muted-foreground">
              {t('measurements.bloodPressure')}
            </th>
            <th className="text-start py-2 font-medium text-muted-foreground">
              {t('measurements.fetalHeartbeat')}
            </th>
          </tr>
        </thead>
        <tbody>
          {measurements.map((m) => (
            <tr key={m.id} className="border-b last:border-0">
              <td className="py-2 pe-3">{formatDate(m.measured_at)}</td>
              <td className="py-2 pe-3">
                {m.gestational_week != null ? m.gestational_week : '—'}
              </td>
              <td className="py-2 pe-3">
                {m.weight_kg != null ? m.weight_kg : '—'}
              </td>
              <td className="py-2 pe-3">
                {m.blood_pressure ?? '—'}
              </td>
              <td className="py-2">
                {m.fetal_heartbeat != null ? m.fetal_heartbeat : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── PregnancyTimeline ─────────────────────────────────────────────────────

export function PregnancyTimeline({ pregnancies }: PregnancyTimelineProps) {
  const t = useTranslations('pregnancy')

  return (
    <div className="space-y-6">
      {pregnancies.map((pregnancy) => {
        const isActive = pregnancy.status === 'active'
        const gestationalWeek = isActive ? getGestationalWeek(pregnancy.lmp_date) : null
        const daysUntilDue = isActive ? getDaysUntilDue(pregnancy.expected_due_date) : null

        // Sort measurements by measured_at descending
        const sortedMeasurements = [...pregnancy.pregnancy_measurements].sort(
          (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
        )

        return (
          <Card key={pregnancy.id} className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-base">
                  <Baby className="h-4 w-4 text-muted-foreground" />
                  <StatusBadge status={pregnancy.status} />
                </div>
                <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('timeline.lmpDate')}: {formatDate(pregnancy.lmp_date)}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Active pregnancy — show gestational progress prominently */}
              {isActive && (
                <div className="space-y-3">
                  {/* Current week + due date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('timeline.currentWeek')}
                      </p>
                      <p className="text-2xl font-bold">
                        {gestationalWeek != null
                          ? `${gestationalWeek} / 40`
                          : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('timeline.weeksLabel')}
                      </p>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('timeline.dueDate')}
                      </p>
                      <p className="text-lg font-semibold">
                        {formatDate(pregnancy.expected_due_date)}
                      </p>
                      {daysUntilDue != null && daysUntilDue >= 0 && (
                        <p className="text-xs text-muted-foreground">
                          {daysUntilDue} {t('timeline.daysUntilDue')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar (gestational week / 40) */}
                  {gestationalWeek != null && (
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min((gestationalWeek / 40) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-end">
                        {Math.min(Math.round((gestationalWeek / 40) * 100), 100)}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Non-active pregnancy — show dates only */}
              {!isActive && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('timeline.dueDate')}: </span>
                    <span>{formatDate(pregnancy.expected_due_date)}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Measurement history */}
              <div>
                <h3 className="text-sm font-medium mb-2">
                  {t('timeline.measurementHistory')}
                </h3>
                <MeasurementTable measurements={sortedMeasurements} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
