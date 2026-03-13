'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Update staff member (doctor/secretary) profile info.
 * Only doctor can edit staff profiles.
 */
export async function updateStaffInfo(data: {
  userId: string
  full_name_ar: string
  full_name_en: string | null
  phone: string
  email: string | null
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Only doctor can edit staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctor can edit staff members' }
  }

  const adminClient = createAdminClient()

  // Update profile record
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({
      full_name_ar: data.full_name_ar,
      full_name_en: data.full_name_en,
      phone: data.phone,
      email: data.email,
    })
    .eq('id', data.userId)

  if (updateError) return { error: updateError.message }

  // Sync email in auth.users so login still works after an email change.
  // email_confirm: true bypasses email verification so the change is immediate.
  if (data.email) {
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
      data.userId,
      { email: data.email, email_confirm: true }
    )
    if (authUpdateError) return { error: authUpdateError.message }
  }

  revalidatePath('/doctor/dashboard')
  return { success: true }
}

/**
 * Delete a staff member (doctor/secretary).
 * Only doctor can delete staff. Cannot delete yourself.
 */
export async function deleteStaffMember(
  memberId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Only doctor can delete staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only doctor can delete staff members' }
  }

  // Prevent deleting yourself
  if (memberId === user.id) {
    return { error: 'Cannot delete your own account' }
  }

  const adminClient = createAdminClient()

  // Delete auth user — cascades to profiles
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(memberId)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/doctor/dashboard')
  return { success: true }
}
