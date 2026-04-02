'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(val: FormDataEntryValue | null): number | null {
  const s = val as string
  if (!s || s.trim() === '') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function toStr(val: FormDataEntryValue | null): string | null {
  const s = val as string
  return s && s.trim() !== '' ? s.trim() : null
}

async function requireDoctor(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as string, userId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctors can manage infertility records' as string, userId: null }
  }
  return { error: null, userId: user.id }
}

// Auto-calculate next visit_number for a patient (COUNT existing + 1)
async function nextVisitNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patient_id: string
): Promise<number> {
  const { count } = await supabase
    .from('infertility_records')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patient_id)
  return (count ?? 0) + 1
}

// ─── Build record payload ─────────────────────────────────────────────────────

function buildPayload(formData: FormData) {
  const today = new Date().toISOString().split('T')[0]
  return {
    record_date:    toStr(formData.get('record_date')) ?? today,
    // Clinical (parity/pmh/psh/pdh moved to patients table snapshot)
    lmp_date:       toStr(formData.get('lmp_date')),
    complaint:      toStr(formData.get('complaint')),
    us_findings:    toStr(formData.get('us_findings')),
    plan:           toStr(formData.get('plan')),
    // HSG
    hsg_date:       toStr(formData.get('hsg_date')),
    hsg_result:     toStr(formData.get('hsg_result')),
    // Hormones
    fsh:            toNum(formData.get('fsh')),
    lh:             toNum(formData.get('lh')),
    amh:            toNum(formData.get('amh')),
    tsh:            toNum(formData.get('tsh')),
    prl:            toNum(formData.get('prl')),
    homa_score:     toNum(formData.get('homa_score')),
    // SFA
    sfa_count:      toNum(formData.get('sfa_count')),
    sfa_motility:   toNum(formData.get('sfa_motility')),
    sfa_morphology: toNum(formData.get('sfa_morphology')),
    sfa_viscosity:  toStr(formData.get('sfa_viscosity')),
    notes:          toStr(formData.get('notes')),
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createInfertilityRecord(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { error: authError, userId } = await requireDoctor(supabase)
  if (authError || !userId) return { error: authError ?? 'Unauthorized' }

  const patient_id = formData.get('patient_id') as string
  if (!patient_id) return { error: 'patient_id is required' }

  // Auto-sequential visit number
  const visit_number = await nextVisitNumber(supabase, patient_id)

  const record = {
    patient_id,
    doctor_id: userId,
    visit_number,
    ...buildPayload(formData),
  }

  const { error } = await supabase.from('infertility_records').insert(record)
  if (error) return { error: error.message }

  revalidatePath(`/doctor/patients/${patient_id}`)
  return { success: true }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateInfertilityRecord(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { error: authError } = await requireDoctor(supabase)
  if (authError) return { error: authError }

  const record_id = formData.get('record_id') as string
  const patient_id = formData.get('patient_id') as string
  if (!record_id || !patient_id) return { error: 'record_id and patient_id are required' }

  const { error } = await supabase
    .from('infertility_records')
    .update(buildPayload(formData))
    .eq('id', record_id)

  if (error) return { error: error.message }

  revalidatePath(`/doctor/patients/${patient_id}`)
  return { success: true }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteInfertilityRecord(
  recordId: string,
  patientId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { error: authError } = await requireDoctor(supabase)
  if (authError) return { error: authError }

  const { error } = await supabase
    .from('infertility_records')
    .delete()
    .eq('id', recordId)

  if (error) return { error: error.message }

  // Re-number remaining records for this patient
  const { data: remaining } = await supabase
    .from('infertility_records')
    .select('id')
    .eq('patient_id', patientId)
    .order('record_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (remaining && remaining.length > 0) {
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from('infertility_records')
        .update({ visit_number: i + 1 })
        .eq('id', remaining[i].id)
    }
  }

  revalidatePath(`/doctor/patients/${patientId}`)
  return { success: true }
}
