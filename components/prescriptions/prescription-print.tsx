'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { format } from 'date-fns'
import { getClinicHeaderHtml, getClinicHeaderStyles } from '@/lib/print-utils'

// DB field mapping: dosage=frequency, instructions=frequency_type, duration=period
const freqTypeLabels: Record<string, string> = {
  day: 'يومياً',
  week: 'أسبوعياً',
  month: 'شهرياً',
}

interface MedicationRow {
  id: string
  medication_name: string
  dosage: string       // frequency value
  duration: string     // period
  quantity?: string | null
  instructions?: string | null  // frequency_type: day | week | month
}

interface PrescriptionPrintProps {
  patientName: string
  visitDate: string
  medications: MedicationRow[]
  /** Override clinic info (for testing) */
  clinicOverride?: {
    name?: string
    doctorName?: string
    specialty?: string
    phone?: string
    address?: string
  }
}

export function PrescriptionPrint({
  patientName,
  visitDate,
  medications,
  clinicOverride,
}: PrescriptionPrintProps) {
  const t = useTranslations('prescriptions.print')
  const locale = useLocale()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  let formattedDate = visitDate
  try {
    formattedDate = format(new Date(visitDate), 'dd-MM-yyyy')
  } catch {
    // keep original
  }

  const doctorName = clinicOverride?.doctorName ?? t('doctorName')

  function handlePrint() {
    const html = generatePrescriptionHtml({
      patientName,
      formattedDate,
      medications,
      titleLabel: t('title'),
      patientLabel: t('patient'),
      dateLabel: t('date'),
      signatureLabel: t('signature'),
      doctorName,
      dir,
    })

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.addEventListener('load', () => {
        URL.revokeObjectURL(url)
        win.print()
      }, { once: true })
    }
  }

  return (
    <Button onClick={handlePrint} variant="outline" size="sm">
      <Printer className="h-4 w-4 me-1" />
      {t('printButton')}
    </Button>
  )
}

// ─── HTML generator ────────────────────────────────────────────────────────────

function generatePrescriptionHtml(opts: {
  patientName: string
  formattedDate: string
  medications: { id: string; medication_name: string; dosage: string; duration: string; quantity?: string | null; instructions?: string | null }[]
  titleLabel: string
  patientLabel: string
  dateLabel: string
  signatureLabel: string
  doctorName: string
  dir: 'ltr' | 'rtl'
}): string {
  const rows = opts.medications
    .map(
      (med, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f4f7ff'}">
      <td style="${tdStyle}">${i + 1}</td>
      <td style="${tdStyle}">${med.medication_name}</td>
      <td style="${tdStyle};text-align:center">${med.dosage}</td>
      <td style="${tdStyle};text-align:center">${med.quantity ?? '—'}</td>
      <td style="${tdStyle};text-align:center">${med.instructions ?? '—'}</td>
      <td style="${tdStyle};text-align:center">${med.duration}</td>
    </tr>`
    )
    .join('')

  const lang = opts.dir === 'rtl' ? 'ar' : 'en'

  return `<!DOCTYPE html>
<html dir="${opts.dir}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>وصفة طبية</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Tahoma, "Noto Sans Arabic", sans-serif; color: #000; background: #fff; padding: 1.5cm 1cm; }
    @page { size: A4; margin: 0; }
    @media print { body { padding: 1.5cm 1cm; } }
    ${getClinicHeaderStyles()}
  </style>
</head>
<body>
  ${getClinicHeaderHtml(window.location.origin)}

  <div style="display:flex;justify-content:space-between;gap:16px;background:#f8f9fa;padding:10px 16px;border-radius:4px;margin-bottom:20px;font-size:13px;">
    <span><strong>${opts.patientLabel}: </strong>${opts.patientName}</span>
    <span><strong>${opts.dateLabel}: </strong>${opts.formattedDate}</span>
  </div>

  <!-- Medications table -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:40px;">
    <thead>
      <tr style="background:#0d7377;color:#fff;">
        <th style="${thStyle}width:4%">#</th>
        <th style="${thStyle}width:35%">Medication</th>
        <th style="${thStyle}width:15%;text-align:center">Dose</th>
        <th style="${thStyle}width:15%;text-align:center">Amount</th>
        <th style="${thStyle}width:16%;text-align:center">Frequency</th>
        <th style="${thStyle}width:15%;text-align:center">Duration (day)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Signature -->
  <div style="margin-top:60px;text-align:start;">
    <div style="display:inline-block;min-width:200px;border-top:1px solid #000;padding-top:8px;text-align:center;">
      <p style="margin:0;font-size:13px;">${opts.signatureLabel}</p>
      <p style="margin:4px 0 0;font-weight:600;font-size:13px;">${opts.doctorName}</p>
    </div>
  </div>
</body>
</html>`
}

const thStyle = `padding:10px 12px;text-align:start;font-weight:600;font-size:13px;border:1px solid #0d7377;`
const tdStyle = `padding:8px 12px;border:1px solid #ddd;font-size:13px;vertical-align:middle`
