'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateMyInfoSchema = z.object({
  full_name_ar: z.string().min(1, 'الاسم بالعربية مطلوب'),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  date_of_birth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
  blood_type: z.string().optional(),
  national_id: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
})

/**
 * Allows a logged-in patient to update their own personal information.
 */
export async function updateMyInfo(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  // Verify the user is a patient
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'patient') {
    return { error: 'هذا الإجراء متاح للمرضى فقط' }
  }

  const raw = {
    full_name_ar: (formData.get('full_name_ar') as string)?.trim() || '',
    phone: (formData.get('phone') as string)?.trim() || '',
    date_of_birth: (formData.get('date_of_birth') as string)?.trim() || '',
    blood_type: (formData.get('blood_type') as string)?.trim() || undefined,
    national_id: (formData.get('national_id') as string)?.trim() || undefined,
    emergency_contact_name: (formData.get('emergency_contact_name') as string)?.trim() || undefined,
    emergency_contact_phone: (formData.get('emergency_contact_phone') as string)?.trim() || undefined,
  }

  const validation = updateMyInfoSchema.safeParse(raw)
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors
    const firstError = Object.values(errors).flat()[0]
    return { error: firstError || 'بيانات غير صحيحة' }
  }

  const {
    full_name_ar,
    phone,
    date_of_birth,
    blood_type,
    national_id,
    emergency_contact_name,
    emergency_contact_phone,
  } = validation.data

  const admin = createAdminClient()

  // Update profiles table
  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name_ar, phone })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  // Update patients table
  const { error: patientError } = await admin
    .from('patients')
    .update({
      date_of_birth,
      blood_type: blood_type || null,
      national_id: national_id || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
    })
    .eq('id', user.id)

  if (patientError) return { error: patientError.message }

  revalidatePath('/patient/dashboard')

  return { success: true }
}

/**
 * Fetch the current patient's own profile data.
 */
export async function getMyPatientProfile(): Promise<{
  data?: {
    full_name_ar: string
    phone: string
    date_of_birth: string
    blood_type: string | null
    national_id: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
  }
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name_ar, phone')
    .eq('id', user.id)
    .single() as { data: { full_name_ar: string; phone: string } | null }

  const { data: patient } = await supabase
    .from('patients')
    .select('date_of_birth, blood_type, national_id, emergency_contact_name, emergency_contact_phone')
    .eq('id', user.id)
    .single() as {
      data: {
        date_of_birth: string
        blood_type: string | null
        national_id: string | null
        emergency_contact_name: string | null
        emergency_contact_phone: string | null
      } | null
    }

  if (!profile || !patient) return { error: 'لم يتم العثور على البيانات' }

  return {
    data: {
      full_name_ar: profile.full_name_ar,
      phone: profile.phone,
      date_of_birth: patient.date_of_birth,
      blood_type: patient.blood_type,
      national_id: patient.national_id,
      emergency_contact_name: patient.emergency_contact_name,
      emergency_contact_phone: patient.emergency_contact_phone,
    },
  }
}
