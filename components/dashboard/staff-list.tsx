'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { StaffMemberDialog } from '@/components/dashboard/staff-member-dialog'

interface StaffMember {
  id: string
  full_name_ar: string
  full_name_en: string | null
  role: string
  email: string | null
  phone: string
}

interface StaffListProps {
  members: StaffMember[]
}

export function StaffList({ members }: StaffListProps) {
  const t = useTranslations('dashboard')
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('noStaff')}</p>
  }

  return (
    <>
      <div className="divide-y">
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => setSelectedMember(member)}
            className="flex w-full items-center justify-between py-3 first:pt-0 last:pb-0 text-start hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {member.full_name_ar || member.full_name_en}
              </p>
              <p className="text-xs text-muted-foreground">
                {member.email || member.phone}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground shrink-0 ms-2">
              {member.role === 'doctor' ? t('roleDoctor') : t('roleSecretary')}
            </span>
          </button>
        ))}
      </div>

      {selectedMember && (
        <StaffMemberDialog
          member={selectedMember}
          open={!!selectedMember}
          onOpenChange={(open) => { if (!open) setSelectedMember(null) }}
        />
      )}
    </>
  )
}
