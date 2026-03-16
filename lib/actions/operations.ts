'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface Operation {
  id: string
  patient_id: string
  operation_date: string
  hospital_name: string
  operation_type: string
  notes: string | null
  doctor_id: string | null
  created_at: string
  is_completed: boolean
  completed_date: string | null
  completion_amount: number | null
  patient?: {
    full_name_ar: string
    full_name_en: string | null
    patient_code: string | null
  } | null
}

export async function getOperations(): Promise<{ data?: Operation[]; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('operations')
    .select(`
      id,
      patient_id,
      operation_date,
      hospital_name,
      operation_type,
      notes,
      doctor_id,
      created_at,
      is_completed,
      completed_date,
      completion_amount,
      patients!inner (
        profiles!inner ( full_name_ar, full_name_en ),
        patient_code
      )
    `)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .order('operation_date', { ascending: false }) as any)

  if (error) return { error: error.message }

  const operations = (data ?? []).map((row: Record<string, unknown>) => {
    const pat = row.patients as { profiles: { full_name_ar: string; full_name_en: string | null }; patient_code: string | null } | null
    return {
      id: row.id as string,
      patient_id: row.patient_id as string,
      operation_date: row.operation_date as string,
      hospital_name: row.hospital_name as string,
      operation_type: row.operation_type as string,
      notes: row.notes as string | null,
      doctor_id: row.doctor_id as string | null,
      created_at: row.created_at as string,
      is_completed: (row.is_completed as boolean) ?? false,
      completed_date: row.completed_date as string | null,
      completion_amount: row.completion_amount as number | null,
      patient: pat
        ? {
            full_name_ar: pat.profiles.full_name_ar,
            full_name_en: pat.profiles.full_name_en,
            patient_code: pat.patient_code,
          }
        : null,
    }
  })

  return { data: operations }
}

export async function createOperation(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const patient_id = formData.get('patient_id') as string
  const operation_date = formData.get('operation_date') as string
  const hospital_name = (formData.get('hospital_name') as string)?.trim()
  const operation_type = (formData.get('operation_type') as string)?.trim()
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!patient_id || !operation_date || !hospital_name || !operation_type) {
    return { error: 'Missing required fields' }
  }

  const { error } = await supabase.from('operations').insert({
    patient_id,
    operation_date,
    hospital_name,
    operation_type,
    notes,
    doctor_id: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/doctor/operations')
  return { success: true }
}

export async function updateOperation(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const id = formData.get('id') as string
  const patient_id = formData.get('patient_id') as string
  const operation_date = formData.get('operation_date') as string
  const hospital_name = (formData.get('hospital_name') as string)?.trim()
  const operation_type = (formData.get('operation_type') as string)?.trim()
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!id || !patient_id || !operation_date || !hospital_name || !operation_type) {
    return { error: 'Missing required fields' }
  }

  const { error } = await supabase
    .from('operations')
    .update({ patient_id, operation_date, hospital_name, operation_type, notes })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/doctor/operations')
  return { success: true }
}

export async function deleteOperation(id: string): Promise<{ success?: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('operations').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/doctor/operations')
  return { success: true }
}

export async function completeOperation(
  id: string,
  amount: number,
  completedDate: string,
  completionType?: string
): Promise<{ success?: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can complete operations' }
  }

  const { error } = await supabase
    .from('operations')
    .update({ is_completed: true, completed_date: completedDate, completion_amount: amount, ...(completionType ? { completion_type: completionType } : {}) })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/doctor/operations')
  revalidatePath('/doctor/financial')
  return { success: true }
}

export async function updateCompletedOperation(
  id: string,
  amount: number
): Promise<{ success?: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can update completed operations' }
  }

  const { error } = await supabase
    .from('operations')
    .update({ completion_amount: amount })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/doctor/operations')
  revalidatePath('/doctor/financial')
  return { success: true }
}

export async function uncompleteOperation(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can update operations' }
  }

  const { error } = await supabase
    .from('operations')
    .update({ is_completed: false, completed_date: null, completion_amount: null })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/doctor/operations')
  revalidatePath('/doctor/financial')
  return { success: true }
}
