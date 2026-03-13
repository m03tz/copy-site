'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { normalizePhone } from '@/lib/utils/phone'

const createPatientSchema = z.object({
  full_name_ar: z.string().min(2, 'Arabic name required'),
  full_name_en: z.string().optional(),
  phone: z.string().min(7, 'Phone number required'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format: YYYY-MM-DD'),
  blood_type: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']).optional(),
  national_id: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
})

export async function createPatientAccount(formData: FormData) {
  // 1. Verify caller is doctor or secretary
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: 'patient' | 'doctor' | 'secretary' } | null }

  if (!callerProfile || !['doctor', 'secretary'].includes(callerProfile.role)) {
    return { error: 'Only doctor or secretary can create accounts' }
  }

  // 2. Validate input
  const rawData = {
    full_name_ar: formData.get('full_name_ar') as string,
    full_name_en: formData.get('full_name_en') as string || undefined,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string || '',
    password: formData.get('password') as string,
    date_of_birth: formData.get('date_of_birth') as string,
    blood_type: formData.get('blood_type') as string || undefined,
    national_id: formData.get('national_id') as string || undefined,
    emergency_contact_name: formData.get('emergency_contact_name') as string || undefined,
    emergency_contact_phone: formData.get('emergency_contact_phone') as string || undefined,
  }

  const validation = createPatientSchema.safeParse(rawData)
  if (!validation.success) return { error: validation.error.flatten().fieldErrors }

  const data = validation.data

  // 3. Normalize phone
  const normalizedPhone = normalizePhone(data.phone)
  if (!normalizedPhone) return { error: { phone: ['Invalid Jordanian phone number'] } }

  // 4. Create auth user with admin client
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    phone: normalizedPhone,
    email: data.email || undefined,
    password: data.password,
    email_confirm: true,
    phone_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: 'A user with this email or phone already exists' }
    }
    return { error: authError.message }
  }

  // 5. Create profile
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authUser.user.id,
    role: 'patient',
    full_name_ar: data.full_name_ar,
    full_name_en: data.full_name_en || null,
    phone: normalizedPhone,
    email: data.email || null,
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    return { error: 'Failed to create patient profile' }
  }

  // 6. Create patient record
  const { error: patientError } = await supabaseAdmin.from('patients').insert({
    id: authUser.user.id,
    date_of_birth: data.date_of_birth,
    blood_type: data.blood_type || null,
    national_id: data.national_id || null,
    emergency_contact_name: data.emergency_contact_name || null,
    emergency_contact_phone: data.emergency_contact_phone
      ? normalizePhone(data.emergency_contact_phone) || data.emergency_contact_phone
      : null,
  })

  if (patientError) {
    await supabaseAdmin.from('profiles').delete().eq('id', authUser.user.id)
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    return { error: 'Failed to create patient record' }
  }

  return {
    success: true,
    patient: { id: authUser.user.id, full_name_ar: data.full_name_ar, phone: normalizedPhone }
  }
}
