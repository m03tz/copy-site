'use server'

export async function patientLoginByPhone(
  phone: string
): Promise<{ token_hash: string } | { error: string }> {
  if (!phone.trim()) return { error: 'invalidPhone' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  // Try multiple phone formats so both "0777613405" and "+962777613405" work
  const raw = phone.trim()
  const digits = raw.replace(/[^0-9]/g, '')
  const phonesToTry = Array.from(
    new Set([
      raw,
      digits,
      digits.length === 10 && digits.startsWith('0')
        ? `+962${digits.slice(1)}`
        : null,
      digits.length === 9 ? `+962${digits}` : null,
      digits.length === 9 ? `0${digits}` : null,
    ].filter(Boolean) as string[])
  )

  const { data: profileData } = await admin
    .from('profiles')
    .select('id')
    .in('phone', phonesToTry)
    .eq('role', 'patient')
    .limit(1)
    .single()

  if (!profileData?.id) return { error: 'invalidCredentials' }

  const { data: authUser } = await admin.auth.admin.getUserById(profileData.id)
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
