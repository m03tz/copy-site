'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createStaffSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name_ar: z.string().min(1, 'Arabic name is required'),
  full_name_en: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  role: z.enum(['doctor', 'secretary']),
})

const createPatientSchema = z.object({
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  full_name_ar: z.string().min(1, 'الاسم مطلوب'),
  full_name_en: z.string().optional(),
  phone: z.string().optional().or(z.literal('')),
  date_of_birth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
  blood_type: z.string().optional(),
  national_id: z.string().optional(),
  nickname: z.string().optional(),
})

// ─── Create Staff (Doctor/Secretary) ─────────────────────────────────────────

export async function createStaffMember(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Only doctor can create staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctor can create staff members' }
  }

  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    full_name_ar: formData.get('full_name_ar') as string,
    full_name_en: (formData.get('full_name_en') as string) || undefined,
    phone: formData.get('phone') as string,
    role: formData.get('role') as string,
  }

  const validation = createStaffSchema.safeParse(raw)
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors
    const firstError = Object.values(errors).flat()[0]
    return { error: firstError || 'Validation failed' }
  }

  const { email, password, full_name_ar, full_name_en, phone, role } = validation.data

  // Use admin client to create user in Supabase Auth
  const adminClient = createAdminClient()

  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!newUser.user) {
    return { error: 'Failed to create user' }
  }

  // Create profile record
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: newUser.user.id,
      role: role as 'doctor' | 'secretary',
      full_name_ar,
      full_name_en: full_name_en ?? null,
      phone,
      email,
    })

  if (profileError) {
    // Cleanup: delete auth user if profile creation fails
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return { error: profileError.message }
  }

  revalidatePath('/doctor/dashboard')
  return { success: true }
}

// ─── Create Patient ──────────────────────────────────────────────────────────

export async function createPatient(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Only doctor or secretary can create patients
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can create patients' }
  }

  const raw = {
    email: (formData.get('email') as string) || undefined,
    password: (formData.get('password') as string) || undefined,
    full_name_ar: (formData.get('full_name_ar') as string)?.trim() || '',
    full_name_en: (formData.get('full_name_en') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    date_of_birth: (formData.get('date_of_birth') as string)?.trim() || '',
    blood_type: (formData.get('blood_type') as string) || undefined,
    national_id: (formData.get('national_id') as string) || undefined,
    nickname: (formData.get('nickname') as string) || undefined,
  }

  const validation = createPatientSchema.safeParse(raw)
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors
    const firstError = Object.values(errors).flat()[0]
    return { error: firstError || 'Validation failed' }
  }

  const { email, password, full_name_ar, full_name_en, phone, date_of_birth, blood_type, national_id, nickname } = validation.data

  const adminClient = createAdminClient()

  // Generate a unique identifier for auth email if no email or phone provided
  const authEmail = email || (phone ? `${phone.replace(/[^0-9]/g, '')}@patient.local` : `patient_${crypto.randomUUID().slice(0, 8)}@patient.local`)
  const authPassword = password || crypto.randomUUID().slice(0, 12)

  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email: authEmail,
    password: authPassword,
    email_confirm: true,
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!newUser.user) {
    return { error: 'Failed to create user' }
  }

  // Create profile record
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: newUser.user.id,
      role: 'patient',
      full_name_ar: full_name_ar || null,
      full_name_en: full_name_en ?? null,
      phone: phone || null,
      email: email || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

  if (profileError) {
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return { error: profileError.message }
  }

  // Generate patient_code: DDMMYY + first letter of first name + first letter of last name
  // Uses English name if available, falls back to Arabic name
  const patientCode = (() => {
    if (!date_of_birth || !full_name_ar) return null
    const parts = date_of_birth.split('-')
    if (parts.length !== 3) return null
    const nameToUse = (full_name_en && full_name_en.trim()) ? full_name_en.trim() : full_name_ar.trim()
    const nameParts = nameToUse.split(/\s+/)
    const firstInitial = nameParts[0]?.[0]?.toUpperCase() ?? ''
    const lastInitial = nameParts[nameParts.length - 1]?.[0]?.toUpperCase() ?? ''
    return `${parts[2]}${parts[1]}${parts[0].slice(-2)}${firstInitial}${lastInitial}`
  })()

  // Create patients record
  const { error: patientError } = await adminClient
    .from('patients')
    .insert({
      id: newUser.user.id,
      date_of_birth,
      blood_type: blood_type ?? null,
      national_id: national_id ?? null,
      nickname: nickname ?? null,
      ...(patientCode ? { patient_code: patientCode } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

  if (patientError) {
    // Cleanup
    await adminClient.from('profiles').delete().eq('id', newUser.user.id)
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return { error: patientError.message }
  }

  revalidatePath('/doctor/patients')
  revalidatePath('/secretary/patients')
  revalidatePath('/doctor/dashboard')
  return { success: true }
}
