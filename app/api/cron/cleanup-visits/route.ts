import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/cron/cleanup-visits
 * Runs at 12:00 AM Amman time (21:00 UTC) every day.
 * Soft-deletes all ended visits from the previous day (Amman time, UTC+3).
 * Protected by CRON_SECRET header.
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Amman is UTC+3 — compute previous day boundaries in Amman time
  const nowUtc = new Date()
  const nowAmman = new Date(nowUtc.getTime() + 3 * 60 * 60 * 1000)

  // Yesterday in Amman time
  const yesterdayAmman = new Date(nowAmman)
  yesterdayAmman.setUTCDate(nowAmman.getUTCDate() - 1)

  const yearStr = yesterdayAmman.getUTCFullYear()
  const monthStr = String(yesterdayAmman.getUTCMonth() + 1).padStart(2, '0')
  const dayStr = String(yesterdayAmman.getUTCDate()).padStart(2, '0')
  const yesterdayDate = `${yearStr}-${monthStr}-${dayStr}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('medical_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('is_ended', true)
    .eq('visit_date', yesterdayDate)
    .is('deleted_at', null)
    .select('id')

  if (error) {
    console.error('[cron] cleanup-visits error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[cron] cleanup-visits: soft-deleted ${count} ended visits from ${yesterdayDate} (Amman)`)

  return NextResponse.json({ success: true, deleted: count, date: yesterdayDate })
}
