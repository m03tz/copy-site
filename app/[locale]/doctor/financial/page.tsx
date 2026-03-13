import { getTranslations } from 'next-intl/server'
import { getFinancialSummary, getVisitorsSummary } from '@/lib/actions/invoices'
import { FinancialSummary } from '@/components/dashboard/financial-summary'
import { VisitorsSummary } from '@/components/dashboard/visitors-summary'

export const dynamic = 'force-dynamic'

export default async function FinancialPage() {
  const t = await getTranslations('financial')
  const [finResult, visitorsResult] = await Promise.all([
    getFinancialSummary(),
    getVisitorsSummary(),
  ])

  const financial = {
    todayTotal: finResult.todayTotal ?? 0,
    monthTotal: finResult.monthTotal ?? 0,
    yearTotal: finResult.yearTotal ?? 0,
  }

  const visitors = {
    todayCount: visitorsResult.todayCount ?? 0,
    monthCount: visitorsResult.monthCount ?? 0,
    yearCount: visitorsResult.yearCount ?? 0,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <FinancialSummary
        todayTotal={financial.todayTotal}
        monthTotal={financial.monthTotal}
        yearTotal={financial.yearTotal}
      />
      <VisitorsSummary
        todayCount={visitors.todayCount}
        monthCount={visitors.monthCount}
        yearCount={visitors.yearCount}
      />
    </div>
  )
}
