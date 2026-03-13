'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

const createPregnancySchema = z.object({
  patient_id: z.string().uuid(),
  lmp_date: z.string().min(1, 'LMP date is required'),
  baby_gender: z.enum(['male', 'female']).optional(),
  notes: z.string().optional(),
  gravida: z.coerce.number().int().min(0).optional(),
  para:    z.coerce.number().int().min(0).optional(),
})

const updatePregnancySchema = z.object({
  pregnancy_id: z.string().uuid(),
  lmp_date: z.string().min(1, 'LMP date is required'),
  baby_gender: z.enum(['male', 'female']).optional(),
  notes: z.string().optional(),
})

const updatePregnancyStatusSchema = z.object({
  pregnancy_id: z.string().uuid(),
  status: z.enum(['active', 'delivered', 'miscarriage', 'ectopic']),
})

const updateMeasurementSchema = z.object({
  measurement_id: z.string().uuid(),
  measured_at: z.string().min(1, 'Measurement date is required'),
  gestational_week: z.coerce.number().int().min(1).max(42).optional(),
  weight_kg: z.coerce.number().positive().optional(),
  blood_pressure: z.string().optional(),
  crl: z.coerce.number().positive().optional(),
  bpd: z.coerce.number().positive().optional(),
  fl:  z.coerce.number().positive().optional(),
  ac:  z.coerce.number().positive().optional(),
  efw: z.coerce.number().positive().optional(),
  hb:           z.coerce.number().positive().optional(),
  rbs:          z.coerce.number().positive().optional(),
  tsh_lab:      z.coerce.number().positive().optional(),
  ogtt:         z.coerce.number().positive().optional(),
  ogtt_fasting: z.coerce.number().positive().optional(),
  ogtt_1hr:     z.coerce.number().positive().optional(),
  ogtt_2hr:     z.coerce.number().positive().optional(),
  plt:          z.coerce.number().positive().optional(),
  hcg:          z.coerce.number().positive().optional(),
  b_hcg:        z.coerce.number().positive().optional(),
  fh:      z.string().optional(),
  placenta: z.string().optional(),
  liquor:  z.string().optional(),
  ua:      z.string().optional(),
  notes: z.string().optional(),
})

const addMeasurementSchema = z.object({
  pregnancy_id: z.string().uuid(),
  measured_at: z.string().min(1, 'Measurement date is required'),
  gestational_week: z.coerce.number().int().min(1).max(42).optional(),
  weight_kg: z.coerce.number().positive().optional(),
  blood_pressure: z.string().optional(),
  fetal_heartbeat: z.coerce.number().int().min(60).max(200).optional(),
  // ANC ultrasound fields
  crl: z.coerce.number().positive().optional(),
  bpd: z.coerce.number().positive().optional(),
  fl:  z.coerce.number().positive().optional(),
  ac:  z.coerce.number().positive().optional(),
  efw: z.coerce.number().positive().optional(),
  // ANC lab fields
  hb:           z.coerce.number().positive().optional(),
  rbs:          z.coerce.number().positive().optional(),
  tsh_lab:      z.coerce.number().positive().optional(),
  ogtt:         z.coerce.number().positive().optional(),
  ogtt_fasting: z.coerce.number().positive().optional(),
  ogtt_1hr:     z.coerce.number().positive().optional(),
  ogtt_2hr:     z.coerce.number().positive().optional(),
  plt:          z.coerce.number().positive().optional(),
  hcg:          z.coerce.number().positive().optional(),
  b_hcg:        z.coerce.number().positive().optional(),
  // Obstetric text fields
  fh:      z.string().optional(),
  placenta: z.string().optional(),
  liquor:  z.string().optional(),
  ua:      z.string().optional(),
  notes: z.string().optional(),
})

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Create a new pregnancy record for a patient.
 * Only doctors can create pregnancy records.
 * Do NOT include expected_due_date — it is GENERATED ALWAYS by the database.
 * Status defaults to 'active' via the database default.
 */
export async function createPregnancy(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Role check: only doctor can create pregnancy records
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctors can create pregnancy records' }
  }

  // Extract and validate input
  const gravidaRaw = formData.get('gravida') as string | null
  const paraRaw    = formData.get('para')    as string | null

  const raw = {
    patient_id: formData.get('patient_id') as string,
    lmp_date: formData.get('lmp_date') as string,
    baby_gender: (formData.get('baby_gender') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
    gravida: gravidaRaw && gravidaRaw !== '' ? gravidaRaw : undefined,
    para:    paraRaw    && paraRaw    !== '' ? paraRaw    : undefined,
  }

  const validation = createPregnancySchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as unknown as string }
  }

  const { patient_id, lmp_date, baby_gender, notes, gravida, para } = validation.data

  // Get doctor_id
  const doctorId = await getDoctorId(supabase)
  if (!doctorId) return { error: 'No doctor found in the system' }

  // Insert pregnancy record — do NOT include expected_due_date (GENERATED ALWAYS)
  const { error: insertError } = await supabase
    .from('pregnancies')
    .insert({
      patient_id,
      doctor_id: doctorId,
      lmp_date,
      baby_gender: baby_gender ?? null,
      notes: notes ?? null,
    })

  if (insertError) return { error: insertError.message }

  // If G/P values were provided, update the patient's OB history
  if (gravida !== undefined || para !== undefined) {
    const adminClient = getAdminClient()
    const obUpdate: Record<string, number | null> = {}
    if (gravida !== undefined) obUpdate.gravida = gravida
    if (para    !== undefined) obUpdate.para    = para
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any).from('patients').update(obUpdate).eq('id', patient_id)
  }

  revalidatePath(`/doctor/patients/${patient_id}`)

  return { success: true }
}

/**
 * Update basic pregnancy info: LMP, gender, notes.
 * Only doctors can update pregnancy records.
 */
export async function updatePregnancy(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') return { error: 'Only doctors can update pregnancy records' }

  const raw = {
    pregnancy_id: formData.get('pregnancy_id') as string,
    lmp_date: formData.get('lmp_date') as string,
    baby_gender: (formData.get('baby_gender') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  }

  const validation = updatePregnancySchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as unknown as string }
  }

  const { pregnancy_id, lmp_date, baby_gender, notes } = validation.data

  const { data: pregnancy, error: fetchError } = await supabase
    .from('pregnancies').select('patient_id').eq('id', pregnancy_id).single() as {
      data: { patient_id: string } | null; error: { message: string } | null
    }

  if (fetchError || !pregnancy) return { error: fetchError?.message ?? 'Pregnancy not found' }

  const { error: updateError } = await supabase
    .from('pregnancies')
    .update({ lmp_date, baby_gender: baby_gender ?? null, notes: notes ?? null })
    .eq('id', pregnancy_id)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/doctor/patients/${pregnancy.patient_id}`)
  return { success: true }
}

/**
 * Update the status of an existing pregnancy.
 * Only doctors can update pregnancy status.
 * Valid statuses: 'active' | 'delivered' | 'miscarriage' | 'ectopic'
 */
export async function updatePregnancyStatus(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Role check: only doctor can update pregnancy status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctors can update pregnancy status' }
  }

  // Extract and validate input
  const raw = {
    pregnancy_id: formData.get('pregnancy_id') as string,
    status: formData.get('status') as string,
  }

  const validation = updatePregnancyStatusSchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as unknown as string }
  }

  const { pregnancy_id, status } = validation.data

  // Fetch patient_id from the pregnancy row (needed for revalidatePath)
  const { data: pregnancy, error: fetchError } = await supabase
    .from('pregnancies')
    .select('patient_id')
    .eq('id', pregnancy_id)
    .single() as { data: { patient_id: string } | null; error: { message: string } | null }

  if (fetchError || !pregnancy) {
    return { error: fetchError?.message ?? 'Pregnancy not found' }
  }

  // Update pregnancy status
  const { error: updateError } = await supabase
    .from('pregnancies')
    .update({ status })
    .eq('id', pregnancy_id)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/doctor/patients/${pregnancy.patient_id}`)

  return { success: true }
}

/**
 * Add a measurement record to an existing pregnancy.
 * Only doctors can add measurements.
 * gestational_week is doctor-entered, NOT auto-calculated.
 * blood_pressure is a single TEXT field (e.g. "120/80").
 */
export async function addMeasurement(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Role check: only doctor can add measurements
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctors can add pregnancy measurements' }
  }

  // Helper: convert empty string to undefined
  const fd = (key: string) => {
    const v = formData.get(key) as string
    return v && v !== '' ? v : undefined
  }

  const raw = {
    pregnancy_id: formData.get('pregnancy_id') as string,
    measured_at: formData.get('measured_at') as string,
    gestational_week: fd('gestational_week'),
    weight_kg:        fd('weight_kg'),
    blood_pressure:   fd('blood_pressure'),
    fetal_heartbeat:  fd('fetal_heartbeat'),
    // ANC ultrasound
    crl: fd('crl'), bpd: fd('bpd'), fl: fd('fl'), ac: fd('ac'), efw: fd('efw'),
    // ANC lab
    hb: fd('hb'), rbs: fd('rbs'), tsh_lab: fd('tsh_lab'),
    ogtt: fd('ogtt'), ogtt_fasting: fd('ogtt_fasting'), ogtt_1hr: fd('ogtt_1hr'), ogtt_2hr: fd('ogtt_2hr'),
    plt: fd('plt'), hcg: fd('hcg'), b_hcg: fd('b_hcg'),
    // Obstetric text fields
    fh: fd('fh'), placenta: fd('placenta'), liquor: fd('liquor'), ua: fd('ua'),
    notes: (formData.get('notes') as string) || undefined,
  }

  const validation = addMeasurementSchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as unknown as string }
  }

  const {
    pregnancy_id,
    measured_at,
    gestational_week,
    weight_kg,
    blood_pressure,
    fetal_heartbeat,
    crl, bpd, fl, ac, efw,
    hb, rbs, tsh_lab, ogtt, ogtt_fasting, ogtt_1hr, ogtt_2hr, plt, hcg, b_hcg,
    fh, placenta, liquor, ua,
    notes,
  } = validation.data

  // Fetch parent pregnancy's patient_id for revalidatePath
  const { data: pregnancy, error: fetchError } = await supabase
    .from('pregnancies')
    .select('patient_id')
    .eq('id', pregnancy_id)
    .single() as { data: { patient_id: string } | null; error: { message: string } | null }

  if (fetchError || !pregnancy) {
    return { error: fetchError?.message ?? 'Pregnancy not found' }
  }

  // Insert measurement record
  const { error: insertError } = await supabase
    .from('pregnancy_measurements')
    .insert({
      pregnancy_id,
      measured_at,
      gestational_week: gestational_week ?? null,
      weight_kg: weight_kg ?? null,
      blood_pressure: blood_pressure ?? null,
      fetal_heartbeat: fetal_heartbeat ?? null,
      crl: crl ?? null, bpd: bpd ?? null, fl: fl ?? null, ac: ac ?? null, efw: efw ?? null,
      hb: hb ?? null, rbs: rbs ?? null, tsh_lab: tsh_lab ?? null,
      ogtt: ogtt ?? null, ogtt_fasting: ogtt_fasting ?? null, ogtt_1hr: ogtt_1hr ?? null, ogtt_2hr: ogtt_2hr ?? null,
      plt: plt ?? null, hcg: hcg ?? null, b_hcg: b_hcg ?? null,
      fh: fh ?? null, placenta: placenta ?? null, liquor: liquor ?? null, ua: ua ?? null,
      notes: notes ?? null,
    })

  if (insertError) return { error: insertError.message }

  revalidatePath(`/doctor/patients/${pregnancy.patient_id}`)

  return { success: true }
}

/**
 * Delete an entire pregnancy record (and its measurements via CASCADE).
 * Only doctors can delete pregnancy records.
 */
export async function deletePregnancy(
  pregnancyId: string,
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

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctors can delete pregnancy records' }
  }

  const { error } = await supabase
    .from('pregnancies')
    .delete()
    .eq('id', pregnancyId)

  if (error) return { error: error.message }

  revalidatePath(`/doctor/patients/${patientId}`)
  return { success: true }
}

/**
 * Delete a single pregnancy measurement.
 * Only doctors can delete measurements.
 */
export async function deleteMeasurement(
  measurementId: string,
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

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctors can delete measurements' }
  }

  const { error } = await supabase
    .from('pregnancy_measurements')
    .delete()
    .eq('id', measurementId)

  if (error) return { error: error.message }

  revalidatePath(`/doctor/patients/${patientId}`)
  return { success: true }
}

/**
 * Update an existing pregnancy measurement.
 * Only doctors can update measurements.
 */
export async function updateMeasurement(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctors can update measurements' }
  }

  const fd = (key: string) => {
    const v = formData.get(key) as string
    return v && v !== '' ? v : undefined
  }

  const raw = {
    measurement_id: formData.get('measurement_id') as string,
    measured_at: formData.get('measured_at') as string,
    gestational_week: fd('gestational_week'),
    weight_kg:        fd('weight_kg'),
    blood_pressure:   fd('blood_pressure'),
    crl: fd('crl'), bpd: fd('bpd'), fl: fd('fl'), ac: fd('ac'), efw: fd('efw'),
    hb: fd('hb'), rbs: fd('rbs'), tsh_lab: fd('tsh_lab'),
    ogtt: fd('ogtt'), ogtt_fasting: fd('ogtt_fasting'), ogtt_1hr: fd('ogtt_1hr'), ogtt_2hr: fd('ogtt_2hr'),
    plt: fd('plt'), hcg: fd('hcg'), b_hcg: fd('b_hcg'),
    fh: fd('fh'), placenta: fd('placenta'), liquor: fd('liquor'), ua: fd('ua'),
    notes: (formData.get('notes') as string) || undefined,
  }

  const validation = updateMeasurementSchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as unknown as string }
  }

  const { measurement_id, measured_at, gestational_week, weight_kg, blood_pressure,
    crl, bpd, fl, ac, efw, hb, rbs, tsh_lab, ogtt, ogtt_fasting, ogtt_1hr, ogtt_2hr, plt, hcg, b_hcg,
    fh, placenta, liquor, ua, notes } = validation.data

  // Fetch patient_id via pregnancy for revalidation
  const { data: mRow, error: fetchError } = await supabase
    .from('pregnancy_measurements')
    .select('pregnancy_id')
    .eq('id', measurement_id)
    .single() as { data: { pregnancy_id: string } | null; error: { message: string } | null }

  if (fetchError || !mRow) return { error: fetchError?.message ?? 'Measurement not found' }

  const { data: pregnancy, error: pregError } = await supabase
    .from('pregnancies')
    .select('patient_id')
    .eq('id', mRow.pregnancy_id)
    .single() as { data: { patient_id: string } | null; error: { message: string } | null }

  if (pregError || !pregnancy) return { error: pregError?.message ?? 'Pregnancy not found' }

  const { error: updateError } = await supabase
    .from('pregnancy_measurements')
    .update({
      measured_at,
      gestational_week: gestational_week ?? null,
      weight_kg: weight_kg ?? null,
      blood_pressure: blood_pressure ?? null,
      crl: crl ?? null, bpd: bpd ?? null, fl: fl ?? null, ac: ac ?? null, efw: efw ?? null,
      hb: hb ?? null, rbs: rbs ?? null, tsh_lab: tsh_lab ?? null,
      ogtt: ogtt ?? null, ogtt_fasting: ogtt_fasting ?? null, ogtt_1hr: ogtt_1hr ?? null, ogtt_2hr: ogtt_2hr ?? null,
      plt: plt ?? null, hcg: hcg ?? null, b_hcg: b_hcg ?? null,
      fh: fh ?? null, placenta: placenta ?? null, liquor: liquor ?? null, ua: ua ?? null,
      notes: notes ?? null,
    })
    .eq('id', measurement_id)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/doctor/patients/${pregnancy.patient_id}`)
  return { success: true }
}
