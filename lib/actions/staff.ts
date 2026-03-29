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

  // Reassign NOT-NULL doctor_id columns to the current doctor before deleting.
  // ON DELETE SET NULL won't work if the column is still NOT NULL.
  const tablesWithNotNullDoctorId = [
    'medical_records',
    'prescriptions',
    'pregnancies',
    'infertility_records',
  ]
  for (const table of tablesWithNotNullDoctorId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: reassignErr } = await (adminClient as any)
      .from(table)
      .update({ doctor_id: user.id })
      .eq('doctor_id', memberId)
    if (reassignErr) return { error: `Failed to reassign ${table}: ${reassignErr.message}` }
  }

  // Nullify nullable FK columns that reference profiles
  const nullableSteps: Array<{ table: string; column: string }> = [
    { table: 'appointments', column: 'doctor_id' },
    { table: 'appointments', column: 'created_by' },
    { table: 'patient_files', column: 'uploaded_by' },
    { table: 'invoices', column: 'doctor_id' },
    { table: 'lab_tests', column: 'created_by' },
    { table: 'external_costs', column: 'doctor_id' },
    { table: 'operations', column: 'doctor_id' },
  ]
  for (const step of nullableSteps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: nullErr } = await (adminClient as any)
      .from(step.table)
      .update({ [step.column]: null })
      .eq(step.column, memberId)
    if (nullErr) return { error: `Failed to nullify ${step.table}.${step.column}: ${nullErr.message}` }
  }

  // Delete auth user — cascades to profiles
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(memberId)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/doctor/dashboard')
  return { success: true }
}
