'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { addMeasurement } from '@/lib/actions/pregnancies'
import { Plus, Activity, FlaskConical } from 'lucide-react'
import { format } from 'date-fns'

// ─── Validation schema ────────────────────────────────────────────────────────

const measurementFormSchema = z.object({
  measured_at: z.string().min(1, 'Measurement date is required'),
  gestational_week: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && +v >= 1 && +v <= 42), 'Must be 1–42'),
  weight_kg: z
    .string()
    .optional()
    .refine((v) => !v || (+v > 0 && !isNaN(+v)), 'Must be positive'),
  blood_pressure: z.string().optional(),
  // Obstetric clinical fields
  fh: z.string().optional(),
  placenta: z.string().optional(),
  liquor: z.string().optional(),
  ua: z.string().optional(),
  // Ultrasound fields
  crl: z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  bpd: z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  fl:  z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  ac:  z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  efw: z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  // Lab fields
  hb:      z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  plt:     z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  rbs:     z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  tsh_lab: z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  ogtt:         z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  ogtt_fasting: z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  ogtt_1hr:     z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  ogtt_2hr:     z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  hcg:          z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  b_hcg:        z.string().optional().refine((v) => !v || +v > 0, 'Must be positive'),
  notes: z.string().optional(),
})

type MeasurementFormValues = z.infer<typeof measurementFormSchema>

// ─── Component ────────────────────────────────────────────────────────────────

interface LatestVitals {
  blood_pressure?: string
  weight?: string
}

interface MeasurementFormProps {
  pregnancyId: string
  lmpDate?: string
  latestVitals?: LatestVitals | null
}

export function MeasurementForm({ pregnancyId, lmpDate, latestVitals }: MeasurementFormProps) {
  const t = useTranslations('pregnancy')
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  function calcGAWeeks(measuredAt: string): string | undefined {
    if (!lmpDate || !measuredAt) return undefined
    const lmp = new Date(lmpDate)
    const measured = new Date(measuredAt)
    const diffDays = Math.floor((measured.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return undefined
    return String(Math.floor(diffDays / 7))
  }

  const defaultValues: MeasurementFormValues = {
    measured_at: todayStr,
    gestational_week: lmpDate ? (calcGAWeeks(todayStr) ?? '') : '',
    weight_kg: latestVitals?.weight ?? '',
    blood_pressure: latestVitals?.blood_pressure ?? '',
    fh: '', placenta: '', liquor: '', ua: '',
    crl: '', bpd: '', fl: '', ac: '', efw: '',
    hb: '', plt: '', rbs: '', tsh_lab: '',
    ogtt: '', ogtt_fasting: '', ogtt_1hr: '', ogtt_2hr: '',
    hcg: '', b_hcg: '',
    notes: '',
  }

  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues,
  })

  function handleDateChange(value: string) {
    form.setValue('measured_at', value)
    if (lmpDate) {
      const weeks = calcGAWeeks(value)
      if (weeks) form.setValue('gestational_week', weeks)
    }
  }

  function onSubmit(values: MeasurementFormValues) {
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('pregnancy_id', pregnancyId)
      formData.set('measured_at', values.measured_at)

      const optNum = (key: keyof MeasurementFormValues) => {
        const v = values[key]
        if (v && String(v).trim() !== '') formData.set(key, String(v))
      }

      const optStr = (key: keyof MeasurementFormValues) => {
        const v = values[key]
        if (v && String(v).trim() !== '') formData.set(key, String(v))
      }

      optNum('gestational_week')
      optNum('weight_kg')
      if (values.blood_pressure) formData.set('blood_pressure', values.blood_pressure)
      optStr('fh'); optStr('placenta'); optStr('liquor'); optStr('ua')
      optNum('crl'); optNum('bpd'); optNum('fl'); optNum('ac'); optNum('efw')
      optNum('hb'); optNum('plt'); optNum('rbs'); optNum('tsh_lab')
      optNum('ogtt_fasting'); optNum('ogtt_1hr'); optNum('ogtt_2hr')
      optNum('b_hcg')
      if (values.notes) formData.set('notes', values.notes)

      const result = await addMeasurement(formData)

      if (result.error) {
        setServerError(typeof result.error === 'string' ? result.error : 'An error occurred')
      } else {
        form.reset(defaultValues)
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 me-1" />
          {t('measurements.add')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('measurements.add')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">

          {/* ── Visit Info ── */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="measured_at">{t('measurements.measuredAt')}</Label>
              <Controller
                name="measured_at"
                control={form.control}
                render={({ field }) => (
                  <DatePickerInput
                    id="measured_at"
                    value={field.value}
                    onChange={(v) => { field.onChange(v); handleDateChange(v) }}
                    required
                  />
                )}
              />
              {form.formState.errors.measured_at && (
                <p className="text-xs text-destructive">{form.formState.errors.measured_at.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="gestational_week">
                {t('measurements.gestationalWeek')}
                {lmpDate && <span className="text-xs text-muted-foreground ms-1">{t('measurements.autoCalc')}</span>}
              </Label>
              <Input
                id="gestational_week"
                type="number" min={1} max={42} placeholder="1–42"
                {...form.register('gestational_week')}
              />
              {form.formState.errors.gestational_week && (
                <p className="text-xs text-destructive">{form.formState.errors.gestational_week.message}</p>
              )}
            </div>
          </div>

          {/* ── Vital Signs ── */}
          <div className="space-y-2 rounded-lg border bg-card shadow-sm p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <Activity className="h-3 w-3" /> {t('measurements.vitalSigns')}
              {latestVitals && (
                <span className="text-[10px] normal-case font-normal text-blue-500 ms-2">
                  {t('measurements.prefilled')}
                </span>
              )}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="weight_kg">{t('measurements.weightKg')}</Label>
                <Input id="weight_kg" type="number" step="0.01" min={0} placeholder={t('measurements.weightUnit')}
                  {...form.register('weight_kg')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="blood_pressure">{t('measurements.bloodPressure')}</Label>
                <Input id="blood_pressure" type="text" placeholder="120/80"
                  {...form.register('blood_pressure')} />
              </div>
            </div>
            {/* Obstetric clinical fields */}
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Fetal Heart - select: absent / present */}
              <div className="space-y-1">
                <Label>{t('measurements.fh')}</Label>
                <Controller
                  name="fh"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {/* Placenta - select: fundal / lateral / low */}
              <div className="space-y-1">
                <Label>{t('measurements.placenta')}</Label>
                <Controller
                  name="placenta"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fundal">Fundal</SelectItem>
                        <SelectItem value="lateral">Lateral</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {/* Amniotic Fluid - select: normal / decrease / increase */}
              <div className="space-y-1">
                <Label>{t('measurements.liquor')}</Label>
                <Controller
                  name="liquor"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="decrease">Decrease</SelectItem>
                        <SelectItem value="increase">Increase</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* ── Plan ── */}
          <div className="space-y-1 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 shadow-sm p-4">
            <Label htmlFor="measurement_notes" className="text-blue-700 dark:text-blue-400 font-semibold">
              {t('measurements.notes')}
            </Label>
            <Textarea
              id="measurement_notes"
              rows={2}
              placeholder={t('measurements.notes')}
              className="border-blue-200 dark:border-blue-800 focus-visible:ring-blue-400"
              {...form.register('notes')}
            />
          </div>

          <Separator />

          {/* ── Ultrasound + Lab side by side ── */}
          <div className="grid gap-6 sm:grid-cols-2 rounded-lg border bg-card shadow-sm p-4">
            {/* Left: Ultrasound */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                {t('measurements.ultrasoundSection')}
              </p>
              <div className="grid gap-3 grid-cols-1">
                <UltrasoundField label="CRL (mm)" name="crl" form={form} />
                <UltrasoundField label="BPD (mm)" name="bpd" form={form} />
                <UltrasoundField label="FL (mm)"  name="fl"  form={form} />
                <UltrasoundField label="AC (mm)"  name="ac"  form={form} />
                <UltrasoundField label="EFW (g)"  name="efw" form={form} />
              </div>
            </div>

            {/* Right: Lab Results — order: HB, PLT, RBS, OGTT, TSH, HCG */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
                <FlaskConical className="h-3 w-3" /> {t('measurements.labSection')}
              </p>
              <div className="grid gap-3 grid-cols-1">
                <LabField label={t('measurements.hb')}        name="hb"           form={form} />
                <LabField label="PLT"                          name="plt"          form={form} />
                <LabField label={t('measurements.rbs')}        name="rbs"          form={form} />
                <LabField label="OGTT Fasting (mg/dL)"         name="ogtt_fasting" form={form} />
                <LabField label="OGTT 1hr (mg/dL)"             name="ogtt_1hr"     form={form} />
                <LabField label="OGTT 2hr (mg/dL)"             name="ogtt_2hr"     form={form} />
                <LabField label="TSH (mIU/L)"                  name="tsh_lab"      form={form} />
                <LabField label="β-HCG (mIU/mL)"               name="b_hcg"        form={form} />
              </div>
            </div>
          </div>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '...' : t('actions.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function UltrasoundField({
  label, name, form
}: {
  label: string
  name: 'crl' | 'bpd' | 'fl' | 'ac' | 'efw'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type="number" step="0.01" min={0} placeholder="—" {...form.register(name)} />
    </div>
  )
}

function LabField({
  label, name, form
}: {
  label: string
  name: 'hb' | 'plt' | 'rbs' | 'tsh_lab' | 'ogtt' | 'ogtt_fasting' | 'ogtt_1hr' | 'ogtt_2hr' | 'hcg' | 'b_hcg'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type="number" step="0.01" min={0} placeholder="—" {...form.register(name)} />
    </div>
  )
}
