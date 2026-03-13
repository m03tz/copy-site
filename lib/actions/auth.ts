'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Actual profile schema from SQL migration (database types are outdated)
type Profile = {
  id: string
  role: 'patient' | 'doctor' | 'secretary'
  full_name_ar: string
  full_name_en: string | null
  phone: string
  email: string | null
  created_at: string
  updated_at: string
}

export async function getEmailByPhone(phone: string): Promise<string | null> {
  // Must use admin client to bypass RLS since user is not authenticated yet
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  // Try multiple phone formats to match what's stored in DB
  const phonesToTry = [phone]
  if (phone.startsWith('+962')) {
    phonesToTry.push('0' + phone.slice(4)) // +962786... → 0786...
    phonesToTry.push(phone.slice(1))        // +962786... → 962786...
  }

  const { data } = await admin
    .from('profiles')
    .select('id')
    .in('phone', phonesToTry)
    .limit(1)
    .single()

  if (!data?.id) return null

  // Always read email from auth.users — it is the source of truth for login.
  // profiles.email can become stale if it was updated without syncing auth.
  const { data: authUser } = await admin.auth.admin.getUserById(data.id)
  return authUser?.user?.email ?? null
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getAuthenticatedUser(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile || null
}
