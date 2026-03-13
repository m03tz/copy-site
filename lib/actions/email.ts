import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── HTML Template Builders ───────────────────────────────────────────────────

/**
 * Build the Arabic RTL HTML email for appointment reminders.
 * Uses inline CSS only — email clients strip <style> blocks.
 */
export function buildReminderHtml(
  params: {
    patientName: string
    appointmentDate: string
    appointmentTime: string
    appointmentType: string
    clinicAddress: string
  },
  reminderType: '24h' | '2h'
): string {
  const { patientName, appointmentDate, appointmentTime, appointmentType, clinicAddress } = params

  const introText =
    reminderType === '24h'
      ? 'نذكرك بموعدك غداً:'
      : 'نذكرك بأن موعدك خلال ساعتين:'

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تذكير بموعدك</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a73e8;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">عيادة د. فادي نادي السحلة</h1>
              <p style="margin:6px 0 0;color:#d4e6ff;font-size:14px;">أخصائي نساء وتوليد وعقم وجراحة بالمنظار</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="height:4px;background-color:#e8f0fe;"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#1a73e8;font-size:20px;">تذكير بموعدك</h2>
              <p style="margin:0 0 8px;color:#333333;font-size:16px;">عزيزتي ${patientName}،</p>
              <p style="margin:0 0 20px;color:#555555;font-size:15px;">${introText}</p>
              <!-- Appointment Details Table -->
              <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;background-color:#f8f9fa;border-radius:6px;margin-bottom:24px;">
                <tr style="border-bottom:1px solid #e0e0e0;">
                  <td style="color:#888888;font-size:13px;font-weight:600;white-space:nowrap;">التاريخ</td>
                  <td style="color:#222222;font-size:15px;font-weight:500;">${appointmentDate}</td>
                </tr>
                <tr style="border-bottom:1px solid #e0e0e0;">
                  <td style="color:#888888;font-size:13px;font-weight:600;white-space:nowrap;">الوقت</td>
                  <td style="color:#222222;font-size:15px;font-weight:500;">${appointmentTime}</td>
                </tr>
                <tr>
                  <td style="color:#888888;font-size:13px;font-weight:600;white-space:nowrap;">نوع الزيارة</td>
                  <td style="color:#222222;font-size:15px;font-weight:500;">${appointmentType}</td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#555555;font-size:14px;">
                <strong>العنوان:</strong> ${clinicAddress}
              </p>
              <p style="margin:20px 0 0;color:#777777;font-size:13px;border-top:1px solid #eeeeee;padding-top:16px;">
                إذا كنت بحاجة إلى إلغاء أو تغيير موعدك، يرجى التواصل معنا في أقرب وقت ممكن.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="margin:0;color:#aaaaaa;font-size:12px;">عيادة د. فادي نادي السحلة &mdash; ${clinicAddress}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Build the Arabic RTL HTML email for appointment cancellation notifications.
 * Uses inline CSS only — email clients strip <style> blocks.
 */
export function buildCancellationHtml(params: {
  patientName: string
  appointmentDate: string
  appointmentTime: string
  clinicPhone: string
}): string {
  const { patientName, appointmentDate, appointmentTime, clinicPhone } = params

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>إلغاء موعد</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a73e8;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">عيادة د. فادي نادي السحلة</h1>
              <p style="margin:6px 0 0;color:#d4e6ff;font-size:14px;">أخصائي نساء وتوليد وعقم وجراحة بالمنظار</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="height:4px;background-color:#ffe4e4;"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#d32f2f;font-size:20px;">إلغاء موعد</h2>
              <p style="margin:0 0 20px;color:#333333;font-size:15px;">
                عزيزتي ${patientName}، نود إعلامك بأنه تم إلغاء موعدك:
              </p>
              <!-- Cancelled Appointment Details Table -->
              <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;background-color:#fff5f5;border-radius:6px;border:1px solid #ffcccc;margin-bottom:24px;">
                <tr style="border-bottom:1px solid #ffcccc;">
                  <td style="color:#888888;font-size:13px;font-weight:600;white-space:nowrap;">التاريخ</td>
                  <td style="color:#222222;font-size:15px;font-weight:500;">${appointmentDate}</td>
                </tr>
                <tr>
                  <td style="color:#888888;font-size:13px;font-weight:600;white-space:nowrap;">الوقت</td>
                  <td style="color:#222222;font-size:15px;font-weight:500;">${appointmentTime}</td>
                </tr>
              </table>
              <p style="margin:0;color:#555555;font-size:14px;border-top:1px solid #eeeeee;padding-top:16px;">
                للحجز مجدداً أو لأي استفسار، يرجى التواصل على: <strong>${clinicPhone}</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="margin:0;color:#aaaaaa;font-size:12px;">عيادة د. فادي نادي السحلة &mdash; جرش - الأردن</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Email Scheduling Functions ───────────────────────────────────────────────

/**
 * Schedule two reminder emails (24h and 2h before) via Resend scheduled_at API.
 * Returns the Resend email IDs so they can be stored for later cancellation.
 *
 * Guards:
 * - If appointment is >30 days away, skips all reminders (Resend scheduling limit)
 * - If reminder time is already in the past, skips that individual reminder
 */
export async function scheduleReminders(params: {
  appointmentId: string
  patientEmail: string
  patientName: string
  scheduledStart: string
  appointmentType: string
}): Promise<{ reminder24hId: string | null; reminder2hId: string | null }> {
  const { patientEmail, patientName, scheduledStart, appointmentType } = params

  const appointmentDate = new Date(scheduledStart)
  const now = new Date()

  // Guard: Resend has a ~30-day scheduling limit
  const daysUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (daysUntilAppointment > 30) {
    return { reminder24hId: null, reminder2hId: null }
  }

  // Calculate reminder send times
  const reminder24hTime = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000)
  const reminder2hTime = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000)

  // Format date and time for Arabic email content
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

  const clinicAddress = 'جرش - الأردن'

  const emailHtml24h = buildReminderHtml(
    {
      patientName,
      appointmentDate: formattedDate,
      appointmentTime: formattedTime,
      appointmentType,
      clinicAddress,
    },
    '24h'
  )

  const emailHtml2h = buildReminderHtml(
    {
      patientName,
      appointmentDate: formattedDate,
      appointmentTime: formattedTime,
      appointmentType,
      clinicAddress,
    },
    '2h'
  )

  // Build promises only for future reminder times
  const promises: Promise<{ data: { id: string } | null; error: unknown }>[] = []
  const slots: ('24h' | '2h')[] = []

  if (reminder24hTime > now) {
    promises.push(
      resend.emails.send({
        // TODO: Replace with clinic domain after Resend domain verification
        from: 'عيادة د. فادي <onboarding@resend.dev>',
        to: patientEmail,
        subject: 'تذكير: موعدك غداً في عيادة د. فادي',
        html: emailHtml24h,
        scheduledAt: reminder24hTime.toISOString(),
      }) as Promise<{ data: { id: string } | null; error: unknown }>
    )
    slots.push('24h')
  }

  if (reminder2hTime > now) {
    promises.push(
      resend.emails.send({
        // TODO: Replace with clinic domain after Resend domain verification
        from: 'عيادة د. فادي <onboarding@resend.dev>',
        to: patientEmail,
        subject: 'تذكير: موعدك خلال ساعتين في عيادة د. فادي',
        html: emailHtml2h,
        scheduledAt: reminder2hTime.toISOString(),
      }) as Promise<{ data: { id: string } | null; error: unknown }>
    )
    slots.push('2h')
  }

  if (promises.length === 0) {
    return { reminder24hId: null, reminder2hId: null }
  }

  const results = await Promise.allSettled(promises)

  let reminder24hId: string | null = null
  let reminder2hId: string | null = null

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.data?.id) {
      const id = result.value.data.id
      if (slots[index] === '24h') {
        reminder24hId = id
      } else {
        reminder2hId = id
      }
    }
  })

  return { reminder24hId, reminder2hId }
}

/**
 * Cancel any scheduled reminder emails via Resend cancel API.
 * Uses Promise.allSettled — silently ignores failures
 * (email may have already been sent before cancellation).
 */
export async function cancelReminders(
  reminder24hId: string | null,
  reminder2hId: string | null
): Promise<void> {
  const cancellationPromises: Promise<unknown>[] = []

  if (reminder24hId) {
    cancellationPromises.push(resend.emails.cancel(reminder24hId))
  }
  if (reminder2hId) {
    cancellationPromises.push(resend.emails.cancel(reminder2hId))
  }

  if (cancellationPromises.length > 0) {
    await Promise.allSettled(cancellationPromises)
  }
}

/**
 * Send an immediate cancellation notification email to the patient.
 * Wrapped in try/catch — email failure must NOT break the cancellation flow.
 */
export async function sendCancellationEmail(params: {
  patientEmail: string
  patientName: string
  scheduledStart: string
}): Promise<void> {
  const { patientEmail, patientName, scheduledStart } = params

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

    // TODO: Replace with actual clinic phone
    const clinicPhone = '07XXXXXXXX'

    await resend.emails.send({
      // TODO: Replace with clinic domain after Resend domain verification
      from: 'عيادة د. فادي <onboarding@resend.dev>',
      to: patientEmail,
      subject: 'إلغاء موعد - عيادة د. فادي',
      html: buildCancellationHtml({
        patientName,
        appointmentDate: formattedDate,
        appointmentTime: formattedTime,
        clinicPhone,
      }),
      // No scheduled_at — send immediately
    })
  } catch (e) {
    // Email failure must not break the cancellation flow
    console.error('Failed to send cancellation email:', e)
  }
}
