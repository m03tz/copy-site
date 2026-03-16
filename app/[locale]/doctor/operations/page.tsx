import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getOperations } from '@/lib/actions/operations'
import { getExternalCosts } from '@/lib/actions/external-costs'
import { OperationsTable } from '@/components/operations/operations-table'

export const dynamic = 'force-dynamic'

export default async function OperationsPage() {
  const t = await getTranslations('operations')

  const supabase = await createClient()

  const [operationsResult, patientsResult, externalCostsResult] = await Promise.all([
    getOperations(),
    supabase
      .from('patients')
      .select('id, patient_code, profiles!inner(full_name_ar, full_name_en, phone)')
      .order('created_at', { ascending: false }),
    getExternalCosts(),
  ])

  const operations = operationsResult.data ?? []
  const externalCosts = externalCostsResult.data ?? []

  const patients = (patientsResult.data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as { full_name_ar: string; full_name_en: string | null; phone: string | null }
    return {
      id: row.id as string,
      full_name_ar: profile.full_name_ar,
      full_name_en: profile.full_name_en,
      patient_code: row.patient_code as string | null,
      phone: profile.phone ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <OperationsTable operations={operations} patients={patients} externalCosts={externalCosts} />
    </div>
  )
}
