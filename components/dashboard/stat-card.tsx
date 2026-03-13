import { Card, CardContent } from '@/components/ui/card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

/**
 * Compact stat card showing an icon, a large value, and a label.
 * Server component — no client interactivity needed.
 */
export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
