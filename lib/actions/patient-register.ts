'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/utils/phone'
import { z } from 'zod'

const registerSchema = z.object({
  full_name_ar: z.string().min(5, 'الاسم يجب أن يكون ثلاثياً على الأقل').refine(
    (name) => name.trim().split(/\s+/).length >= 3,
    'يرجى إدخال الاسم الثلاثي كاملاً'
  ),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  date_of_birth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
})

export async function registerPatient(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const raw = {
    full_name_ar: (formData.get('full_name_ar') as string)?.trim() || '',
    phone: (formData.get('phone') as string)?.trim() || '',
    date_of_birth: (formData.get('date_of_birth') as string)?.trim() || '',
  }

  const validation = registerSchema.safeParse(raw)
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors
    const firstError = Object.values(errors).flat()[0]
    return { error: firstError || 'بيانات غير صحيحة' }
  }

  const { full_name_ar, phone, date_of_birth } = validation.data

  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    return { error: 'رقم الهاتف غير صحيح' }
  }

  const admin = createAdminClient()

  // Check if phone already exists
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('phone', normalizedPhone)
    .limit(1)
    .single()

  if (existing) {
    return { error: 'رقم الهاتف مسجل مسبقاً' }
  }

  // Generate auth email from phone
  const authEmail = `${normalizedPhone.replace(/[^0-9]/g, '')}@patient.local`
  // Use phone digits as password (last 8 digits)
  const authPassword = normalizedPhone.replace(/[^0-9]/g, '').slice(-8)

  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email: authEmail,
    password: authPassword,
    email_confirm: true,
  })

  if (authError) {
    return { error: 'فشل إنشاء الحساب: ' + authError.message }
  }

  if (!newUser.user) {
    return { error: 'فشل إنشاء الحساب' }
  }

  // Create profile
  const { error: profileError } = await admin.from('profiles').insert({
    id: newUser.user.id,
    role: 'patient',
    full_name_ar,
    full_name_en: null,
    phone: normalizedPhone,
    email: null,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    return { error: 'فشل إنشاء الملف الشخصي: ' + profileError.message }
  }

  // Generate patient_code: DDMMYY + first letter of first name + first letter of last name
  const patientCode = (() => {
    const parts = date_of_birth.split('-')
    if (parts.length !== 3) return null
    const nameParts = full_name_ar.trim().split(/\s+/)
    return `${parts[2]}${parts[1]}${parts[0].slice(-2)}${nameParts[0]?.[0] ?? ''}${nameParts[nameParts.length - 1]?.[0] ?? ''}`
  })()

  // Create patient record
  const { error: patientError } = await admin.from('patients').insert({
    id: newUser.user.id,
    date_of_birth,
    blood_type: null,
    national_id: null,
    ...(patientCode ? { patient_code: patientCode } : {}),
  } as { id: string; date_of_birth: string; blood_type: null; national_id: null; patient_code?: string })

  if (patientError) {
    await admin.from('profiles').delete().eq('id', newUser.user.id)
    await admin.auth.admin.deleteUser(newUser.user.id)
    return { error: 'فشل إنشاء سجل المريض: ' + patientError.message }
  }

  return { success: true }
}
