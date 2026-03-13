'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ─── Schemas ────────────────────────────────────────────────────────────────

const upsertScheduleSchema = z
  .object({
    day_of_week: z.coerce
      .number()
      .int()
      .min(0, 'Day must be 0–6')
      .max(6, 'Day must be 0–6'),
    start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
    end_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'),
    slot_duration_minutes: z.coerce
      .number()
      .int()
      .min(10, 'Slot duration must be at least 10 minutes')
      .max(120, 'Slot duration must be at most 120 minutes')
      .default(30),
  })
  .refine((d) => d.start_time < d.end_time, {
    message: 'Start time must be before end time',
    path: ['end_time'],
  })

const addHolidaySchema = z.object({
  holiday_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  reason: z.string().optional(),
})

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function upsertScheduleDay(
  formData: FormData
): Promise<{ success?: boolean; error?: string | Record<string, string[]> }> {
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
    return { error: 'Only the doctor or secretary can manage the schedule' }
  }

  const raw = {
    day_of_week: formData.get('day_of_week'),
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
    slot_duration_minutes: formData.get('slot_duration_minutes'),
  }

  const validation = upsertScheduleSchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as Record<string, string[]> }
  }

  // Multi-doctor support: fetch all doctor IDs and apply schedule to all
  const { data: doctorProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor') as { data: { id: string }[] | null }

  if (!doctorProfiles || doctorProfiles.length === 0) return { error: 'No doctor found' }

  const rows = doctorProfiles.map((d) => ({
    doctor_id: d.id,
    day_of_week: validation.data.day_of_week,
    start_time: validation.data.start_time,
    end_time: validation.data.end_time,
    slot_duration_minutes: validation.data.slot_duration_minutes,
    is_active: true,
  }))

  const { error: upsertError } = await supabase.from('doctor_schedule').upsert(
    rows,
    { onConflict: 'doctor_id,day_of_week' }
  )

  if (upsertError) return { error: upsertError.message }

  revalidatePath('/doctor/schedule')
  revalidatePath('/secretary/schedule')
  return { success: true }
}

export async function deleteScheduleDay(
  dayId: string
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
    return { error: 'Only the doctor or secretary can manage the schedule' }
  }

  const { error: deleteError } = await supabase
    .from('doctor_schedule')
    .delete()
    .eq('id', dayId)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/doctor/schedule')
  revalidatePath('/secretary/schedule')
  return { success: true }
}

export async function addHoliday(
  formData: FormData
): Promise<{ success?: boolean; error?: string | Record<string, string[]> }> {
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
    return { error: 'Only the doctor or secretary can manage the schedule' }
  }

  const raw = {
    holiday_date: formData.get('holiday_date') as string,
    reason: (formData.get('reason') as string) || undefined,
  }

  const validation = addHolidaySchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as Record<string, string[]> }
  }

  // Multi-doctor support: apply holiday to all doctors
  const { data: doctorProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor') as { data: { id: string }[] | null }

  if (!doctorProfiles || doctorProfiles.length === 0) return { error: 'No doctor found' }

  const { error: insertError } = await supabase.from('doctor_holidays').insert(
    doctorProfiles.map((d) => ({
      doctor_id: d.id,
      holiday_date: validation.data.holiday_date,
      reason: validation.data.reason ?? null,
    }))
  )

  if (insertError) {
    // Unique constraint violation
    if (insertError.code === '23505') {
      return { error: 'Holiday already exists for this date' }
    }
    return { error: insertError.message }
  }

  revalidatePath('/doctor/schedule')
  return { success: true }
}

export async function deleteHoliday(
  holidayId: string
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
    return { error: 'Only the doctor or secretary can manage the schedule' }
  }

  const { error: deleteError } = await supabase
    .from('doctor_holidays')
    .delete()
    .eq('id', holidayId)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/doctor/schedule')
  revalidatePath('/secretary/schedule')
  return { success: true }
}
