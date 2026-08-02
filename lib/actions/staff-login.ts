'use server'

import { createClient } from '@/lib/supabase/server'

export async function staffLoginByEmail(
  identifier: string,
  password: string
): Promise<{ role: string } | { error: string }> {
  if (!identifier.trim()) return { error: 'invalidCredentials' }

  let email = identifier.trim()

  // If no @ — treat as username prefix and look up the full email
  if (!email.includes('@')) {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .ilike('email', `${email}@%`)
      .limit(1)
      .single()
    if (!profile?.email) return { error: 'invalidCredentials' }
    email = profile.email
  }

  const supabase = await createClient()
  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError || !data.user) return { error: 'invalidCredentials' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single<{ role: string }>()

  if (profileError || !profile) return { error: 'loginFailed' }

  return { role: profile.role }
}

export { staffLoginByEmail as staffLoginByPhone }
