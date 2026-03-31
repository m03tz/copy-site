// ─── Daily WhatsApp Appointment Reminders ─────────────────────────────────────
// Supabase Edge Function — triggered every day at 8:00 AM Amman time (05:00 UTC)
// via pg_cron (see migration 00018_schedule_daily_reminders.sql).
//
// What it does:
//   1. Finds all appointments scheduled for TODAY (Jordan timezone, UTC+3)
//      that are still pending a WhatsApp reminder.
//   2. Sends each patient a WhatsApp message with their appointment details.
//   3. Marks the appointment as reminded so duplicates are never sent.
//
// Required env vars in Supabase Dashboard → Settings → Edge Functions:
//   WHATSAPP_TOKEN            — Meta Cloud API access token
//   WHATSAPP_PHONE_NUMBER_ID  — Meta Cloud API phone number ID
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0'

// ─── Arabic appointment type labels ──────────────────────────────────────────
const APPOINTMENT_TYPE_AR: Record<string, string> = {
  consultation: 'استشارة',
  follow_up:    'متابعة',
  prenatal:     'متابعة حمل',
  ultrasound:   'سونار',
  other:        'زيارة عامة',
}

// ─── Build the reminder message ───────────────────────────────────────────────
function buildSameDayReminder(params: {
  patientName: string
  appointmentTime: string
  appointmentType: string
}): string {
  const { patientName, appointmentTime, appointmentType } = params
  const typeAr = APPOINTMENT_TYPE_AR[appointmentType] ?? 'زيارة'

  return `🏥 *عيادة د. فادي السحلة*
أخصائي نساء وتوليد وعقم وجراحة بالمنظار

مرحباً ${patientName}،
نذكّركِ بموعدكِ *اليوم* 📅

📋 *تفاصيل الموعد:*
• العنوان: جرش - الأردن

 إذا كنتِ بحاجة للإلغاء أو التغيير، يرجى التواصل معنا.

📞 هاتف العيادة: +962786637847`
}

// ─── Send WhatsApp message ────────────────────────────────────────────────────
async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const token   = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

  if (!token || !phoneId) {
    console.warn('WhatsApp credentials not set — skipping')
    return false
  }

  const res = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type:    'individual',
      to:                phone.replace(/\+/g, ''),
      type:              'text',
      text:              { body: message },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`WhatsApp send failed for ${phone}:`, err)
    return false
  }
  return true
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Jordan timezone is UTC+3. Build today's date range in UTC.
  const nowUtc     = new Date()
  const JORDAN_OFFSET_MS = 3 * 60 * 60 * 1000
  const nowJordan  = new Date(nowUtc.getTime() + JORDAN_OFFSET_MS)
  const todayStr   = nowJordan.toISOString().split('T')[0] // YYYY-MM-DD (Jordan date)

  const dayStart = new Date(`${todayStr}T00:00:00+03:00`).toISOString()
  const dayEnd   = new Date(`${todayStr}T23:59:59+03:00`).toISOString()

  console.log(`Running daily reminders for Jordan date: ${todayStr}`)
  console.log(`UTC range: ${dayStart} → ${dayEnd}`)

  // Fetch today's appointments that haven't been reminded yet
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_start,
      appointment_type,
      profiles!patient_id (
        full_name_ar,
        phone
      )
    `)
    .gte('scheduled_start', dayStart)
    .lte('scheduled_start', dayEnd)
    .in('status', ['scheduled', 'confirmed'])
    .is('whatsapp_reminder_sent_at', null)

  if (error) {
    console.error('Failed to fetch appointments:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!appointments || appointments.length === 0) {
    console.log('No appointments to remind today.')
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
  }

  console.log(`Found ${appointments.length} appointment(s) to remind.`)

  let sent = 0
  let failed = 0

  for (const appt of appointments) {
    const profile = Array.isArray(appt.profiles) ? appt.profiles[0] : appt.profiles
    const phone = profile?.phone
    const name  = profile?.full_name_ar ?? 'مريضة عزيزة'

    if (!phone) {
      console.warn(`Appointment ${appt.id}: no phone number, skipping.`)
      failed++
      continue
    }

    // Format time in Arabic (Jordan locale)
    const apptDate = new Date(appt.scheduled_start)
    const timeStr  = apptDate.toLocaleTimeString('ar-JO', {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Amman',
    })

    const message = buildSameDayReminder({
      patientName:     name,
      appointmentTime: timeStr,
      appointmentType: appt.appointment_type,
    })

    const ok = await sendWhatsApp(phone, message)

    if (ok) {
      // Mark as reminded
      await supabase
        .from('appointments')
        .update({ whatsapp_reminder_sent_at: new Date().toISOString() })
        .eq('id', appt.id)
      sent++
    } else {
      failed++
    }
  }

  console.log(`Done — sent: ${sent}, failed: ${failed}`)
  return new Response(JSON.stringify({ sent, failed }), { status: 200 })
})
