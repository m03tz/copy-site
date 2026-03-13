'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, CheckCircle } from 'lucide-react'
import { createStaffMember } from '@/lib/actions/users'

export function AddStaffButton() {
  const t = useTranslations('dashboard')
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [role, setRole] = useState<string>('secretary')

  function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)
    formData.set('role', role)

    startTransition(async () => {
      const result = await createStaffMember(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
        }, 1500)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); setSuccess(false) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 me-1" />
          {t('addStaff')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('addStaff')}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">{t('staffCreated')}</p>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            {/* Role */}
            <div className="space-y-1">
              <Label>{t('staffRole')}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="secretary">{t('roleSecretary')}</SelectItem>
                  <SelectItem value="doctor">{t('roleDoctor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Full Name Arabic */}
            <div className="space-y-1">
              <Label htmlFor="staff_name_ar">{t('staffNameAr')}</Label>
              <Input id="staff_name_ar" name="full_name_ar" required />
            </div>

            {/* Full Name English */}
            <div className="space-y-1">
              <Label htmlFor="staff_name_en">{t('staffNameEn')}</Label>
              <Input id="staff_name_en" name="full_name_en" dir="ltr" />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="staff_email">{t('staffEmail')}</Label>
              <Input id="staff_email" name="email" type="email" dir="ltr" required />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="staff_phone">{t('staffPhone')}</Label>
              <Input id="staff_phone" name="phone" dir="ltr" required />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="staff_password">{t('staffPassword')}</Label>
              <Input id="staff_password" name="password" type="password" dir="ltr" required minLength={6} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? '...' : t('addStaff')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
