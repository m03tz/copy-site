// ─── WhatsApp Cloud API Integration ──────────────────────────────────────────
// Uses Meta's WhatsApp Business Cloud API for sending appointment notifications.
// Requires: WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables.
//
// Setup:
// 1. Create a Meta Business account at business.facebook.com
// 2. Create a WhatsApp Business app at developers.facebook.com
// 3. Get your Phone Number ID and generate a permanent access token
// 4. Add the env variables to .env.local

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0'
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

// ─── Message Builders ────────────────────────────────────────────────────────

/**
 * Build Arabic reminder message for WhatsApp.
 */
export function buildReminderMessage(
  params: {
    patientName: string
    appointmentDate: string
    appointmentTime: string
    appointmentType: string
  },
  reminderType: '24h' | '2h'
): string {
  const { patientName, appointmentDate, appointmentTime, appointmentType } = params

  const introText =
    reminderType === '24h'
      ? 'نذكرك بموعدك غداً'
      : 'نذكرك بأن موعدك خلال ساعتين'

  return `🏥 *عيادة د. فادي نادي السحلة*
أخصائي نساء وتوليد وعقم وجراحة بالمنظار

مرحباً ${patientName}،
${introText} 📅

📋 *تفاصيل الموعد:*
• التاريخ: ${appointmentDate}
• الوقت: ${appointmentTime}
• نوع الزيارة: ${appointmentType}
• العنوان: جرش - الأردن

إذا كنت بحاجة إلى إلغاء أو تغيير موعدك، يرجى التواصل معنا.

هاتف العيادة: +962786637847`
}

/**
 * Build Arabic cancellation message for WhatsApp.
 */
export function buildCancellationMessage(params: {
  patientName: string
  appointmentDate: string
  appointmentTime: string
}): string {
  const { patientName, appointmentDate, appointmentTime } = params

  return `🏥 *عيادة د. فادي نادي السحلة*

مرحباً ${patientName}،
نود إعلامك بأنه تم *إلغاء* موعدك ❌

📋 *تفاصيل الموعد الملغي:*
• التاريخ: ${appointmentDate}
• الوقت: ${appointmentTime}

للحجز مجدداً أو لأي استفسار، يرجى التواصل على:
📞 +962786637847`
}

/**
 * Build booking confirmation message for WhatsApp.
 */
export function buildBookingConfirmationMessage(params: {
  patientName: string
  appointmentDate: string
  appointmentTime: string
  appointmentType: string
}): string {
  const { patientName, appointmentDate, appointmentTime, appointmentType } = params

  return `🏥 *عيادة د. فادي نادي السحلة*

مرحباً ${patientName}،
تم حجز موعدك بنجاح ✅

📋 *تفاصيل الموعد:*
• التاريخ: ${appointmentDate}
• الوقت: ${appointmentTime}
• نوع الزيارة: ${appointmentType}
• العنوان: جرش - الأردن

سنرسل لك تذكيراً قبل الموعد.

هاتف العيادة: +962786637847`
}

// ─── WhatsApp API Functions ──────────────────────────────────────────────────

/**
 * Send a WhatsApp text message via the Cloud API.
 * Silently fails if environment variables are not set.
 */
async function sendWhatsAppMessage(
  recipientPhone: string,
  message: string
): Promise<{ messageId: string | null }> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('WhatsApp credentials not configured — skipping message')
    return { messageId: null }
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone.replace('+', ''),
          type: 'text',
          text: { body: message },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('WhatsApp API error:', errorData)
      return { messageId: null }
    }

    const data = await response.json()
    const messageId = data?.messages?.[0]?.id ?? null
    return { messageId }
  } catch (e) {
    console.error('Failed to send WhatsApp message:', e)
    return { messageId: null }
  }
}

// ─── Public Functions (used by appointment actions) ──────────────────────────

/**
 * Send booking confirmation and schedule reminders.
 * Replaces the old email scheduleReminders function.
 *
 * Note: WhatsApp Cloud API doesn't support scheduled messages natively.
 * The confirmation is sent immediately. For reminders (24h/2h before),
 * you would need a cron job or scheduled task to trigger them.
 * For now, we send an immediate confirmation on booking.
 */
export async function sendBookingNotification(params: {
  patientPhone: string
  patientName: string
  scheduledStart: string
  appointmentType: string
}): Promise<{ messageId: string | null }> {
  const { patientPhone, patientName, scheduledStart, appointmentType } = params

  const appointmentDate = new Date(scheduledStart)

  const formattedDate = appointmentDate.toLocaleDateString('ar-JO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = appointmentDate.toLocaleTimeString('ar-JO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const message = buildBookingConfirmationMessage({
    patientName,
    appointmentDate: formattedDate,
    appointmentTime: formattedTime,
    appointmentType,
  })

  return sendWhatsAppMessage(patientPhone, message)
}

/**
 * Send cancellation notification via WhatsApp.
 * Replaces the old sendCancellationEmail function.
 */
export async function sendCancellationNotification(params: {
  patientPhone: string
  patientName: string
  scheduledStart: string
}): Promise<void> {
  const { patientPhone, patientName, scheduledStart } = params

  try {
    const appointmentDate = new Date(scheduledStart)

    const formattedDate = appointmentDate.toLocaleDateString('ar-JO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const formattedTime = appointmentDate.toLocaleTimeString('ar-JO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const message = buildCancellationMessage({
      patientName,
      appointmentDate: formattedDate,
      appointmentTime: formattedTime,
    })

    await sendWhatsAppMessage(patientPhone, message)
  } catch (e) {
    console.error('Failed to send WhatsApp cancellation notification:', e)
  }
}

/**
 * Send a reminder message via WhatsApp.
 * This should be called by a cron job / scheduled task.
 */
export async function sendReminderNotification(params: {
  patientPhone: string
  patientName: string
  scheduledStart: string
  appointmentType: string
  reminderType: '24h' | '2h'
}): Promise<void> {
  const { patientPhone, patientName, scheduledStart, appointmentType, reminderType } = params

  try {
    const appointmentDate = new Date(scheduledStart)

    const formattedDate = appointmentDate.toLocaleDateString('ar-JO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const formattedTime = appointmentDate.toLocaleTimeString('ar-JO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const message = buildReminderMessage(
      {
        patientName,
        appointmentDate: formattedDate,
        appointmentTime: formattedTime,
        appointmentType,
      },
      reminderType
    )

    await sendWhatsAppMessage(patientPhone, message)
  } catch (e) {
    console.error('Failed to send WhatsApp reminder:', e)
  }
}
