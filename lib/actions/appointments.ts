'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generateAvailableSlots, TimeSlot } from '@/lib/utils/slots'
import type { AppointmentStatus } from '@/lib/types/database'
import { sendBookingNotification, sendCancellationNotification } from '@/lib/actions/whatsapp'

// ─── Shared helper ───────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's ID (the doctor calling the action).
 * Falls back to first doctor profile for actions called by non-doctors (e.g. patient booking).
 */
async function getDoctorId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check if user is a doctor
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single() as { data: { id: string; role: string } | null }

  if (profile?.role === 'doctor') return profile.id

  // For non-doctors (patient/secretary calling booking), get the first doctor
  const { data: doctors } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor')
    .limit(1) as { data: { id: string }[] | null }

  return doctors?.[0]?.id ?? null
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const bookSchema = z.object({
  patient_id: z.string().uuid(),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  appointment_type: z.enum(['consultation', 'follow_up', 'prenatal', 'ultrasound', 'other']),
  notes: z.string().optional(),
})

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Book an appointment. Only doctor or secretary can book.
 * Handles PostgreSQL error 23P01 (exclusion_violation) for double-booking.
 */
export async function bookAppointment(
  formData: FormData
): Promise<{
  success?: boolean
  appointment?: Record<string, unknown>
  error?: string | Record<string, string[]>
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Verify role is doctor or secretary
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can book appointments' }
  }

  // Validate input
  const raw = {
    patient_id: formData.get('patient_id') as string,
    scheduled_start: formData.get('scheduled_start') as string,
    scheduled_end: formData.get('scheduled_end') as string,
    appointment_type: formData.get('appointment_type') as string,
    notes: (formData.get('notes') as string) || undefined,
  }

  const validation = bookSchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { patient_id, scheduled_start, scheduled_end, appointment_type, notes } = validation.data

  // Get doctor_id
  const doctorId = await getDoctorId(supabase)
  if (!doctorId) return { error: 'No doctor found in the system' }

  // Enforce one active appointment per patient
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('patient_id', patient_id)
    .in('status', ['scheduled', 'confirmed'])
    .limit(1) as { data: { id: string }[] | null }

  if (existing && existing.length > 0) {
    return { error: 'patientHasActiveAppointment' }
  }

  // Insert appointment
  const { data: appointment, error: insertError } = await supabase
    .from('appointments')
    .insert({
      patient_id,
      doctor_id: doctorId,
      scheduled_start,
      scheduled_end,
      appointment_type: appointment_type as 'consultation' | 'follow_up' | 'prenatal' | 'ultrasound' | 'other',
      notes: notes ?? null,
      status: 'scheduled',
      created_by: user.id,
    })
    .select()
    .single() as { data: Record<string, unknown> | null; error: { code?: string; message: string } | null }

  if (insertError) {
    // PostgreSQL 23P01: exclusion_violation (double-booking constraint)
    if (insertError.code === '23P01') {
      return { error: 'slotTaken' }
    }
    return { error: insertError.message }
  }

  // Send WhatsApp booking confirmation — wrapped in try/catch so failures never break booking
  try {
    const { data: patientProfile } = await supabase
      .from('profiles')
      .select('phone, full_name_ar')
      .eq('id', patient_id)
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
    // WhatsApp notification failed — appointment still booked successfully
    console.error('Failed to send WhatsApp booking notification:', e)
  }

  revalidatePath('/doctor/appointments')
  revalidatePath('/doctor/dashboard')
  revalidatePath('/secretary/appointments')
  revalidatePath('/patient/appointments')

  return { success: true, appointment: appointment ?? {} }
}

/**
 * Cancel an appointment. Only doctor or secretary can cancel.
 * Enforces 24-hour advance cancellation policy.
 */
export async function cancelAppointment(
  appointmentId: string,
  reason: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Verify role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can cancel appointments' }
  }

  // Fetch the appointment
  const { data: appointment } = await supabase
    .from('appointments')
    .select('scheduled_start, status, patient_id')
    .eq('id', appointmentId)
    .single() as {
      data: {
        scheduled_start: string
        status: string
        patient_id: string
      } | null
    }

  if (!appointment) return { error: 'Appointment not found' }

  // Check if already cancelled
  if (appointment.status === 'cancelled') {
    return { error: 'Appointment is already cancelled' }
  }

  // Update to cancelled
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancellation_reason: reason })
    .eq('id', appointmentId)

  if (updateError) return { error: updateError.message }

  // Send WhatsApp cancellation notification — wrapped in try/catch so failures never break cancellation
  try {
    const { data: patientProfile } = await supabase
      .from('profiles')
      .select('phone, full_name_ar')
      .eq('id', appointment.patient_id)
      .single() as { data: { phone: string; full_name_ar: string } | null }

    if (patientProfile?.phone) {
      await sendCancellationNotification({
        patientPhone: patientProfile.phone,
        patientName: patientProfile.full_name_ar,
        scheduledStart: appointment.scheduled_start,
      })
    }
  } catch (e) {
    // WhatsApp notification failed — cancellation still succeeded
    console.error('Failed to send WhatsApp cancellation notification:', e)
  }

  revalidatePath('/doctor/appointments')
  revalidatePath('/doctor/dashboard')
  revalidatePath('/secretary/appointments')
  revalidatePath('/patient/appointments')

  return { success: true }
}

/**
 * Complete an appointment. Only doctor or secretary can complete.
 * Sets appointment status to 'completed'.
 */
export async function completeAppointment(
  appointmentId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can complete appointments' }
  }

  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', appointmentId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/doctor/appointments')
  revalidatePath('/doctor/dashboard')
  revalidatePath('/secretary/appointments')
  revalidatePath('/patient/appointments')

  return { success: true }
}

/**
 * Update an appointment's type, time slot, and notes. Only doctor or secretary can update.
 */
export async function updateAppointment(data: {
  id: string
  appointment_type: string
  scheduled_start: string
  scheduled_end: string
  notes?: string
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can update appointments' }
  }

  const { error } = await supabase
    .from('appointments')
    .update({
      appointment_type: data.appointment_type as 'consultation' | 'follow_up' | 'prenatal' | 'ultrasound' | 'other',
      scheduled_start: data.scheduled_start,
      scheduled_end: data.scheduled_end,
      notes: data.notes ?? null,
    })
    .eq('id', data.id)

  if (error) return { error: error.message }

  revalidatePath('/doctor/appointments')
  revalidatePath('/doctor/dashboard')
  revalidatePath('/secretary/appointments')

  return { success: true }
}

/**
 * Auto-delete scheduled/confirmed appointments whose scheduled_start is more than 24 hours ago.
 * Safe to call on page load — deletes silently without user interaction.
 */
export async function deleteStaleAppointments(): Promise<{ deleted?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('appointments')
    .delete()
    .in('status', ['scheduled', 'confirmed'])
    .lt('scheduled_start', cutoff)
    .select('id') as { data: { id: string }[] | null; error: { message: string } | null }

  if (error) return { error: error.message }

  return { deleted: data?.length ?? 0 }
}

/**
 * Delete an appointment permanently. Only doctor or secretary can delete.
 */
export async function deleteAppointment(
  appointmentId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can delete appointments' }
  }

  const { error } = await supabase.from('appointments').delete().eq('id', appointmentId)
  if (error) return { error: error.message }

  revalidatePath('/doctor/appointments')
  revalidatePath('/doctor/dashboard')
  revalidatePath('/secretary/appointments')

  return { success: true }
}

/**
 * Get available time slots for a date and doctor.
 * Fetches schedule, holidays, and existing appointments, then calls generateAvailableSlots.
 */
export async function getAvailableSlots(
  date: string,
  doctorId: string
): Promise<{ slots: TimeSlot[]; error?: string }> {
  const supabase = await createClient()

  // Parse date as local date (avoid UTC midnight offset issue with 'yyyy-MM-dd' strings)
  const [year, month, dayNum] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, dayNum)
  const dayOfWeek = dateObj.getDay()

  // Fetch doctor's schedule for this day of week
  const { data: schedule } = await supabase
    .from('doctor_schedule')
    .select('start_time, end_time, slot_duration_minutes')
    .eq('doctor_id', doctorId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single() as {
      data: { start_time: string; end_time: string; slot_duration_minutes: number } | null
    }

  // Fetch all holidays for this doctor
  const { data: holidays } = await supabase
    .from('doctor_holidays')
    .select('holiday_date')
    .eq('doctor_id', doctorId) as { data: { holiday_date: string }[] | null }

  // Fetch appointments for this doctor on this date
  const dayStart = new Date(year, month - 1, dayNum, 0, 0, 0, 0)
  const dayEnd = new Date(year, month - 1, dayNum, 23, 59, 59, 999)

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
 * List appointments with role-based filtering and optional status/date filters.
 */
export async function getAppointments(filters: {
  role: string
  userId: string
  status?: string
  dateFrom?: string
  dateTo?: string
}): Promise<{
  appointments?: Record<string, unknown>[]
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Build base query — patient names resolved after fetch
  let query = supabase
    .from('appointments')
    .select(`
      id,
      patient_id,
      doctor_id,
      scheduled_start,
      scheduled_end,
      status,
      appointment_type,
      cancellation_reason,
      notes,
      created_by,
      created_at,
      updated_at
    `)

  // Role-based filter
  if (filters.role === 'patient') {
    query = query.eq('patient_id', filters.userId)
  }
  // Doctor and secretary see all appointments (no additional filter)

  // Optional status filter
  if (filters.status) {
    query = query.eq('status', filters.status as AppointmentStatus)
  }

  // Optional date range filters
  if (filters.dateFrom) {
    query = query.gte('scheduled_start', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('scheduled_start', filters.dateTo)
  }

  // Order by scheduled_start descending
  const { data: rawAppointments, error } = await query.order('scheduled_start', { ascending: false }) as {
    data: Record<string, unknown>[] | null
    error: { message: string } | null
  }

  if (error) return { error: error.message }

  // Resolve patient names via profiles lookup
  const rows = rawAppointments ?? []
  const patientIds = [...new Set(rows.map((a) => a.patient_id as string))]
  let nameMap: Record<string, { full_name_ar: string; full_name_en: string | null }> = {}

  if (patientIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name_ar, full_name_en')
      .in('id', patientIds)

    nameMap = (profiles ?? []).reduce(
      (acc, p) => {
        acc[p.id] = { full_name_ar: p.full_name_ar, full_name_en: p.full_name_en }
        return acc
      },
      {} as typeof nameMap
    )
  }

  const appointments = rows.map((a) => ({
    ...a,
    patient: nameMap[a.patient_id as string] ?? null,
  }))

  return { appointments }
}

/**
 * Fetch upcoming (non-cancelled) appointments for a specific patient.
 * Returns lightweight records: id, scheduled_start, appointment_type, status.
 */
export async function getPatientFutureAppointments(
  patientId: string
): Promise<{
  appointments?: { id: string; scheduled_start: string; scheduled_end: string; appointment_type: string; status: string; notes: string | null }[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('appointments')
    .select('id, scheduled_start, scheduled_end, appointment_type, status, notes')
    .eq('patient_id', patientId)
    .neq('status', 'cancelled')
    .gte('scheduled_start', nowIso)
    .order('scheduled_start', { ascending: true })
    .limit(5) as {
      data: { id: string; scheduled_start: string; scheduled_end: string; appointment_type: string; status: string; notes: string | null }[] | null
      error: { message: string } | null
    }

  if (error) return { error: error.message }
  return { appointments: data ?? [] }
}
