'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ─── Shared helper ───────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's ID (the doctor calling the action).
 */
async function getDoctorId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createVisitSchema = z.object({
  patient_id: z.string().uuid(),
  appointment_id: z.string().uuid().optional(),
  visit_date: z.string().min(1, 'Visit date is required'),
  chief_complaint: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment_plan: z.string().optional(),
  vital_signs_blood_pressure: z.string().optional(),
  vital_signs_weight: z.string().optional(),
  vital_signs_temperature: z.string().optional(),
  vital_signs_pulse: z.string().optional(),
  notes: z.string().optional(),
})

const updateVisitSchema = z.object({
  record_id: z.string().uuid(),
  visit_date: z.string().min(1, 'Visit date is required'),
  chief_complaint: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment_plan: z.string().optional(),
  vital_signs_blood_pressure: z.string().optional(),
  vital_signs_weight: z.string().optional(),
  vital_signs_temperature: z.string().optional(),
  vital_signs_pulse: z.string().optional(),
  notes: z.string().optional(),
})

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Create a visit record for a patient.
 * Only doctor or secretary can create visit records.
 * Supports walk-ins (appointment_id is optional).
 * Stores notes only — no chief_complaint, diagnosis, treatment_plan, or vital_signs.
 */
export async function createVisitRecord(
  formData: FormData
): Promise<{ success?: boolean; record?: Record<string, unknown>; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Role check: only doctor or secretary can create visit records
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can create visit records' }
  }

  // Extract and validate input
  const raw = {
    patient_id: formData.get('patient_id') as string,
    appointment_id: (formData.get('appointment_id') as string) || undefined,
    visit_date: formData.get('visit_date') as string,
    chief_complaint: (formData.get('chief_complaint') as string) || undefined,
    diagnosis: (formData.get('diagnosis') as string) || undefined,
    treatment_plan: (formData.get('treatment_plan') as string) || undefined,
    vital_signs_blood_pressure: (formData.get('vital_signs_blood_pressure') as string) || undefined,
    vital_signs_weight: (formData.get('vital_signs_weight') as string) || undefined,
    vital_signs_temperature: (formData.get('vital_signs_temperature') as string) || undefined,
    vital_signs_pulse: (formData.get('vital_signs_pulse') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  }

  const validation = createVisitSchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as unknown as string }
  }

  const {
    patient_id, appointment_id, visit_date,
    chief_complaint, diagnosis, treatment_plan,
    vital_signs_blood_pressure, vital_signs_weight,
    vital_signs_temperature, vital_signs_pulse,
    notes,
  } = validation.data

  // Build vital_signs JSON if any vital sign field is provided
  const vitalSigns: Record<string, string> = {}
  if (vital_signs_blood_pressure) vitalSigns.blood_pressure = vital_signs_blood_pressure
  if (vital_signs_weight) vitalSigns.weight = vital_signs_weight
  if (vital_signs_temperature) vitalSigns.temperature = vital_signs_temperature
  if (vital_signs_pulse) vitalSigns.pulse = vital_signs_pulse
  const hasVitalSigns = Object.keys(vitalSigns).length > 0

  // Get doctor_id
  const doctorId = await getDoctorId(supabase)
  if (!doctorId) return { error: 'No doctor found in the system' }

  // Insert visit record with all clinical fields
  const { data: record, error: insertError } = await supabase
    .from('medical_records')
    .insert({
      patient_id,
      appointment_id: appointment_id ?? null,
      doctor_id: doctorId,
      visit_date,
      chief_complaint: chief_complaint ?? null,
      diagnosis: diagnosis ?? null,
      treatment_plan: treatment_plan ?? null,
      vital_signs: hasVitalSigns ? vitalSigns : null,
      notes: notes ?? null,
    })
    .select()
    .single() as { data: Record<string, unknown> | null; error: { message: string } | null }

  if (insertError) return { error: insertError.message }

  revalidatePath('/doctor/patients')
  revalidatePath('/secretary/patients')
  revalidatePath(`/doctor/patients/${patient_id}`)
  revalidatePath(`/secretary/patients/${patient_id}`)
  revalidatePath('/doctor/medical-records')
  revalidatePath('/doctor/prescriptions')

  return { success: true, record: record ?? {} }
}

/**
 * Update an existing visit record's notes and/or date.
 * Only doctor or secretary can update visit records.
 * Visit records are always editable (no time lock).
 */
export async function updateVisitRecord(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Role check: only doctor or secretary can update visit records
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can update visit records' }
  }

  // Extract and validate input
  const raw = {
    record_id: formData.get('record_id') as string,
    visit_date: formData.get('visit_date') as string,
    chief_complaint: (formData.get('chief_complaint') as string) || undefined,
    diagnosis: (formData.get('diagnosis') as string) || undefined,
    treatment_plan: (formData.get('treatment_plan') as string) || undefined,
    vital_signs_blood_pressure: (formData.get('vital_signs_blood_pressure') as string) || undefined,
    vital_signs_weight: (formData.get('vital_signs_weight') as string) || undefined,
    vital_signs_temperature: (formData.get('vital_signs_temperature') as string) || undefined,
    vital_signs_pulse: (formData.get('vital_signs_pulse') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  }

  const validation = updateVisitSchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as unknown as string }
  }

  const {
    record_id, visit_date,
    chief_complaint, diagnosis, treatment_plan,
    vital_signs_blood_pressure, vital_signs_weight,
    vital_signs_temperature, vital_signs_pulse,
    notes,
  } = validation.data

  // Build vital_signs JSON if any vital sign field is provided
  const vitalSigns: Record<string, string> = {}
  if (vital_signs_blood_pressure) vitalSigns.blood_pressure = vital_signs_blood_pressure
  if (vital_signs_weight) vitalSigns.weight = vital_signs_weight
  if (vital_signs_temperature) vitalSigns.temperature = vital_signs_temperature
  if (vital_signs_pulse) vitalSigns.pulse = vital_signs_pulse
  const hasVitalSigns = Object.keys(vitalSigns).length > 0

  // Update the visit record
  const { error: updateError } = await supabase
    .from('medical_records')
    .update({
      visit_date,
      chief_complaint: chief_complaint ?? null,
      diagnosis: diagnosis ?? null,
      treatment_plan: treatment_plan ?? null,
      vital_signs: hasVitalSigns ? vitalSigns : null,
      notes: notes ?? null,
    })
    .eq('id', record_id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/doctor/patients')
  revalidatePath('/secretary/patients')
  revalidatePath('/doctor/medical-records')
  revalidatePath('/doctor/prescriptions')

  return { success: true }
}

/**
 * Mark a visit record as ended and store its fee.
 * Only doctor or secretary can end visits.
 */
export async function endVisitRecord(
  recordId: string,
  patientId: string,
  fee: number,
  visitType?: string
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
    return { error: 'Only doctor or secretary can end visits' }
  }

  const { error: updateError } = await supabase
    .from('medical_records')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ is_ended: true, visit_fee: fee, ended_at: new Date().toISOString(), ...(visitType ? { visit_type: visitType } : {}) } as any)
    .eq('id', recordId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/doctor/patients/${patientId}`)
  revalidatePath(`/secretary/patients/${patientId}`)
  revalidatePath('/doctor/medical-records')

  return { success: true }
}

/**
 * Update the fee of an already-ended visit record.
 * Only doctor or secretary can update visit fees.
 */
export async function updateVisitFee(
  recordId: string,
  patientId: string,
  fee: number
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
    return { error: 'Unauthorized' }
  }

  const { error: updateError } = await supabase
    .from('medical_records')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ visit_fee: fee } as any)
    .eq('id', recordId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/doctor/patients/${patientId}`)
  revalidatePath(`/secretary/patients/${patientId}`)
  revalidatePath('/doctor/medical-records')

  return { success: true }
}

/**
 * Delete a visit record permanently.
 * Only doctor or secretary can delete visit records.
 */
export async function deleteVisitRecord(
  recordId: string,
  patientId: string
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
    return { error: 'Only doctor or secretary can delete visit records' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from('medical_records')
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq('id', recordId)

  if (error) return { error: error.message }

  revalidatePath(`/doctor/patients/${patientId}`)
  revalidatePath(`/secretary/patients/${patientId}`)
  revalidatePath('/doctor/medical-records')

  return { success: true }
}
