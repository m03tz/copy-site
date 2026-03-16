'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { createInvoice } from '@/lib/actions/invoices'
import { generateClinicHeader, generateStyles } from '@/components/patients/print-report-button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceFormProps {
  patientId: string
  patientName: string
  /** Called after successful creation (so list can re-render) */
  onCreated?: (invoiceId: string, invoiceNumber: number) => void
}

interface LineItem {
  id: string // local key only
  description: string
  amount: string
}

// ─── Print Helper ─────────────────────────────────────────────────────────────

function printInvoice(opts: {
  invoiceNumber: number
  patientName: string
  date: string
  items: { description: string; amount: number }[]
  notes: string
  total: number
  baseUrl: string
}) {
  const rows = opts.items
    .map(
      (item) => `
      <tr>
        <td>${item.description}</td>
        <td style="text-align:start;">${item.amount.toFixed(2)}</td>
      </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>عيادة الدكتور فادي | فاتورة #${opts.invoiceNumber}</title>
  <link rel="icon" type="image/png" href="${opts.baseUrl}/images/site logo.png" />
  <style>
    ${generateStyles()}
    body { direction: rtl; }
    .invoice-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .invoice-badge { background: #0d7377; color: #fff; padding: 6px 16px; border-radius: 4px; font-size: 14px; font-weight: 600; }
    .patient-box { background: #f8f9fa; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px; border-right: 4px solid #0d7377; font-size: 13px; display: flex; justify-content: space-between; }
    .total-row td { font-weight: 700; font-size: 15px; color: #0d7377; background: #f0f9f9; }
    .notes-box { margin-top: 12px; font-size: 12px; color: #555; }
  </style>
</head>
<body>
  ${generateClinicHeader('ar', opts.baseUrl)}

  <div class="invoice-meta">
    <h2 style="font-size:18px;color:#0d7377;">فاتورة</h2>
    <div class="invoice-badge">رقم الفاتورة: #${opts.invoiceNumber}</div>
  </div>

  <div class="patient-box">
    <span><strong>المريض:</strong> ${opts.patientName}</span>
    <span><strong>التاريخ:</strong> ${opts.date}</span>
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
        <td>${opts.total.toFixed(2)} د.أ</td>
      </tr>
    </tbody>
  </table>

  ${opts.notes ? `<div class="notes-box"><strong>ملاحظات:</strong> ${opts.notes}</div>` : ''}

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

// ─── Simple ID generator (avoids crypto.randomUUID browser compatibility) ─────
let _idCounter = 0
function newId(): string {
  return `item-${Date.now()}-${++_idCounter}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoiceForm({ patientId, patientName, onCreated }: InvoiceFormProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<LineItem[]>([
    { id: newId(), description: '', amount: '' },
  ])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = new Date().toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  // ── Derived total ──────────────────────────────────────────────────────────
  const total = items.reduce((sum, item) => {
    const v = parseFloat(item.amount)
    return sum + (isNaN(v) ? 0 : v)
  }, 0)

  // ── Line-item helpers ──────────────────────────────────────────────────────
  function addItem() {
    setItems((prev) => [...prev, { id: newId(), description: '', amount: '' }])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function updateItem(id: string, field: 'description' | 'amount', value: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  // ── Reset form ─────────────────────────────────────────────────────────────
  function reset() {
    setItems([{ id: newId(), description: '', amount: '' }])
    setNotes('')
    setError(null)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsedItems = items
      .filter((item) => item.description.trim() !== '')
      .map((item) => ({
        description: item.description.trim(),
        amount_jod: parseFloat(item.amount),
      }))

    if (parsedItems.length === 0) {
      setError('أضف بنداً واحداً على الأقل')
      return
    }

    if (parsedItems.some((item) => isNaN(item.amount_jod) || item.amount_jod <= 0)) {
      setError('تأكد من صحة المبالغ المدخلة')
      return
    }

    startTransition(async () => {
      const result = await createInvoice(patientId, parsedItems, notes.trim() || undefined)

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'حدث خطأ أثناء الحفظ')
        return
      }

      // Print immediately
      if (result.invoiceNumber) {
        printInvoice({
          invoiceNumber: result.invoiceNumber,
          patientName,
          date: today,
          items: parsedItems.map((i) => ({ description: i.description, amount: i.amount_jod })),
          notes: notes.trim(),
          total,
          baseUrl: window.location.origin,
        })
      }

      onCreated?.(result.invoiceId!, result.invoiceNumber!)
      reset()
      setOpen(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Printer className="h-4 w-4" />
          إنشاء فاتورة
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Patient + date (display only) */}
          <div className="rounded-md bg-muted/40 px-3 py-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المريض</span>
              <span className="font-medium">{patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">التاريخ</span>
              <span>{today}</span>
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">بنود الفاتورة</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                إضافة بند
              </Button>
            </div>

            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_100px_32px] gap-2 text-xs text-muted-foreground px-1">
                <span>البيان</span>
                <span>المبلغ (د.أ)</span>
                <span />
              </div>

              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_100px_32px] gap-2 items-center">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="كشف / دواء / تحاليل..."
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-sm"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center rounded-md bg-muted/40 px-3 py-2 text-sm font-semibold mt-2">
              <span>الإجمالي</span>
              <span dir="ltr">{total.toFixed(2)} د.أ</span>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-notes" className="text-sm">ملاحظات (اختياري)</Label>
            <Textarea
              id="inv-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="..."
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              <Printer className="h-4 w-4" />
              {isPending ? 'جاري الحفظ...' : 'حفظ وطباعة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
