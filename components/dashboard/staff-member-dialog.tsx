'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react'
import { changeUserPassword } from '@/lib/actions/patients'
import { updateStaffInfo, deleteStaffMember } from '@/lib/actions/staff'

interface StaffMember {
  id: string
  full_name_ar: string
  full_name_en: string | null
  role: string
  email: string | null
  phone: string
}

interface StaffMemberDialogProps {
  member: StaffMember
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StaffMemberDialog({ member, open, onOpenChange }: StaffMemberDialogProps) {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const router = useRouter()

  const [isEditing, setIsEditing] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Edit fields
  const [nameAr, setNameAr] = useState(member.full_name_ar)
  const [nameEn, setNameEn] = useState(member.full_name_en ?? '')
  const [phone, setPhone] = useState(member.phone)

  // Password
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordPending, setPasswordPending] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePending, setDeletePending] = useState(false)

  const handleSave = async () => {
    setIsPending(true)
    setMessage(null)
    const result = await updateStaffInfo({
      userId: member.id,
      full_name_ar: nameAr,
      full_name_en: nameEn || null,
      phone,
      email: null,
    })
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: t('staffUpdated') })
      setIsEditing(false)
    }
    setIsPending(false)
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: t('passwordMinLength') })
      return
    }
    setPasswordPending(true)
    setPasswordMessage(null)
    const result = await changeUserPassword(member.id, newPassword)
    if (result.error) {
      setPasswordMessage({ type: 'error', text: result.error })
    } else {
      setPasswordMessage({ type: 'success', text: t('passwordChanged') })
      setNewPassword('')
    }
    setPasswordPending(false)
  }

  const handleDelete = async () => {
    setDeletePending(true)
    const result = await deleteStaffMember(member.id)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
      setDeletePending(false)
      setShowDeleteConfirm(false)
    } else {
      onOpenChange(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member.full_name_ar}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info section */}
          {!isEditing ? (
            <div className="space-y-3">
              <InfoRow label={t('staffNameAr')} value={member.full_name_ar} />
              {member.full_name_en && <InfoRow label={t('staffNameEn')} value={member.full_name_en} />}
              <InfoRow label={t('staffPhone')} value={member.phone} dir="ltr" />
              <InfoRow label={t('staffRole')} value={member.role === 'doctor' ? t('roleDoctor') : t('roleSecretary')} />

              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                {tCommon('edit')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t('staffNameAr')}</Label>
                <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" required />
              </div>
              <div className="space-y-1">
                <Label>{t('staffNameEn')}</Label>
                <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label>{t('staffPhone')}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" required />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={isPending}>
                  {isPending ? '...' : tCommon('save')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setIsEditing(false)
                  setNameAr(member.full_name_ar)
                  setNameEn(member.full_name_en ?? '')
                  setPhone(member.phone)
                }}>
                  {tCommon('cancel')}
                </Button>
              </div>
            </div>
          )}

          {message && (
            <p className={message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-destructive'}>
              {message.text}
            </p>
          )}

          {/* Password change */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {t('changePassword')}
            </h3>
            <div className="flex items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('newPassword')}
                  dir="ltr"
                  className="pe-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                size="sm"
                onClick={handlePasswordChange}
                disabled={passwordPending || !newPassword}
              >
                {passwordPending ? '...' : tCommon('save')}
              </Button>
            </div>
            {passwordMessage && (
              <p className={passwordMessage.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-destructive'}>
                {passwordMessage.text}
              </p>
            )}
          </div>

          {/* Delete */}
          <div className="border-t pt-4">
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 me-1" />
                {t('deleteStaff')}
              </Button>
            ) : (
              <div className="space-y-2 rounded-md border border-destructive p-3">
                <p className="text-sm text-destructive font-medium">{t('deleteStaffConfirm')}</p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deletePending}
                  >
                    {deletePending ? '...' : tCommon('confirm')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    {tCommon('cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm" dir={dir}>{value}</p>
    </div>
  )
}
