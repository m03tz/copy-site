'use server'

export async function patientLoginByFileNo(
  fileNo: string
): Promise<{ token_hash: string } | { error: string }> {
  if (!fileNo.trim()) return { error: 'invalidFileNumber' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { data: patientData } = await admin
    .from('patients')
    .select('id')
    .eq('patient_code', fileNo.trim())
    .limit(1)
    .single()

  if (!patientData?.id) return { error: 'invalidCredentials' }

  const { data: authUser } = await admin.auth.admin.getUserById(patientData.id)
  const email = authUser?.user?.email
  if (!email) return { error: 'invalidCredentials' }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    return { error: 'loginFailed' }
  }

  return { token_hash: linkData.properties.hashed_token }
}
