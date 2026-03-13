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

// ─── Schema ───────────────────────────────────────────────────────────────────

const medicationSchema = z.object({
  medication_name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  duration: z.string().min(1, 'Duration is required'),
  quantity: z.string().optional(),
  instructions: z.string().optional(),
})

const createPrescriptionSchema = z.object({
  medical_record_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  medications: z.array(medicationSchema).min(1, 'At least one medication is required'),
})

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Create a prescription with multiple medications linked to a visit record.
 * Only doctor can create prescriptions.
 *
 * CRITICAL: Each medication becomes a separate row in the prescriptions table,
 * all sharing the same medical_record_id. A prescription with 3 medications
 * inserts 3 rows.
 */
export async function createPrescription(data: {
  medical_record_id: string
  patient_id: string
  medications: Array<{
    medication_name: string
    dosage: string
    duration: string
    quantity?: string
    instructions?: string
  }>
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Role check: only doctor can create prescriptions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctor can create prescriptions' }
  }

  // Validate input
  const validation = createPrescriptionSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as unknown as string }
  }

  const { medical_record_id, patient_id, medications } = validation.data

  // Get doctor_id
  const doctorId = await getDoctorId(supabase)
  if (!doctorId) return { error: 'No doctor found in the system' }

  // Insert one row per medication — all share the same medical_record_id
  const rows = medications.map((med) => ({
    medical_record_id,
    patient_id,
    doctor_id: doctorId,
    medication_name: med.medication_name,
    dosage: med.dosage,
    duration: med.duration,
    quantity: med.quantity ?? null,
    instructions: med.instructions ?? null,
  }))

  const { error: insertError } = await supabase
    .from('prescriptions')
    .insert(rows) as { error: { message: string } | null }

  if (insertError) return { error: insertError.message }

  revalidatePath('/doctor/patients')
  revalidatePath(`/doctor/patients/${patient_id}`)

  return { success: true }
}

/**
 * Add medications without creating a visible visit.
 * Creates a medication_only medical_record with today's date,
 * then adds the prescriptions linked to it.
 */
export async function addStandaloneMedications(data: {
  patient_id: string
  medications: Array<{
    medication_name: string
    dosage: string
    duration: string
    quantity?: string
    instructions?: string
  }>
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctor can add medications' }
  }

  if (!data.medications.length) return { error: 'No medications provided' }

  const today = new Date().toISOString().split('T')[0]

  // Create medication-only record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: record, error: recordError } = await (supabase as any)
    .from('medical_records')
    .insert({
      patient_id: data.patient_id,
      doctor_id: user.id,
      visit_date: today,
      medication_only: true,
      chief_complaint: null,
      diagnosis: null,
      treatment_plan: null,
      notes: null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (recordError || !record) return { error: recordError?.message ?? 'Failed to create record' }

  const rows = data.medications.map((med) => ({
    medical_record_id: record.id,
    patient_id: data.patient_id,
    doctor_id: user.id,
    medication_name: med.medication_name,
    dosage: med.dosage,
    duration: med.duration,
    quantity: med.quantity ?? null,
    instructions: med.instructions ?? null,
  }))

  const { error: insertError } = await supabase
    .from('prescriptions')
    .insert(rows) as { error: { message: string } | null }

  if (insertError) return { error: insertError.message }

  revalidatePath(`/doctor/patients/${data.patient_id}`)
  return { success: true }
}

/**
 * Update a single prescription (medication row) by its ID.
 * Only doctor can update prescriptions.
 */
export async function updatePrescription(data: {
  id: string
  medication_name: string
  dosage: string
  duration: string
  quantity?: string
  instructions?: string
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctor can update prescriptions' }
  }

  const { error } = await supabase
    .from('prescriptions')
    .update({
      medication_name: data.medication_name,
      dosage: data.dosage,
      duration: data.duration,
      quantity: data.quantity ?? null,
      instructions: data.instructions ?? null,
    })
    .eq('id', data.id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/doctor/patients/[id]', 'page')
  return { success: true }
}

/**
 * Delete a single prescription (medication row) by its ID.
 * Only doctor can delete prescriptions.
 */
export async function deletePrescription(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctor can delete prescriptions' }
  }

  const { error } = await supabase
    .from('prescriptions')
    .delete()
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/doctor/patients/[id]', 'page')
  return { error: null }
}
