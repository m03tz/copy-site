'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { normalizePhone } from '@/lib/utils/phone'
import { getEmailByPhone } from '@/lib/actions/auth'
import { staffLoginByPhone } from '@/lib/actions/staff-login'
import { LanguageToggle } from '@/components/language-toggle'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'

type Tab = 'patient' | 'staff'

export default function LoginPage() {
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('patient')

  // Patient login state
  const [phone, setPhone] = useState('')
  const [patientError, setPatientError] = useState('')
  const [patientLoading, setPatientLoading] = useState(false)

  // Staff login state
  const [staffPhone, setStaffPhone] = useState('')
  const [password, setPassword] = useState('')
  const [staffError, setStaffError] = useState('')
  const [staffLoading, setStaffLoading] = useState(false)

  // ── Patient login (phone only) ──────────────────────────────────────────
  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPatientError('')
    setPatientLoading(true)

    try {
      const supabase = createClient()
      const normalizedPhone = normalizePhone(phone.trim())

      if (!normalizedPhone) {
        setPatientError(t('invalidPhone'))
        setPatientLoading(false)
        return
      }

      const foundEmail = await getEmailByPhone(normalizedPhone)
      if (!foundEmail) {
        setPatientError(t('invalidCredentials'))
        setPatientLoading(false)
        return
      }

      // Default patient password = last 8 digits of phone
      const defaultPassword = normalizedPhone.replace(/[^0-9]/g, '').slice(-8)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: foundEmail,
        password: defaultPassword,
      })

      if (signInError) {
        setPatientError(t('invalidCredentials'))
        setPatientLoading(false)
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single<{ role: string }>()

        if (profile?.role === 'patient') {
          router.push('/patient/dashboard')
        } else {
          setPatientError(t('invalidCredentials'))
        }
      }
    } catch {
      setPatientError(t('loginFailed'))
    } finally {
      setPatientLoading(false)
    }
  }

  // ── Staff login (phone + password) ──────────────────────────────────────
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStaffError('')
    setStaffLoading(true)

    try {
      const result = await staffLoginByPhone(staffPhone.trim(), password)

      if ('error' in result) {
        setStaffError(t(result.error))
        return
      }

      router.push(`/${result.role}/dashboard`)
    } catch {
      setStaffError(t('loginFailed'))
    } finally {
      setStaffLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t('loginTitle')}</h1>
            <LanguageToggle />
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              type="button"
              onClick={() => setTab('patient')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'patient'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {t('patientTab')}
            </button>
            <button
              type="button"
              onClick={() => setTab('staff')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'staff'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {t('staffTab')}
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {/* ── Patient Tab ── */}
          {tab === 'patient' && (
            <form onSubmit={handlePatientLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient-phone">{t('phoneNumber')}</Label>
                <Input
                  id="patient-phone"
                  type="tel"
                  dir="ltr"
                  placeholder={t('phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={patientLoading}
                />
              </div>

              {patientError && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {patientError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={patientLoading}>
                {patientLoading ? tc('loading') : t('login')}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('noAccount')}{' '}
                <Link href="/register" className="text-primary underline">
                  {t('createAccount')}
                </Link>
              </p>
            </form>
          )}

          {/* ── Staff Tab ── */}
          {tab === 'staff' && (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staff-phone">{t('phoneNumber')}</Label>
                <Input
                  id="staff-phone"
                  type="tel"
                  dir="ltr"
                  placeholder={t('phonePlaceholder')}
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  required
                  disabled={staffLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password">{t('password')}</Label>
                <Input
                  id="staff-password"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={staffLoading}
                />
              </div>

              {staffError && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {staffError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={staffLoading}>
                {staffLoading ? tc('loading') : t('login')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
