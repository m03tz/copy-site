'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pill, FolderOpen, FlaskConical, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrescriptionList } from '@/components/prescriptions/prescription-list'
import { FileUpload } from '@/components/files/file-upload'
import { FileList } from '@/components/files/file-list'
import { LabTestList } from '@/components/lab-tests/lab-test-list'
import { generateClinicHeader, generateStyles } from '@/components/patients/print-report-button'
import type { LabTest } from '@/lib/actions/lab-tests'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabMode = 'prescriptions' | 'files' | 'lab'

interface VisitWithPrescriptions {
  id: string
  visit_date: string
  prescriptions: {
    id: string
    medical_record_id: string
    medication_name: string
    dosage: string
    duration: string
    instructions?: string | null
    quantity?: string | null
  }[]
}

interface FileRow {
  id: string
  file_name: string
  file_type: string
  file_path: string
  description: string | null
  medical_record_id: string | null
  created_at: string
}

interface MedicalFilesTabProps {
  patientId: string
  patientName: string
  visits: VisitWithPrescriptions[]
  files: FileRow[]
  labTests: LabTest[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MedicalFilesTab({
  patientId,
  patientName,
  visits,
  files,
  labTests,
}: MedicalFilesTabProps) {
  const t = useTranslations('medicalFiles')
  const [mode, setMode] = useState<TabMode>('prescriptions')

  function handlePrintPrescriptions() {
    const visitsWithRx = visits.filter((v) => v.prescriptions.length > 0)

    const rows = visitsWithRx
      .map(
        (v) => `
      <tr>
        <td>${v.visit_date}</td>
        <td>
          ${v.prescriptions
            .map(
              (p) =>
                `<div style="margin-bottom:4px"><strong>${p.medication_name}</strong> — ${p.dosage} — ${p.duration}${p.instructions ? ` (${p.instructions})` : ''}</div>`
            )
            .join('')}
        </td>
      </tr>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${t('prescriptionsTitle')} - ${patientName}</title>
  <style>
    ${generateStyles()}
    body { direction: rtl; }
    th { text-align: right; }
  </style>
</head>
<body>
  ${generateClinicHeader('ar', window.location.origin)}
  <div class="section">
    <h2>${t('prescriptionsTitle')} — ${patientName}</h2>
    ${
      visitsWithRx.length > 0
        ? `<table>
      <thead>
        <tr>
          <th style="width:120px">${t('visitDate')}</th>
          <th>${t('medications')}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
        : `<p style="color:#888;font-size:13px;">${t('noPrescriptions')}</p>`
    }
  </div>
  <div class="footer"><p>${t('generatedBy')}</p></div>
</body>
</html>`

    printInIframe(html, '__print_rx_iframe__')
  }

  function handlePrintFiles() {
    const rows = files
      .map(
        (f) => `
      <tr>
        <td>${f.file_name}</td>
        <td>${f.file_type}</td>
        <td>${new Date(f.created_at).toLocaleDateString('ar')}</td>
        <td>${f.description ?? '—'}</td>
      </tr>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${t('filesTitle')} - ${patientName}</title>
  <style>
    ${generateStyles()}
    body { direction: rtl; }
    th { text-align: right; }
  </style>
</head>
<body>
  ${generateClinicHeader('ar', window.location.origin)}
  <div class="section">
    <h2>${t('filesTitle')} — ${patientName}</h2>
    ${
      files.length > 0
        ? `<table>
      <thead>
        <tr>
          <th>${t('fileName')}</th>
          <th>${t('fileType')}</th>
          <th>${t('fileDate')}</th>
          <th>${t('fileDescription')}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
        : `<p style="color:#888;font-size:13px;">${t('noFiles')}</p>`
    }
  </div>
  <div class="footer"><p>${t('generatedBy')}</p></div>
</body>
</html>`

    printInIframe(html, '__print_files_iframe__')
  }

  return (
    <div className="space-y-6">
      {/* ── Toggle + Print ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-1 w-fit">
          <Button
            variant={mode === 'prescriptions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('prescriptions')}
            className="gap-2"
          >
            <Pill className="h-4 w-4" />
            {t('prescriptions')}
          </Button>
          <Button
            variant={mode === 'files' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('files')}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            {t('files')}
          </Button>
          <Button
            variant={mode === 'lab' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('lab')}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            {t('labTests')}
          </Button>
        </div>

        {/* Print button — only for prescriptions and files (lab has its own) */}
        {mode === 'prescriptions' && (
          <Button size="sm" variant="outline" onClick={handlePrintPrescriptions}>
            <Printer className="h-4 w-4 me-1" />
            {t('print')}
          </Button>
        )}
        {mode === 'files' && (
          <Button size="sm" variant="outline" onClick={handlePrintFiles}>
            <Printer className="h-4 w-4 me-1" />
            {t('print')}
          </Button>
        )}
      </div>

      {/* ── Content ── */}
      {mode === 'prescriptions' && (
        <PrescriptionList
          visits={visits}
          patientName={patientName}
          patientId={patientId}
        />
      )}

      {mode === 'files' && (
        <div className="space-y-6">
          <FileUpload
            patientId={patientId}
            visits={visits.map((v) => ({ id: v.id, visit_date: v.visit_date }))}
          />
          <FileList files={files} patientId={patientId} />
        </div>
      )}

      {mode === 'lab' && (
        <LabTestList
          labTests={labTests}
          patientId={patientId}
          patientName={patientName}
        />
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function printInIframe(html: string, iframeId: string) {
  const existing = document.getElementById(iframeId)
  if (existing) existing.remove()

  const iframe = document.createElement('iframe')
  iframe.id = iframeId
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
