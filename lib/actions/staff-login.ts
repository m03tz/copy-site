'use server'

import { createClient } from '@/lib/supabase/server'

export async function staffLoginByEmail(
  email: string,
  password: string
): Promise<{ role: string } | { error: string }> {
  if (!email.trim()) return { error: 'invalidCredentials' }

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

// Keep old export for backwards compat
export { staffLoginByEmail as staffLoginByPhone }
