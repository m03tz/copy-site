'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { registerPatient } from '@/lib/actions/patient-register'
import { createClient } from '@/lib/supabase/client'
import { normalizePhone } from '@/lib/utils/phone'
import { LanguageToggle } from '@/components/language-toggle'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData()
    formData.set('full_name_ar', fullName)
    formData.set('phone', phone)
    formData.set('date_of_birth', dateOfBirth)

    const result = await registerPatient(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Auto-login after registration
    const normalizedPhone = normalizePhone(phone.trim())
    if (normalizedPhone) {
      const authEmail = `${normalizedPhone.replace(/[^0-9]/g, '')}@patient.local`
      const authPassword = normalizedPhone.replace(/[^0-9]/g, '').slice(-8)

      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      })

      if (!signInError && data.user) {
        router.push('/patient/dashboard')
        return
      }
    }

    // Fallback: redirect to login
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t('registerTitle')}</h1>
            <LanguageToggle />
          </div>
          <p className="text-sm text-muted-foreground">{t('registerSubtitle')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('fullNameAr')}</Label>
              <Input
                id="fullName"
                type="text"
                dir="rtl"
                placeholder={t('fullNamePlaceholder')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">{t('fullNameHint')}</p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phoneNumber')}</Label>
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                placeholder={t('phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Date of birth */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">{t('dateOfBirth')}</Label>
              <DatePickerInput
                id="dateOfBirth"
                value={dateOfBirth}
                onChange={(v) => setDateOfBirth(v)}
                required
                disabled={loading}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : t('register')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('haveAccount')}{' '}
              <a href="../login" className="text-primary underline">
                {t('login')}
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
