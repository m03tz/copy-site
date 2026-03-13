'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface LabTest {
  id: string
  patient_id: string
  medical_record_id: string | null
  test_type: string
  test_name: string
  result: string | null
  reference_values: string | null
  doctor_notes: string | null
  test_date: string
  created_at: string
}

export interface AddLabTestInput {
  patient_id: string
  medical_record_id?: string | null
  test_type: string
  test_name: string
  result?: string
  reference_values?: string
  doctor_notes?: string
  test_date: string
}

export async function addLabTest(input: AddLabTestInput): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('lab_tests').insert({
    patient_id: input.patient_id,
    medical_record_id: input.medical_record_id ?? null,
    test_type: input.test_type,
    test_name: input.test_name,
    result: input.result ?? null,
    reference_values: input.reference_values ?? null,
    doctor_notes: input.doctor_notes ?? null,
    test_date: input.test_date,
    created_by: user?.id ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath('/doctor/patients/[id]', 'page')
  return { error: null }
}

export async function deleteLabTest(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase.from('lab_tests').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/doctor/patients/[id]', 'page')
  return { error: null }
}
