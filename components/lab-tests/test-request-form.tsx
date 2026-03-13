'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Printer, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getClinicHeaderHtml, getClinicHeaderStyles } from '@/lib/print-utils'

interface TestRequest {
  id: string
  name: string
  instructions: string
}

interface TestRequestFormProps {
  patientName: string
}

let _nextId = 1

function makeId() {
  return String(_nextId++)
}

export function TestRequestForm({ patientName }: TestRequestFormProps) {
  const t = useTranslations('labTests')
  const today = new Date().toLocaleDateString('en-CA')

  const [tests, setTests] = useState<TestRequest[]>([
    { id: makeId(), name: '', instructions: '' },
  ])

  function addTest() {
    setTests((prev) => [...prev, { id: makeId(), name: '', instructions: '' }])
  }

  function removeTest(id: string) {
    setTests((prev) => prev.filter((t) => t.id !== id))
  }

  function updateTest(id: string, field: 'name' | 'instructions', value: string) {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  function handlePrint() {
    const rows = tests
      .filter((t) => t.name.trim())
      .map(
        (t, i) => `
        <tr>
          <td style="width:30px;text-align:center;font-weight:bold;">${i + 1}</td>
          <td style="font-weight:600;">${t.name}</td>
          <td style="color:#555;">${t.instructions || '—'}</td>
        </tr>`
      )
      .join('')

    if (!rows) return

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>طلب فحص — ${patientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 1.5cm 1cm; color: #111; font-size: 13px; direction: rtl; }
    ${getClinicHeaderStyles()}
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; padding: 8px 10px; text-align: right; font-size: 11px; font-weight: 600; border: 1px solid #ddd; }
    td { padding: 8px 10px; border: 1px solid #ddd; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #888; }
    @media print { body { padding: 10px; } }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>
  ${getClinicHeaderHtml()}

  <!-- Document title -->
  <div style="text-align:center;margin-bottom:16px;">
    <h2 style="font-size:15px;color:#333;margin:0;">${t('printDocTitle')}</h2>
  </div>

  <!-- Patient info row above table -->
  <div style="display:flex;justify-content:space-between;background:#f8f9fa;border:1px solid #e9ecef;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;">
    <div><strong>${t('printPatient')}: </strong>${patientName}</div>
    <div><strong>${t('printDate')}: </strong>${today}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th>${t('printColTest')}</th>
        <th>${t('printColInstructions')}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <span>${t('printSignature')}: _______________</span>
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  const filledTests = tests.filter((t) => t.name.trim())

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            {t('requestTitle')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('requestDescription')}
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handlePrint}
          disabled={filledTests.length === 0}
        >
          <Printer className="h-4 w-4 me-1" />
          {t('printRequest')}
        </Button>
      </div>

      <div className="space-y-3">
        {tests.map((test, index) => (
          <div key={test.id} className="rounded-lg border p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t('testLabel')}{index + 1}</span>
              {tests.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeTest(test.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
            <Input
              value={test.name}
              onChange={(e) => updateTest(test.id, 'name', e.target.value)}
              placeholder={t('testNamePlaceholderRequest')}
              className="h-8"
            />
            <Textarea
              value={test.instructions}
              onChange={(e) => updateTest(test.id, 'instructions', e.target.value)}
              placeholder={t('testInstructionsPlaceholder')}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addTest}>
        <Plus className="h-4 w-4 me-1" />
        {t('addAnotherTest')}
      </Button>
    </div>
  )
}
