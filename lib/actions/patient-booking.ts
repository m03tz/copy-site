'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generateAvailableSlots, TimeSlot } from '@/lib/utils/slots'
import { sendBookingNotification } from '@/lib/actions/whatsapp'

const bookSchema = z.object({
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  appointment_type: z.enum(['consultation', 'follow_up', 'prenatal', 'ultrasound', 'other']),
  notes: z.string().optional(),
})

/**
 * Get available slots for a given date — accessible by patients too.
 */
export async function getAvailableSlotsForPatient(
  date: string
): Promise<{ slots: TimeSlot[]; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { slots: [], error: 'Unauthorized' }

  // Find the doctor
  const { data: doctors } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor')
    .limit(1)

  const doctor = doctors?.[0] ?? null

  if (!doctor) return { slots: [], error: 'No doctor found' }

  const doctorId = doctor.id
  const [yr, mo, dy] = date.split('-').map(Number)
  const dateObj = new Date(yr, mo - 1, dy)
  const dayOfWeek = dateObj.getDay()

  const { data: schedule } = await supabase
    .from('doctor_schedule')
    .select('start_time, end_time, slot_duration_minutes')
    .eq('doctor_id', doctorId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single() as {
      data: { start_time: string; end_time: string; slot_duration_minutes: number } | null
    }

  const { data: holidays } = await supabase
    .from('doctor_holidays')
    .select('holiday_date')
    .eq('doctor_id', doctorId) as { data: { holiday_date: string }[] | null }

  const dayStart = new Date(yr, mo - 1, dy, 0, 0, 0, 0)
  const dayEnd = new Date(yr, mo - 1, dy, 23, 59, 59, 999)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('scheduled_start, scheduled_end, status')
    .eq('doctor_id', doctorId)
    .gte('scheduled_start', dayStart.toISOString())
    .lte('scheduled_start', dayEnd.toISOString()) as {
      data: { scheduled_start: string; scheduled_end: string; status: string }[] | null
    }

  const slots = generateAvailableSlots(
    dateObj,
    schedule ?? null,
    appointments ?? [],
    holidays ?? []
  )

  return { slots }
}

/**
 * Book an appointment as a patient.
 * Enforces: max 1 appointment per day per patient.
 */
export async function bookAppointmentAsPatient(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify patient role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'patient') {
    return { error: 'Only patients can use this action' }
  }

  const raw = {
    scheduled_start: formData.get('scheduled_start') as string,
    scheduled_end: formData.get('scheduled_end') as string,
    appointment_type: formData.get('appointment_type') as string,
    notes: (formData.get('notes') as string) || undefined,
  }

  const validation = bookSchema.safeParse(raw)
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors
    const firstError = Object.values(errors).flat()[0]
    return { error: firstError || 'بيانات غير صحيحة' }
  }

  const { scheduled_start, scheduled_end, appointment_type, notes } = validation.data

  // Check: only 1 appointment per day
  const dayStart = scheduled_start.slice(0, 10) + 'T00:00:00.000Z'
  const dayEnd = scheduled_start.slice(0, 10) + 'T23:59:59.999Z'

  const { data: existingToday } = await supabase
    .from('appointments')
    .select('id')
    .eq('patient_id', user.id)
    .gte('scheduled_start', dayStart)
    .lte('scheduled_start', dayEnd)
    .in('status', ['scheduled', 'confirmed'])
    .limit(1)

  if (existingToday && existingToday.length > 0) {
    return { error: 'لا يمكنك حجز أكثر من موعد واحد في نفس اليوم' }
  }

  // Find the doctor
  const { data: doctors2 } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor')
    .limit(1)

  const doctor = doctors2?.[0] ?? null

  if (!doctor) return { error: 'لا يوجد طبيب في النظام' }

  const { error: insertError } = await supabase
    .from('appointments')
    .insert({
      patient_id: user.id,
      doctor_id: doctor.id,
      scheduled_start,
      scheduled_end,
      appointment_type: appointment_type as 'consultation' | 'follow_up' | 'prenatal' | 'ultrasound' | 'other',
      notes: notes ?? null,
      status: 'scheduled',
      created_by: user.id,
    })

  if (insertError) {
    if (insertError.code === '23P01') {
      return { error: 'هذا الوقت محجوز بالفعل، يرجى اختيار وقت آخر' }
    }
    return { error: insertError.message }
  }

  // Send WhatsApp booking confirmation using Arabic name
  try {
    const { data: patientProfile } = await supabase
      .from('profiles')
      .select('phone, full_name_ar')
      .eq('id', user.id)
      .single() as { data: { phone: string; full_name_ar: string } | null }

    if (patientProfile?.phone) {
      await sendBookingNotification({
        patientPhone: patientProfile.phone,
        patientName: patientProfile.full_name_ar,
        scheduledStart: scheduled_start,
        appointmentType: appointment_type,
      })
    }
  } catch (e) {
    console.error('Failed to send WhatsApp booking notification:', e)
  }

  revalidatePath('/patient/dashboard')
  revalidatePath('/patient/appointments')

  return { success: true }
}
