'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ExternalCost {
  id: string
  patient_id: string
  cost_date: string
  visit_type: string
  amount: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

export async function getExternalCosts(): Promise<{ data?: ExternalCost[]; error?: string }> {
  const supabase = await createClient() as AnySupabase
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('external_costs')
    .select('id, patient_id, cost_date, visit_type, amount')
    .order('cost_date', { ascending: false }) as {
      data: ExternalCost[] | null
      error: { message: string } | null
    }

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

export async function createExternalCost(data: {
  patient_id: string
  cost_date: string
  visit_type: string
  amount: number
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient() as AnySupabase
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single() as { data: { id: string; role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can add external costs' }
  }

  const { error } = await supabase.from('external_costs').insert({
    patient_id: data.patient_id,
    cost_date: data.cost_date,
    visit_type: data.visit_type,
    amount: data.amount,
    doctor_id: profile.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/doctor/financial')
  revalidatePath('/doctor/operations')
  return { success: true }
}

export async function updateExternalCost(
  id: string,
  amount: number
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient() as AnySupabase
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can update external costs' }
  }

  const { error } = await supabase.from('external_costs').update({ amount }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/doctor/financial')
  revalidatePath('/doctor/operations')
  return { success: true }
}

export async function deleteExternalCost(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient() as AnySupabase
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can delete external costs' }
  }

  const { error } = await supabase.from('external_costs').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/doctor/financial')
  revalidatePath('/doctor/operations')
  return { success: true }
}
