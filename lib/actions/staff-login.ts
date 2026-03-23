'use server'

import { createClient } from '@/lib/supabase/server'

export async function staffLoginByPhone(
  phone: string,
  password: string
): Promise<{ role: string } | { error: string }> {
  if (!phone.trim()) return { error: 'invalidPhone' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  // Try multiple phone formats to match what's stored in DB
  const phonesToTry = [phone]
  if (phone.startsWith('+962')) {
    phonesToTry.push('0' + phone.slice(4))
    phonesToTry.push(phone.slice(1))
  }

  const { data: profileData } = await admin
    .from('profiles')
    .select('id')
    .in('phone', phonesToTry)
    .limit(1)
    .single()

  if (!profileData?.id) return { error: 'invalidCredentials' }

  const { data: authUser } = await admin.auth.admin.getUserById(profileData.id)
  const email = authUser?.user?.email
  if (!email) return { error: 'invalidCredentials' }

  const supabase = await createClient()
  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError || !data.user) return { error: 'invalidCredentials' }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single<{ role: string }>()

  if (profileError || !profile) return { error: 'loginFailed' }

  return { role: profile.role }
}
