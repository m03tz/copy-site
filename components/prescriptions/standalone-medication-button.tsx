'use client'

import { useState, useTransition } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Trash2, Pill, Printer, Save } from 'lucide-react'
import { addStandaloneMedications } from '@/lib/actions/prescriptions'
import { getClinicHeaderHtml, getClinicHeaderStyles } from '@/lib/print-utils'
import { useLocale } from 'next-intl'

// ─── Schema ───────────────────────────────────────────────────────────────────

const medSchema = z.object({
  medication_name: z.string().min(1, 'Required'),
  dose: z.string().min(1, 'Required'),
  amount: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().min(1, 'Required'),
})

const formSchema = z.object({ medications: z.array(medSchema).min(1) })
type FormValues = z.infer<typeof formSchema>

// ─── Print helper ─────────────────────────────────────────────────────────────

function printPrescription(patientName: string, medications: FormValues['medications'], locale: string = 'ar') {
  const isAr = locale === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'
  const lang = isAr ? 'ar' : 'en'
  const today = new Date().toLocaleDateString(isAr ? 'ar-JO' : 'en-GB')
  const tdStyle = 'padding:9px 12px;border:1px solid #ddd;font-size:18px;vertical-align:middle'

  const labels = isAr
    ? { patient: 'اسم المريضة', date: 'التاريخ', medication: 'الدواء', dose: 'الجرعة', frequency: 'في اليوم', amount: 'الكمية', duration: 'المدة', signature: 'توقيع الطبيب', doctor: 'د. فادي السحلة', title: 'وصفة طبية' }
    : { patient: 'Patient', date: 'Date', medication: 'Drug', dose: 'Dose', frequency: 'Per/Day', amount: 'Quantity', duration: 'Duration', signature: 'Doctor Signature', doctor: 'Dr. Fadi Al-Sahla', title: 'Prescription' }

  const rows = medications
    .filter((m) => m.medication_name)
    .map(
      (m, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f4f7ff'}">
        <td style="${tdStyle}">${i + 1}</td>
        <td style="${tdStyle}">${m.medication_name}</td>
        <td style="${tdStyle};text-align:center">${m.dose}</td>
        <td style="${tdStyle};text-align:center">${m.frequency ?? '—'}</td>
        <td style="${tdStyle};text-align:center">${m.amount ?? '—'}</td>
        <td style="${tdStyle};text-align:center">${m.duration}</td>
      </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${labels.title} — ${patientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Tahoma, "Noto Sans Arabic", sans-serif; padding: 1.5cm 1cm; color: #111; font-size: 18px; direction: ${dir}; }
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
  ${getClinicHeaderHtml()}
  <div class="patient-row">
    <span><strong>${labels.patient}: </strong>${patientName}</span>
    <span><strong>${labels.date}: </strong>${today}</span>
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
      <p>${labels.signature}</p>
      <p style="font-weight:600;margin-top:4px">${labels.doctor}</p>
    </div>
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

// ─── Component ────────────────────────────────────────────────────────────────

interface StandaloneMedicationButtonProps {
  patientId: string
  patientName: string
}

export function StandaloneMedicationButton({ patientId, patientName }: StandaloneMedicationButtonProps) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [printAfterSave, setPrintAfterSave] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medications: [{ medication_name: '', dose: '', amount: '', frequency: '', duration: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'medications' })

  function onSubmit(values: FormValues) {
    setServerError(null)
    startTransition(async () => {
      const result = await addStandaloneMedications({
        patient_id: patientId,
        medications: values.medications.map((m) => ({
          medication_name: m.medication_name,
          dosage: m.dose,
          quantity: m.amount || undefined,
          instructions: m.frequency || undefined,
          duration: m.duration,
        })),
      })
      if (result.error) {
        setServerError(result.error)
      } else {
        if (printAfterSave) printPrescription(patientName, values.medications, locale)
        form.reset()
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pill className="h-4 w-4 me-1" />
        إضافة دواء
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset(); setOpen(v) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-4 w-4" />
              إضافة أدوية — {patientName}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground">
              سيتم إضافة الأدوية بتاريخ اليوم {new Date().toLocaleDateString('ar')} بدون تسجيل زيارة.
            </p>

            {/* Column headers */}
            <div className="grid grid-cols-[16px_2fr_1fr_1fr_1fr_1fr_32px] gap-2 px-1 text-xs font-medium text-muted-foreground">
              <div />
              <span>Drug <span className="text-destructive">*</span></span>
              <span>Dose</span>
              <span>Per/Day</span>
              <span>Quantity</span>
              <span>Duration</span>
              <div />
            </div>

            {/* Medication rows */}
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[16px_2fr_1fr_1fr_1fr_1fr_32px] gap-2 items-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" className="text-sky-400 fill-current shrink-0">
                    <polygon points="5,0 10,5 5,10 0,5" />
                  </svg>

                  <Input
                    {...form.register(`medications.${index}.medication_name`)}
                    placeholder="Medication name"
                    className={form.formState.errors.medications?.[index]?.medication_name ? 'border-destructive' : ''}
                  />

                  <Input
                    {...form.register(`medications.${index}.dose`)}
                    placeholder="e.g., 500mg"
                    className={form.formState.errors.medications?.[index]?.dose ? 'border-destructive' : ''}
                  />

                  <Input
                    {...form.register(`medications.${index}.frequency`)}
                    placeholder="e.g., twice daily"
                  />

                  <Input
                    {...form.register(`medications.${index}.amount`)}
                    placeholder="e.g., 1 tab"
                  />

                  <Input
                    {...form.register(`medications.${index}.duration`)}
                    placeholder="e.g., 7 days"
                    className={form.formState.errors.medications?.[index]?.duration ? 'border-destructive' : ''}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => fields.length > 1 ? remove(index) : undefined}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ medication_name: '', dose: '', amount: '', frequency: '', duration: '' })}
            >
              <Plus className="h-4 w-4 me-1" />
              إضافة دواء آخر
            </Button>

            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end flex-wrap pt-2">
              <Button type="button" variant="outline" onClick={() => { form.reset(); setOpen(false) }} disabled={isPending}>
                إلغاء
              </Button>
              <Button type="submit" variant="outline" disabled={isPending} onClick={() => setPrintAfterSave(true)}>
                <Printer className="h-4 w-4 me-1" />
                حفظ وطباعة
              </Button>
              <Button type="submit" disabled={isPending} onClick={() => setPrintAfterSave(false)}>
                <Save className="h-4 w-4 me-1" />
                {isPending && !printAfterSave ? '...' : 'حفظ'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
