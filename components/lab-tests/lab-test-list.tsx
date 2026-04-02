'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FlaskConical, Plus, Trash2, Printer, FileX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { LabTestForm } from '@/components/lab-tests/lab-test-form'
import { deleteLabTest } from '@/lib/actions/lab-tests'
import type { LabTest } from '@/lib/actions/lab-tests'
import { generateClinicHeader, generateStyles } from '@/components/patients/print-report-button'
import {
  LAB_SECTIONS,
  REF,
  FIELD_LABELS,
  getStatus,
  parseStructuredResult,
} from '@/lib/lab-test-config'

interface LabTestListProps {
  labTests: LabTest[]
  patientId: string
  patientName: string
}

const TYPE_COLORS: Record<string, string> = {
  CBC:        'bg-red-100 text-red-700',
  urine:      'bg-yellow-100 text-yellow-700',
  LFT:        'bg-green-100 text-green-700',
  KFT:        'bg-blue-100 text-blue-700',
  structured: 'bg-violet-100 text-violet-700',
  other:      'bg-gray-100 text-gray-700',
}

const STATUS_COLORS: Record<string, string> = {
  normal: 'text-green-600',
  high:   'text-red-600',
  low:    'text-blue-600',
}
const STATUS_ICON: Record<string, string> = {
  normal: '✓',
  high:   '▲',
  low:    '▼',
}
const STATUS_LABEL: Record<string, string> = {
  normal: 'Normal',
  high:   'High',
  low:    'Low',
}

// ─── Print helper: generate HTML block for one structured test ────────────────
function buildStructuredPrintBlock(lt: LabTest, data: Record<string, string>, t: ReturnType<typeof useTranslations<'labTests'>>): string {
  const sectionHtml = LAB_SECTIONS.map(section => {
    const filledFields = section.fields.filter(f => data[f.key])
    if (filledFields.length === 0) return ''

    const rows = filledFields.map(field => {
      const value = data[field.key]
      const status = getStatus(field.key, value)
      const ref = REF[field.key]
      const color = status ? { normal: '#166534', high: '#dc2626', low: '#1d4ed8' }[status] : '#222'
      const icon  = status ? STATUS_ICON[status] : ''
      const label = status ? STATUS_LABEL[status] : '—'
      const bold  = status && status !== 'normal' ? 'font-weight:bold;' : ''
      return `
        <tr>
          <td>${FIELD_LABELS[field.key]}</td>
          <td style="color:${color};${bold}">${value}${icon ? ' ' + icon : ''}</td>
          <td style="color:#666;font-size:18px;">${ref?.hint ?? '—'}</td>
          <td style="color:${color};${bold}">${label}</td>
        </tr>`
    }).join('')

    return `
      <div style="margin-bottom:16px;">
        <p style="font-size:18px;font-weight:600;color:#444;margin-bottom:6px;">${section.icon} ${section.label}</p>
        <table>
          <thead>
            <tr>
              <th>${t('colTest')}</th>
              <th>${t('colResult')}</th>
              <th>${t('colReference')}</th>
              <th>${t('colStatus')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }).join('')

  const notesHtml = lt.doctor_notes
    ? `<div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;font-size:18px;">
        <strong>${t('doctorNotes')}:</strong> ${lt.doctor_notes}
       </div>`
    : ''

  return `
    <div style="margin-bottom:32px;page-break-inside:avoid;">
      <h3 style="font-size:18px;color:#0d7377;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:14px;">
        ${lt.test_name} — ${lt.test_date}
      </h3>
      ${sectionHtml}
      ${notesHtml}
    </div>`
}

// ─── Structured result card view ─────────────────────────────────────────────
function StructuredResultView({ data }: { data: Record<string, string> }) {
  return (
    <div className="space-y-3 mt-2">
      {LAB_SECTIONS.map(section => {
        const filledFields = section.fields.filter(f => data[f.key])
        if (filledFields.length === 0) return null
        return (
          <div key={section.key}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {section.icon} {section.label}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {filledFields.map(field => {
                const value = data[field.key]
                const status = getStatus(field.key, value)
                return (
                  <div key={field.key} className="flex items-center justify-between text-xs gap-2 py-0.5">
                    <span className="text-muted-foreground truncate">{FIELD_LABELS[field.key]}</span>
                    <span className={`font-medium shrink-0 ${status ? STATUS_COLORS[status] : ''}`}>
                      {value}
                      {status && (
                        <span className="ms-0.5 text-[10px]">{STATUS_ICON[status]}</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LabTestList({ labTests, patientId, patientName }: LabTestListProps) {
  const t = useTranslations('labTests')
  const [addOpen, setAddOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteLabTest(id)
    setDeletingId(null)
  }

  function handlePrint() {
    const structuredBlocks: string[] = []
    const oldFormatTests: LabTest[] = []

    for (const lt of labTests) {
      if (lt.test_type === 'structured') {
        const data = parseStructuredResult(lt.result)
        if (data) {
          structuredBlocks.push(buildStructuredPrintBlock(lt, data, t))
          continue
        }
      }
      oldFormatTests.push(lt)
    }

    const oldTableHtml = oldFormatTests.length > 0
      ? `<table>
          <thead>
            <tr>
              <th>${t('testDate')}</th>
              <th>${t('testName')}</th>
              <th>${t('result')}</th>
              <th>${t('referenceValues')}</th>
              <th>${t('doctorNotes')}</th>
            </tr>
          </thead>
          <tbody>
            ${oldFormatTests.map(lt => `
              <tr>
                <td>${lt.test_date}</td>
                <td>${lt.test_name}</td>
                <td>${lt.result ?? '—'}</td>
                <td>${lt.reference_values ?? '—'}</td>
                <td>${lt.doctor_notes ?? '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>`
      : ''

    const contentHtml = labTests.length === 0
      ? `<p style="color:#888;font-size:18px;">${t('empty')}</p>`
      : structuredBlocks.join('') + oldTableHtml

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${t('printTitle')} - ${patientName}</title>
  <style>
    ${generateStyles()}
    body { direction: rtl; }
    th { text-align: right; }
    h3 { direction: ltr; text-align: left; }
  </style>
</head>
<body>
  ${generateClinicHeader('ar', window.location.origin)}
  <div class="section">
    <h2>${t('printTitle')} — ${patientName}</h2>
    ${contentHtml}
  </div>
  <div class="footer"><p>${t('generatedBy')}</p></div>
</body>
</html>`

    const existing = document.getElementById('__print_lab_iframe__')
    if (existing) existing.remove()
    const iframe = document.createElement('iframe')
    iframe.id = '__print_lab_iframe__'
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:0;opacity:0;'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    iframe.onload = () => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => iframe.remove(), 1000)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 me-1" />
              {t('print')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 me-1" />
              {t('add')}
            </Button>
          </div>
        </div>

        {labTests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <FileX className="h-10 w-10 opacity-40" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {labTests.map((lt) => {
              const parsedData = lt.test_type === 'structured'
                ? parseStructuredResult(lt.result)
                : null

              return (
                <div
                  key={lt.id}
                  className="rounded-lg border bg-card p-4 space-y-2"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm">{lt.test_name}</span>
                      {lt.test_type !== 'structured' && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[lt.test_type] ?? TYPE_COLORS.other}`}
                        >
                          {lt.test_type}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {lt.test_date}
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(lt.id)}
                      disabled={deletingId === lt.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Structured result view */}
                  {parsedData ? (
                    <StructuredResultView data={parsedData} />
                  ) : (
                    /* Legacy plain-text result */
                    lt.result && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t('result')}: </span>
                        <span className="whitespace-pre-wrap">{lt.result}</span>
                        {lt.reference_values && (
                          <span className="text-muted-foreground ms-2">
                            ({t('referenceValues')}: {lt.reference_values})
                          </span>
                        )}
                      </div>
                    )
                  )}

                  {lt.doctor_notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t('doctorNotes')}: </span>
                      <span className="italic">{lt.doctor_notes}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('add')}</DialogTitle>
          </DialogHeader>
          <LabTestForm
            patientId={patientId}
            onSuccess={() => setAddOpen(false)}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
