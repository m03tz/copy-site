'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Printer } from 'lucide-react'
import { format } from 'date-fns'
import { getClinicHeaderHtml, getClinicHeaderStyles } from '@/lib/print-utils'

interface MedicationRow {
  id: string
  medication_name: string
  dosage: string
  duration: string
  quantity?: string | null
  instructions?: string | null
}

interface PrescriptionPrintProps {
  patientName: string
  visitDate: string
  medications: MedicationRow[]
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
  const [open, setOpen] = useState(false)
  // All unchecked by default
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(medications.map((m) => [m.id, false]))
  )

  let formattedDate = visitDate
  try {
    formattedDate = format(new Date(visitDate), 'dd-MM-yyyy')
  } catch {
    // keep original
  }

  const doctorName = clinicOverride?.doctorName ?? t('doctorName')

  function toggleAll(val: boolean) {
    setChecked(Object.fromEntries(medications.map((m) => [m.id, val])))
  }

  function handlePrint() {
    const selected = medications.filter((m) => checked[m.id])
    if (selected.length === 0) return
    const html = generatePrescriptionHtml({
      patientName,
      formattedDate,
      medications: selected,
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
        setTimeout(() => win.print(), 500)
      }, { once: true })
    }
    setOpen(false)
  }

  const anyChecked = Object.values(checked).some(Boolean)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4 me-1" />
          {t('printButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>اختر الأدوية للطباعة</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Select all / deselect all */}
          <div className="flex gap-3 text-xs text-muted-foreground border-b pb-2">
            <button type="button" className="underline" onClick={() => toggleAll(true)}>
              تحديد الكل
            </button>
            <button type="button" className="underline" onClick={() => toggleAll(false)}>
              إلغاء الكل
            </button>
          </div>
          {/* Medication checkboxes — unchecked by default */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {medications.map((med) => (
              <label
                key={med.id}
                className="flex items-center gap-3 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted text-sm"
              >
                <input
                  type="checkbox"
                  checked={!!checked[med.id]}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [med.id]: e.target.checked }))
                  }
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-primary"
                />
                <span className="flex-1">
                  <span className="font-medium">{med.medication_name}</span>
                  {med.dosage && (
                    <span className="text-muted-foreground ms-2 text-xs">{med.dosage}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={!anyChecked}>
              <Printer className="h-4 w-4 me-1" />
              طباعة المحدد
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const isAr = opts.dir === 'rtl'
  const lang = isAr ? 'ar' : 'en'

  const labels = isAr
    ? { medication: 'الدواء', dose: 'الجرعة', frequency: 'في اليوم', amount: 'الكمية', duration: 'المدة' }
    : { medication: 'Drug', dose: 'Dose', frequency: 'Per/Day', amount: 'Quantity', duration: 'Duration' }

  // Column order matches new prescription: Dose → Frequency → Amount → Duration
  const rows = opts.medications
    .map(
      (med, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f4f7ff'}">
        <td>${i + 1}</td>
        <td>${med.medication_name}</td>
        <td style="text-align:center">${med.dosage}</td>
        <td style="text-align:center">${med.instructions ?? '—'}</td>
        <td style="text-align:center">${med.quantity ?? '—'}</td>
        <td style="text-align:center">${med.duration}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html dir="${opts.dir}" lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${opts.titleLabel} — ${opts.patientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Tahoma, "Noto Sans Arabic", sans-serif; padding: 1.5cm 1cm; color: #111; font-size: 18px; direction: ${opts.dir}; }
    ${getClinicHeaderStyles()}
    .patient-row { display: flex; gap: 16px; background: #f8f9fa; padding: 10px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 18px; }
    .patient-row strong { color: #444; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    thead tr { background: #0d7377; color: #fff; }
    th { padding: 10px 12px; text-align: ${isAr ? 'right' : 'left'}; font-size: 18px; font-weight: 600; }
    td { padding: 9px 12px; border: 1px solid #ddd; font-size: 18px; vertical-align: middle; }
    .sig { margin-top: 60px; }
    .sig-line { display: inline-block; min-width: 200px; border-top: 1px solid #000; padding-top: 8px; text-align: center; font-size: 18px; }
    @media print { body { padding: 10px; } }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>
  ${getClinicHeaderHtml(window.location.origin)}

  <div class="patient-row">
    <span><strong>${opts.patientLabel}: </strong>${opts.patientName}</span>
    <span><strong>${opts.dateLabel}: </strong>${opts.formattedDate}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:4%">#</th>
        <th style="width:35%">${labels.medication}</th>
        <th style="width:15%;text-align:center">${labels.dose}</th>
        <th style="width:16%;text-align:center">${labels.frequency}</th>
        <th style="width:15%;text-align:center">${labels.amount}</th>
        <th style="width:15%;text-align:center">${labels.duration}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="sig">
    <div class="sig-line">
      <p>${opts.signatureLabel}</p>
      <p style="font-weight:600;margin-top:4px">${opts.doctorName}</p>
    </div>
  </div>
</body>
</html>`
}
