import { redirect } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { PregnancyTimeline } from '@/components/pregnancy/pregnancy-timeline'
import { Baby } from 'lucide-react'
import type { Metadata } from 'next'
import type { Pregnancy, PregnancyMeasurement } from '@/lib/types/database'

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: 'nav' })

  return {
    title: t('myPregnancy'),
  }
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function PatientPregnancyPage() {
  const supabase = await createClient()

  // Get current authenticated patient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const t = await getTranslations('pregnancy')

  // Fetch patient's pregnancies with measurements (newest first)
  const { data: pregnancyData } = await supabase
    .from('pregnancies')
    .select('*, pregnancy_measurements(*)')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false }) as {
      data: (Pregnancy & { pregnancy_measurements: PregnancyMeasurement[] })[] | null
    }

  const pregnancies = (pregnancyData ?? []).map((pregnancy) => ({
    ...pregnancy,
    pregnancy_measurements: [...pregnancy.pregnancy_measurements].sort(
      (a, b) =>
        new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
    ),
  }))

  // Empty state
  if (pregnancies.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('timeline.title')}</h1>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <Baby className="h-16 w-16 opacity-30" />
          <p>{t('timeline.noActivePregnancy')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('timeline.title')}</h1>
      <PregnancyTimeline pregnancies={pregnancies} />
    </div>
  )
}
