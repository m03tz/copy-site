import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * DELETE /api/cron/cleanup-appointments
 * Runs at 12:00 AM every day.
 * Deletes all appointments from the previous day that are NOT completed.
 * Protected by CRON_SECRET header.
 */
export async function POST(request: Request) {
  // Verify secret token
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Calculate yesterday's date range (start and end of previous day)
  const now = new Date()
  const yesterdayStart = new Date(now)
  yesterdayStart.setDate(now.getDate() - 1)
  yesterdayStart.setHours(0, 0, 0, 0)

  const yesterdayEnd = new Date(now)
  yesterdayEnd.setDate(now.getDate() - 1)
  yesterdayEnd.setHours(23, 59, 59, 999)

  const { data, error } = await admin
    .from('appointments')
    .delete()
    .neq('status', 'completed')
    .gte('scheduled_start', yesterdayStart.toISOString())
    .lte('scheduled_start', yesterdayEnd.toISOString())
    .select('id')

  if (error) {
    console.error('[cron] cleanup-appointments error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[cron] cleanup-appointments: deleted ${count} incomplete appointments from ${yesterdayStart.toDateString()}`)

  return NextResponse.json({ success: true, deleted: count })
}
