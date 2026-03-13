'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { format } from 'date-fns'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInvoice } from '@/lib/actions/invoices'

interface InvoiceAppointment {
  id: string
  patient_id: string
  scheduled_start: string
  scheduled_end: string
  appointment_type: string
  patient?: {
    full_name_ar: string
    full_name_en: string | null
    patient_code?: string | null
  } | null
}

interface AppointmentInvoiceButtonProps {
  appointment: InvoiceAppointment
}

export function AppointmentInvoiceButton({ appointment }: AppointmentInvoiceButtonProps) {
  const t = useTranslations('invoices')
  const tAppt = useTranslations('appointments')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patientName =
    locale === 'en' && appointment.patient?.full_name_en
      ? appointment.patient.full_name_en
      : (appointment.patient?.full_name_ar ?? '—')

  const patientCode = appointment.patient?.patient_code ?? null

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null)
      setAmount('')
    }
    setOpen(next)
  }

  async function handleConfirm() {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      setError(t('invalidAmount'))
      return
    }

    setLoading(true)
    setError(null)

    const result = await createInvoice(
      appointment.patient_id,
      [{ description: tAppt(`type.${appointment.appointment_type}`), amount_jod: parsed }],
    )

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    const html = generateInvoiceHtml({
      invoiceNumber: result.invoiceNumber!,
      patientName,
      patientCode,
      appointmentTypeLabel: tAppt(`type.${appointment.appointment_type}`),
      scheduledStart: appointment.scheduled_start,
      amountJod: parsed,
      clinicName: t('print.clinicName'),
      doctorName: t('print.doctorName'),
      specialty: t('print.specialty'),
      phone: '+962 7 8663 7847',
      address: t('print.address'),
      titleLabel: t('print.title'),
      invoiceNoLabel: t('print.invoiceNo'),
      patientLabel: t('print.patient'),
      patientCodeLabel: t('print.patientCode'),
      dateLabel: t('print.date'),
      typeLabel: t('print.appointmentType'),
      amountLabel: t('print.amount'),
      totalLabel: t('print.total'),
      currencyLabel: t('print.currency'),
      signatureLabel: t('print.signature'),
      phoneLabel: t('print.phone'),
    })

    printInvoice(html)
    setOpen(false)
    setAmount('')
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Printer className="h-4 w-4 me-1" />
        {t('printButton')}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
            <DialogDescription>
              {patientName} —{' '}
              {format(new Date(appointment.scheduled_start), 'PPP')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="invoice-amount">
              {t('amountLabel')} (JOD)
            </Label>
            <Input
              id="invoice-amount"
              type="number"
              min="0"
              step="0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={loading || !amount}>
              <Printer className="h-4 w-4 me-1" />
              {loading ? tCommon('loading') : t('confirmAndPrint')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── iframe print helper ───────────────────────────────────────────────────────

function printInvoice(html: string) {
  const existing = document.getElementById('__invoice_print_iframe__')
  if (existing) existing.remove()

  const iframe = document.createElement('iframe')
  iframe.id = '__invoice_print_iframe__'
  iframe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;border:0;opacity:0;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(html)
  doc.close()

  iframe.onload = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => iframe.remove(), 1500)
  }
}

// ─── HTML generator ────────────────────────────────────────────────────────────

function generateInvoiceHtml(opts: {
  invoiceNumber: number
  patientName: string
  patientCode: string | null
  appointmentTypeLabel: string
  scheduledStart: string
  amountJod: number
  clinicName: string
  doctorName: string
  specialty: string
  phone: string
  address: string
  titleLabel: string
  invoiceNoLabel: string
  patientLabel: string
  patientCodeLabel: string
  dateLabel: string
  typeLabel: string
  amountLabel: string
  totalLabel: string
  currencyLabel: string
  signatureLabel: string
  phoneLabel: string
}): string {
  let formattedDate = opts.scheduledStart
  try {
    formattedDate = format(new Date(opts.scheduledStart), 'dd-MM-yyyy')
  } catch {
    // keep original
  }

  const amountFormatted = opts.amountJod.toFixed(2)
  const invoiceNo = String(opts.invoiceNumber).padStart(4, '0')

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة طبية</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Tahoma, "Noto Sans Arabic", sans-serif; color: #000; background: #fff; padding: 1.5cm 1cm; }
    @page { size: A4; margin: 0; }
    @media print { body { padding: 1.5cm 1cm; } }
  </style>
</head>
<body>

  <!-- Clinic Header -->
  <div style="border-bottom:3px solid #0d7377;padding-bottom:16px;margin-bottom:24px;text-align:center;">
    <div style="width:70px;height:35px;overflow:hidden;margin:0 auto 8px;border-radius:50% 50% 0 0;">
      <img src="/images/site logo.png" alt="Logo"
        style="width:70px;height:70px;object-fit:cover;object-position:top;display:block;"
        onerror="this.parentElement.style.display='none'" />
    </div>
    <h1 style="color:#0d7377;font-size:20px;margin:0 0 4px;">${opts.clinicName}</h1>
    <p style="font-size:13px;color:#444;margin:0 0 4px;">${opts.specialty}</p>
    <p style="font-size:12px;color:#666;margin:0;">${opts.address} | ${opts.phoneLabel}: <span dir="ltr">${opts.phone}</span></p>
  </div>

  <!-- Invoice Title & Number -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
    <h2 style="font-size:18px;font-weight:bold;color:#0d7377;">${opts.titleLabel}</h2>
    <div style="background:#0d7377;color:#fff;padding:6px 16px;border-radius:4px;font-size:14px;font-weight:600;">
      ${opts.invoiceNoLabel}: ${invoiceNo}
    </div>
  </div>

  <!-- Patient Info -->
  <div style="background:#f8f9fa;padding:12px 16px;border-radius:4px;margin-bottom:24px;border-right:4px solid #0d7377;">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span><strong>${opts.patientLabel}: </strong>${opts.patientName}</span>
      <span><strong>${opts.dateLabel}: </strong>${formattedDate}</span>
    </div>
    ${opts.patientCode ? `<div><strong>${opts.patientCodeLabel}: </strong><span style="font-family:monospace;font-weight:600;">${opts.patientCode}</span></div>` : ''}
  </div>

  <!-- Services Table -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:0;">
    <thead>
      <tr style="background:#0d7377;color:#fff;">
        <th style="${thStyle}width:70%">${opts.typeLabel}</th>
        <th style="${thStyle}width:30%;text-align:end;">${opts.amountLabel}</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#fff;">
        <td style="${tdStyle}">${opts.appointmentTypeLabel}</td>
        <td style="${tdStyle}text-align:end;">${amountFormatted} ${opts.currencyLabel}</td>
      </tr>
    </tbody>
  </table>

  <!-- Total Row -->
  <div style="border:1px solid #0d7377;border-top:none;padding:10px 16px;display:flex;justify-content:space-between;background:#f0f9f9;margin-bottom:48px;">
    <strong style="font-size:15px;">${opts.totalLabel}</strong>
    <strong style="font-size:15px;color:#0d7377;">${amountFormatted} ${opts.currencyLabel}</strong>
  </div>

  <!-- Signature -->
  <div style="margin-top:24px;text-align:start;">
    <div style="display:inline-block;min-width:220px;border-top:1px solid #000;padding-top:8px;text-align:center;">
      <p style="margin:0;font-size:13px;">${opts.signatureLabel}</p>
      <p style="margin:4px 0 0;font-weight:600;font-size:13px;">${opts.doctorName}</p>
    </div>
  </div>

</body>
</html>`
}

const thStyle = `padding:10px 12px;text-align:start;font-weight:600;font-size:13px;border:1px solid #0d7377;`
const tdStyle = `padding:10px 12px;border:1px solid #ddd;font-size:13px;vertical-align:middle;`
