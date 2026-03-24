'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate patient code: DDMMYY + first letter of first name + first letter of last name
 * Uses English name if available, falls back to Arabic name.
 * Example: "Ahmad Mohammad" born 1990-01-15 → "150190AM"
 */
function generatePatientCode(fullNameAr: string, fullNameEn: string | null | undefined, dateOfBirth: string): string {
  const parts = dateOfBirth.split('-') // YYYY-MM-DD
  if (parts.length !== 3) return ''
  const dd = parts[2]
  const mm = parts[1]
  const yy = parts[0].slice(-2)
  const nameToUse = (fullNameEn && fullNameEn.trim()) ? fullNameEn.trim() : fullNameAr.trim()
  const nameParts = nameToUse.split(/\s+/)
  const firstInitial = nameParts[0]?.[0]?.toUpperCase() ?? ''
  const lastInitial = nameParts[nameParts.length - 1]?.[0]?.toUpperCase() ?? ''
  return `${dd}${mm}${yy}${firstInitial}${lastInitial}`
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const updatePatientSchema = z.object({
  patient_id: z.string().uuid(),
  full_name_ar: z.string().min(1, 'Arabic name is required'),
  full_name_en: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  blood_type: z.string().optional(),
  national_id: z.string().max(10).regex(/^[0-9]*$/, 'National ID must be digits only').optional().or(z.literal('')),
  nickname: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
})

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Search patients by name (Arabic or English) or phone number.
 * Returns paginated results sorted alphabetically by Arabic name.
 * Default sort: alphabetical by patient name (full_name_ar ascending).
 */
export async function searchPatients(
  query: string,
  page: number = 1,
  perPage: number = 12
): Promise<{
  patients?: Record<string, unknown>[]
  count?: number
  page?: number
  perPage?: number
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Build query: profiles with inner join to patients table
  let queryBuilder = supabase
    .from('profiles')
    .select(
      `
      id,
      full_name_ar,
      full_name_en,
      phone,
      email,
      created_at,
      patients!inner(
        id,
        date_of_birth,
        blood_type,
        national_id,
        patient_code,
        emergency_contact_name,
        emergency_contact_phone,
        notes
      )
    `,
      { count: 'exact' }
    )
    .eq('role', 'patient')

  // If query provided, search across name fields, phone, and patient_code
  if (query && query.trim().length > 0) {
    const q = query.trim()

    // Pre-fetch patient IDs matching by patient_code or national_id (cross-table OR workaround)
    const { data: codeMatches } = await supabase
      .from('patients')
      .select('id')
      .or(`patient_code.ilike.%${q}%,national_id.ilike.%${q}%`) as { data: { id: string }[] | null }

    const matchingIds = (codeMatches ?? []).map((p) => p.id)

    // Build OR condition: name/phone on profiles table + IDs from patient_code/national_id match
    let orCondition = `full_name_ar.ilike.%${q}%,full_name_en.ilike.%${q}%,phone.ilike.%${q}%`
    if (matchingIds.length > 0) {
      orCondition += `,id.in.(${matchingIds.join(',')})`
    }

    queryBuilder = queryBuilder.or(orCondition)
  }

  // Order alphabetically by Arabic name, with pagination
  const { data: patients, count, error } = await queryBuilder
    .order('full_name_ar', { ascending: true })
    .range((page - 1) * perPage, page * perPage - 1) as {
      data: Record<string, unknown>[] | null
      count: number | null
      error: { message: string } | null
    }

  if (error) return { error: error.message }

  // Fetch the most recent ended visit date per patient
  const patientIds = (patients ?? []).map((p) => p.id as string)
  const lastVisitMap: Record<string, string> = {}
  if (patientIds.length > 0) {
    const { data: lastVisits } = await supabase
      .from('medical_records')
      .select('patient_id, visit_date')
      .in('patient_id', patientIds)
      .eq('is_ended', true)
      .is('deleted_at', null)
      .order('visit_date', { ascending: false }) as {
        data: { patient_id: string; visit_date: string }[] | null
      }
    for (const v of lastVisits ?? []) {
      if (!lastVisitMap[v.patient_id]) lastVisitMap[v.patient_id] = v.visit_date
    }
  }

  return {
    patients: (patients ?? []).map((p) => ({
      ...p,
      last_visit_date: lastVisitMap[p.id as string] ?? null,
    })),
    count: count ?? 0,
    page,
    perPage,
  }
}

/**
 * Search patients for use in combobox selectors.
 * Searches across name (AR/EN), phone, patient_code, and national_id.
 * Returns up to 30 matches.
 */
export async function searchPatientsForCombobox(query: string): Promise<{
  patients?: Array<{
    id: string
    full_name_ar: string
    full_name_en: string | null
    phone: string | null
    patient_code: string | null
    national_id: string | null
  }>
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const q = query.trim()

  // Search patient_code and national_id in patients table
  const { data: codeMatches } = await supabase
    .from('patients')
    .select('id')
    .or(`patient_code.ilike.%${q}%,national_id.ilike.%${q}%`) as { data: { id: string }[] | null }

  const matchingIds = (codeMatches ?? []).map((p) => p.id)

  let orCondition = `full_name_ar.ilike.%${q}%,full_name_en.ilike.%${q}%,phone.ilike.%${q}%`
  if (matchingIds.length > 0) {
    orCondition += `,id.in.(${matchingIds.join(',')})`
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name_ar, full_name_en, phone, patients!inner(patient_code, national_id)')
    .eq('role', 'patient')
    .or(orCondition)
    .order('full_name_ar', { ascending: true })
    .limit(30) as unknown as {
      data: Array<{
        id: string
        full_name_ar: string
        full_name_en: string | null
        phone: string | null
        patients: { patient_code: string | null; national_id: string | null } | { patient_code: string | null; national_id: string | null }[]
      }> | null
      error: { message: string } | null
    }

  if (error) return { error: error.message }

  return {
    patients: (profiles ?? []).map((p) => {
      const pt = Array.isArray(p.patients) ? p.patients[0] : p.patients
      return {
        id: p.id,
        full_name_ar: p.full_name_ar,
        full_name_en: p.full_name_en,
        phone: p.phone,
        patient_code: pt?.patient_code ?? null,
        national_id: pt?.national_id ?? null,
      }
    }),
  }
}

/**
 * Update patient personal information across both profiles and patients tables.
 * Only doctor or secretary can edit patient personal information.
 */
export async function updatePatientInfo(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Role check: only doctor or secretary can edit patient info
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can edit patient information' }
  }

  // Extract all fields from FormData
  const raw = {
    patient_id: formData.get('patient_id') as string,
    full_name_ar: formData.get('full_name_ar') as string,
    full_name_en: (formData.get('full_name_en') as string) || undefined,
    phone: formData.get('phone') as string,
    email: (formData.get('email') as string) || undefined,
    date_of_birth: (formData.get('date_of_birth') as string) || undefined,
    blood_type: (formData.get('blood_type') as string) || undefined,
    national_id: (formData.get('national_id') as string) || undefined,
    nickname: (formData.get('nickname') as string) || undefined,
    emergency_contact_name: (formData.get('emergency_contact_name') as string) || undefined,
    emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  }

  const validation = updatePatientSchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as unknown as string }
  }

  const {
    patient_id,
    full_name_ar,
    full_name_en,
    phone,
    email,
    date_of_birth,
    blood_type,
    national_id,
    nickname,
    emergency_contact_name,
    emergency_contact_phone,
    notes,
  } = validation.data

  // Use admin client to bypass RLS (avoids infinite recursion on profiles policies)
  const adminClient = createAdminClient()

  // Update profiles table: identity fields
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      full_name_ar,
      full_name_en: full_name_en ?? null,
      phone,
      email: email || null,
    })
    .eq('id', patient_id) as { error: { message: string } | null }

  if (profileError) return { error: profileError.message }

  // Compute patient_code if date_of_birth is available
  const newPatientCode =
    date_of_birth && full_name_ar
      ? generatePatientCode(full_name_ar, full_name_en, date_of_birth)
      : undefined

  // Update patients table: clinical/administrative fields
  const { error: patientError } = await adminClient
    .from('patients')
    .update({
      date_of_birth: date_of_birth ?? undefined,
      blood_type: blood_type ?? null,
      national_id: national_id ?? null,
      nickname: nickname ?? null,
      emergency_contact_name: emergency_contact_name ?? null,
      emergency_contact_phone: emergency_contact_phone ?? null,
      notes: notes ?? null,
      ...(newPatientCode ? { patient_code: newPatientCode } : {}),
    })
    .eq('id', patient_id) as { error: { message: string } | null }

  if (patientError) return { error: patientError.message }

  revalidatePath('/doctor/patients')
  revalidatePath('/secretary/patients')
  revalidatePath(`/doctor/patients/${patient_id}`)
  revalidatePath(`/secretary/patients/${patient_id}`)

  return { success: true }
}

/**
 * Update the permanent medical history fields for a patient (PMH, PSH, PDH, Parity).
 * Only doctor or secretary can update.
 */
export async function updatePatientMedicalHistory(
  patientId: string,
  data: { pmh?: string; psh?: string; pdh?: string; parity?: string; gravida?: number | null; para?: number | null }
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

  const updatePayload: Record<string, unknown> = {
    pmh: data.pmh ?? null,
    psh: data.psh ?? null,
    pdh: data.pdh ?? null,
    parity: data.parity ?? null,
  }
  if ('gravida' in data) updatePayload.gravida = data.gravida ?? null
  if ('para' in data) updatePayload.para = data.para ?? null

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('patients')
    .update(updatePayload)
    .eq('id', patientId) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath(`/doctor/patients/${patientId}`)
  revalidatePath(`/secretary/patients/${patientId}`)
  return { success: true }
}

/**
 * Change a user's password. Only doctor or secretary can change passwords.
 * Uses admin client to update the auth user password.
 */
export async function changeUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can change passwords' }
  }

  if (newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  const adminClient = createAdminClient()

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  )

  if (updateError) return { error: updateError.message }

  return { success: true }
}

/**
 * Delete a patient and all their data. Only doctor can delete patients.
 * Deletes the auth user which cascades to profiles -> patients -> all related data.
 */
export async function deletePatient(
  patientId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Only doctor can delete
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctor can delete patients' }
  }

  const adminClient = createAdminClient()

  // Explicitly delete all patient data before removing the auth user.
  // Each step checks for errors so failures are surfaced instead of silently ignored.

  // Get pregnancy IDs first (needed for pregnancy_measurements)
  const { data: pregnancies } = await adminClient
    .from('pregnancies')
    .select('id')
    .eq('patient_id', patientId)
  if (pregnancies && pregnancies.length > 0) {
    const { error: pmErr } = await adminClient
      .from('pregnancy_measurements')
      .delete()
      .in('pregnancy_id', pregnancies.map((p) => p.id))
    if (pmErr) return { error: pmErr.message }
  }

  // ── Preserve visit records (medical_records) ──────────────────────────────
  // Explicitly NULL out patient_id on medical_records BEFORE deleting the patient row.
  // This guarantees visit fees survive in Financial/Visitors reports as "مريضة محذوفة"
  // regardless of the DB FK cascade behaviour.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: mrNullErr } = await (adminClient as any)
    .from('medical_records')
    .update({ patient_id: null })
    .eq('patient_id', patientId)
  if (mrNullErr) return { error: `Failed to preserve visit records: ${mrNullErr.message}` }

  // ── Preserve financial records (invoices / external_costs / operations) ──
  // Explicitly NULL out patient_id on financial tables BEFORE deleting the patient row,
  // for the same reason as above (belt-and-suspenders on top of migration 31).
  for (const financialTable of ['invoices', 'external_costs', 'operations'] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: ftErr } = await (adminClient as any)
      .from(financialTable)
      .update({ patient_id: null })
      .eq('patient_id', patientId)
    if (ftErr) return { error: `Failed to preserve ${financialTable}: ${ftErr.message}` }
  }

  const steps: Array<{ table: string; column: string }> = [
    { table: 'lab_tests', column: 'patient_id' },
    { table: 'infertility_records', column: 'patient_id' },
    { table: 'pregnancies', column: 'patient_id' },
    { table: 'prescriptions', column: 'patient_id' },
    { table: 'patient_files', column: 'patient_id' },
    { table: 'appointments', column: 'patient_id' },
  ]

  for (const step of steps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: stepErr } = await (adminClient as any)
      .from(step.table)
      .delete()
      .eq(step.column, patientId)
    if (stepErr) return { error: `Failed to delete ${step.table}: ${stepErr.message}` }
  }

  const { error: patientsErr } = await adminClient.from('patients').delete().eq('id', patientId)
  if (patientsErr) return { error: patientsErr.message }

  const { error: profilesErr } = await adminClient.from('profiles').delete().eq('id', patientId)
  if (profilesErr) return { error: profilesErr.message }

  // Delete auth user
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(patientId)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/doctor/patients')
  revalidatePath('/secretary/patients')
  revalidatePath('/doctor/dashboard')

  return { success: true }
}
