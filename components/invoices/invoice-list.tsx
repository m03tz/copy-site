'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Printer, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { deleteInvoice, updateInvoicePaymentStatus } from '@/lib/actions/invoices'
import { generateClinicHeader, generateStyles } from '@/components/patients/print-report-button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceItem {
  id: string
  description: string
  amount_jod: number
}

interface InvoiceData {
  id: string
  invoice_number: number
  amount_jod: number | null
  notes: string | null
  created_at: string
  payment_status: 'paid' | 'unpaid'
  items: InvoiceItem[]
}

interface InvoiceListProps {
  invoices: InvoiceData[]
  patientId: string
  patientName: string
}

// ─── Print Helper ─────────────────────────────────────────────────────────────

function printInvoice(inv: InvoiceData, patientName: string, baseUrl: string) {
  const total = inv.items.reduce((s, i) => s + i.amount_jod, 0)
  const dateStr = format(new Date(inv.created_at), 'dd-MM-yyyy')
  const isPaid = inv.payment_status === 'paid'

  const rows = inv.items
    .map(
      (item) => `
      <tr>
        <td>${item.description}</td>
        <td style="text-align:start;">${item.amount_jod.toFixed(2)} د.أ</td>
      </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>عيادة الدكتور فادي | فاتورة #${inv.invoice_number}</title>
  <link rel="icon" type="image/png" href="${baseUrl}/images/site logo.png" />
  <style>
    ${generateStyles()}
    body { direction: rtl; }
    .invoice-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .invoice-badge { background: #0d7377; color: #fff; padding: 6px 16px; border-radius: 4px; font-size: 14px; font-weight: 600; }
    .patient-box { background: #f8f9fa; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px; border-right: 4px solid #0d7377; font-size: 13px; display: flex; justify-content: space-between; }
    .total-row td { font-weight: 700; font-size: 15px; color: #0d7377; background: #f0f9f9; }
    .notes-box { margin-top: 12px; font-size: 12px; color: #555; }
    .status-stamp { display: inline-block; border: 3px solid ${isPaid ? '#16a34a' : '#dc2626'}; color: ${isPaid ? '#16a34a' : '#dc2626'}; border-radius: 6px; padding: 4px 16px; font-size: 16px; font-weight: 700; transform: rotate(-5deg); margin-top: 16px; }
  </style>
</head>
<body>
  ${generateClinicHeader('ar', baseUrl)}

  <div class="invoice-meta">
    <h2 style="font-size:18px;color:#0d7377;">فاتورة</h2>
    <div class="invoice-badge">رقم الفاتورة: #${inv.invoice_number}</div>
  </div>

  <div class="patient-box">
    <span><strong>المريض:</strong> ${patientName}</span>
    <span><strong>التاريخ:</strong> ${dateStr}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>البيان</th>
        <th>المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td>الإجمالي</td>
        <td>${total.toFixed(2)} د.أ</td>
      </tr>
    </tbody>
  </table>

  ${inv.notes ? `<div class="notes-box"><strong>ملاحظات:</strong> ${inv.notes}</div>` : ''}

  <div style="text-align:center;">
    <span class="status-stamp">${isPaid ? 'مدفوعة ✓' : 'غير مدفوعة'}</span>
  </div>

  <div class="footer">
    <p>عيادة د. فادي السحلة الإلكترونية | هاتف: <span dir="ltr">+962 7 8663 7847</span></p>
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=750,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

// ─── Single invoice card ──────────────────────────────────────────────────────

function InvoiceCard({
  invoice,
  patientId,
  patientName,
}: {
  invoice: InvoiceData
  patientId: string
  patientName: string
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Optimistic payment status
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>(
    invoice.payment_status ?? 'unpaid'
  )

  const total = invoice.items.reduce((s, i) => s + i.amount_jod, 0)

  function handleDelete() {
    setError(null)
    setDeleteOpen(false)
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id, patientId)
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'حدث خطأ أثناء الحذف')
      }
    })
  }

  function handleTogglePayment() {
    const newStatus = paymentStatus === 'paid' ? 'unpaid' : 'paid'
    // Optimistic update
    setPaymentStatus(newStatus)
    startTransition(async () => {
      const result = await updateInvoicePaymentStatus(invoice.id, patientId, newStatus)
      if (result.error) {
        // Revert on error
        setPaymentStatus(paymentStatus)
        setError(result.error)
      }
    })
  }

  const isPaid = paymentStatus === 'paid'

  return (
    <div className="rounded-lg border p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-mono font-semibold text-primary">#{invoice.invoice_number}</span>
          <span className="text-muted-foreground">
            {format(new Date(invoice.created_at), 'dd-MM-yyyy')}
          </span>
          {/* Payment status badge */}
          <Badge
            variant={isPaid ? 'default' : 'secondary'}
            className={
              isPaid
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
                : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800'
            }
          >
            {isPaid ? (
              <CheckCircle2 className="h-3 w-3 me-1" />
            ) : (
              <Clock className="h-3 w-3 me-1" />
            )}
            {isPaid ? 'مدفوعة' : 'غير مدفوعة'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {/* Toggle payment button */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 text-xs px-2 ${
              isPaid
                ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
            disabled={isPending}
            onClick={handleTogglePayment}
            title={isPaid ? 'تحديد كغير مدفوعة' : 'تحديد كمدفوعة'}
          >
            {isPaid ? 'إلغاء الدفع' : 'تحديد كمدفوعة'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => printInvoice({ ...invoice, payment_status: paymentStatus }, patientName, window.location.origin)}
            title="طباعة"
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            disabled={isPending}
            onClick={() => setDeleteOpen(true)}
            title="حذف"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Items */}
      {invoice.items.length > 0 && (
        <div className="space-y-1">
          {invoice.items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
              <span>{item.description}</span>
              <span dir="ltr">{item.amount_jod.toFixed(2)} د.أ</span>
            </div>
          ))}
          <Separator className="my-1" />
          <div className="flex justify-between text-sm font-semibold">
            <span>الإجمالي</span>
            <span dir="ltr">{total.toFixed(2)} د.أ</span>
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <p className="text-xs text-muted-foreground border-t pt-1.5">{invoice.notes}</p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف الفاتورة</DialogTitle>
            <DialogDescription>
              سيتم حذف الفاتورة #{invoice.invoice_number} بشكل نهائي. هل أنت متأكد؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main list ────────────────────────────────────────────────────────────────

export function InvoiceList({ invoices, patientId, patientName }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        لا توجد فواتير لهذا المريض
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => (
        <InvoiceCard
          key={inv.id}
          invoice={inv}
          patientId={patientId}
          patientName={patientName}
        />
      ))}
    </div>
  )
}
