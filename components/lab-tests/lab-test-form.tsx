'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { FlaskConical } from 'lucide-react'
import { addLabTest } from '@/lib/actions/lab-tests'
import { LAB_SECTIONS, REF, FIELD_LABELS } from '@/lib/lab-test-config'

interface LabTestFormProps {
  patientId: string
  onSuccess: () => void
  onCancel: () => void
}

const SECTION_LABEL_KEYS: Record<string, string> = {
  cbc:      'sectionCBC',
  urine:    'sectionUrine',
  lft:      'sectionLFT',
  kft:      'sectionKFT',
  hormones: 'sectionBloodSugar',
  lipid:    'sectionLipid',
}

const SECTION_SHORT: Record<string, string> = {
  cbc:      'CBC',
  urine:    'UA',
  lft:      'LFT',
  kft:      'KFT',
  hormones: 'Hormones',
  lipid:    'Lipid',
}

export function LabTestForm({ patientId, onSuccess, onCancel }: LabTestFormProps) {
  const t = useTranslations('labTests')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0])
  const [fields, setFields] = useState<Record<string, string>>({})

  const handleChange = (key: string, value: string) =>
    setFields(prev => ({ ...prev, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Collect non-empty lab field values
    const data: Record<string, string> = {}
    for (const section of LAB_SECTIONS) {
      for (const field of section.fields) {
        const v = fields[field.key]?.trim()
        if (v) data[field.key] = v
      }
    }

    // Auto-generate test name from sections that have data
    const filledSections = LAB_SECTIONS
      .filter(s => s.fields.some(f => data[f.key]))
      .map(s => SECTION_SHORT[s.key] ?? s.key.toUpperCase())
    const testName = filledSections.length > 0 ? filledSections.join(' + ') : 'Lab Test'

    const res = await addLabTest({
      patient_id: patientId,
      test_type: 'structured',
      test_name: testName,
      result: JSON.stringify(data),
      doctor_notes: fields.doctor_notes?.trim() || undefined,
      test_date: testDate,
    })

    setLoading(false)
    if (res.error) setError(res.error)
    else onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Date ── */}
      <div className="space-y-1 max-w-[220px]">
        <Label htmlFor="test_date">{t('testDate')}</Label>
        <DatePickerInput
          id="test_date"
          value={testDate}
          onChange={(v) => setTestDate(v)}
          required
        />
      </div>

      {/* ── Lab Sections ── */}
      {LAB_SECTIONS.map((section, idx) => (
        <div key={section.key} className="space-y-3">
          {idx > 0 && <Separator />}
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5 pt-1">
            <FlaskConical className="h-3 w-3 shrink-0" />
            {section.icon} {t(SECTION_LABEL_KEYS[section.key])}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map(field => {
              const ref = REF[field.key]
              return (
                <div key={field.key} className="space-y-1">
                  <Label className="text-sm font-medium">{FIELD_LABELS[field.key]}</Label>
                  <Input
                    type={field.inputType}
                    step={field.inputType === 'number' ? 'any' : undefined}
                    min={field.inputType === 'number' ? 0 : undefined}
                    placeholder={field.placeholder}
                    value={fields[field.key] ?? ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                  />
                  {ref && (
                    <p className="text-[11px] text-muted-foreground leading-tight">{ref.hint}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <Separator />

      {/* ── Doctor Notes ── */}
      <div className="space-y-1">
        <Label htmlFor="doctor_notes">{t('doctorNotes')}</Label>
        <Textarea
          id="doctor_notes"
          rows={2}
          placeholder={t('doctorNotesPlaceholder')}
          value={fields.doctor_notes ?? ''}
          onChange={e => handleChange('doctor_notes', e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  )
}
