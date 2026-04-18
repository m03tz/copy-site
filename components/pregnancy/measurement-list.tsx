'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Trash2, Pencil } from 'lucide-react'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteMeasurement, updateMeasurement } from '@/lib/actions/pregnancies'
import type { PregnancyMeasurement } from '@/lib/types/database'

// ─── Component ────────────────────────────────────────────────────────────────

interface MeasurementListProps {
  measurements: PregnancyMeasurement[]
  patientId: string
  lmpDate?: string
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return String(v)
}

export function MeasurementList({ measurements, patientId, lmpDate }: MeasurementListProps) {
  const t = useTranslations('pregnancy')

  const sorted = [...measurements].sort(
    (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
  )

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t('measurements.empty')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {sorted.map((m) => (
        <MeasurementCard key={m.id} measurement={m} patientId={patientId} lmpDate={lmpDate} />
      ))}
    </div>
  )
}

// ─── Single measurement card ──────────────────────────────────────────────────

function MeasurementCard({
  measurement: m,
  patientId,
  lmpDate,
}: {
  measurement: PregnancyMeasurement
  patientId: string
  lmpDate?: string
}) {
  const t = useTranslations('pregnancy')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  function handleDelete() {
    setError(null)
    setConfirmOpen(false)
    startTransition(async () => {
      const result = await deleteMeasurement(m.id, patientId)
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : t('deleteError'))
      }
    })
  }

  const hasUltrasound = m.crl || m.bpd || m.fl || m.ac || m.efw
  const hasLab = m.hb || m.rbs || m.tsh_lab || m.ogtt || m.ogtt_fasting || m.ogtt_1hr || m.ogtt_2hr || m.plt || m.hcg || m.b_hcg

  return (
    <div className="rounded-lg border shadow-md p-4 space-y-4 bg-card">
      {/* Header row: date (bold + bigger) + week badge + action buttons */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-base font-bold">{format(new Date(m.measured_at), 'dd-MM-yyyy')}</span>
          {m.gestational_week != null && (
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
              {t('measurements.weekLabel')} {m.gestational_week}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            disabled={isPending}
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            disabled={isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Vital signs — Row 1: Weight + Blood Pressure */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <DataChip label={t('measurements.weightKg')}     value={m.weight_kg != null ? `${m.weight_kg} ${t('measurements.weightUnit')}` : null} />
        <DataChip label={t('measurements.bloodPressure')} value={m.blood_pressure} />
      </div>

      {/* Obstetric findings — Row 2: FH + Placenta + Liquor on one line */}
      {(m.fh || m.placenta || m.liquor) && (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <DataChip label={t('measurements.fh')}      value={m.fh      ?? null} />
          <DataChip label={t('measurements.placenta')} value={m.placenta ?? null} />
          <DataChip label={t('measurements.liquor')}   value={m.liquor  ?? null} />
        </div>
      )}

      {/* Ultrasound + Lab side by side */}
      {(hasUltrasound || hasLab) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {hasUltrasound && (
            <div className="rounded-lg border shadow-sm p-3 space-y-1.5 bg-muted/20">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('measurements.ultrasoundSection')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <DataChip label="CRL" value={m.crl != null ? `${m.crl} mm` : null} />
                <DataChip label="BPD" value={m.bpd != null ? `${m.bpd} mm` : null} />
                <DataChip label="FL"  value={m.fl  != null ? `${m.fl} mm`  : null} />
                <DataChip label="AC"  value={m.ac  != null ? `${m.ac} mm`  : null} />
                <DataChip label="EFW" value={m.efw != null ? `${m.efw} g`  : null} />
              </div>
            </div>
          )}

          {hasLab && (
            <div className="rounded-lg border shadow-sm p-3 space-y-1.5 bg-muted/20">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('measurements.labSection')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <DataChip label="HB (g/dL)"           value={m.hb           != null ? fmt(m.hb)           : null} />
                <DataChip label="PLT"                 value={m.plt          != null ? fmt(m.plt)          : null} />
                <DataChip label="RBS (mg/dL)"         value={m.rbs          != null ? fmt(m.rbs)          : null} />
                <DataChip label="UA"                  value={m.ua           ?? null} />
                <DataChip label="OGTT Fasting (mg/dL)" value={m.ogtt_fasting != null ? fmt(m.ogtt_fasting) : null} />
                <DataChip label="OGTT 1hr (mg/dL)"    value={m.ogtt_1hr     != null ? fmt(m.ogtt_1hr)     : null} />
                <DataChip label="OGTT 2hr (mg/dL)"    value={m.ogtt_2hr     != null ? fmt(m.ogtt_2hr)     : null} />
                <DataChip label="TSH (mIU/L)"         value={m.tsh_lab      != null ? fmt(m.tsh_lab)      : null} />
                <DataChip label="β-HCG (mIU/mL)"      value={m.b_hcg        != null ? fmt(m.b_hcg)        : null} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan — blue square */}
      {m.notes && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 shadow-sm px-3 py-2">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">{t('measurements.notes')}</p>
          <p className="text-sm text-blue-900 dark:text-blue-200">{m.notes}</p>
        </div>
      )}

      {/* Edit dialog */}
      <EditMeasurementDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        measurement={m}
        lmpDate={lmpDate}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('measurements.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('measurements.deleteConfirmMsg')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>{t('actions.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>{t('actions.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Edit Measurement Dialog ──────────────────────────────────────────────────

function EditMeasurementDialog({
  open,
  onOpenChange,
  measurement: m,
  lmpDate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  measurement: PregnancyMeasurement
  lmpDate?: string
}) {
  const t = useTranslations('pregnancy')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fhVal, setFhVal] = useState(m.fh ?? '')
  const [placentaVal, setPlacentaVal] = useState(m.placenta ?? '')
  const [liquorVal, setLiquorVal] = useState(m.liquor ?? '')

  function calcGA(dateStr: string): string {
    if (!lmpDate || !dateStr) return String(m.gestational_week ?? '')
    const lmp = new Date(lmpDate)
    const d = new Date(dateStr)
    const diff = Math.floor((d.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return ''
    return String(Math.floor(diff / 7))
  }

  const [gaWeek, setGaWeek] = useState(String(m.gestational_week ?? ''))

  function handleDateChange(value: string) {
    if (lmpDate) setGaWeek(calcGA(value))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('measurement_id', m.id)
    if (gaWeek) formData.set('gestational_week', gaWeek)
    if (fhVal) formData.set('fh', fhVal)
    if (placentaVal) formData.set('placenta', placentaVal)
    if (liquorVal) formData.set('liquor', liquorVal)

    startTransition(async () => {
      const result = await updateMeasurement(formData)
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : t('editError'))
      } else {
        onOpenChange(false)
      }
    })
  }

  const n = (v: number | string | null) => (v != null ? String(v) : '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('measurements.editTitle')}</DialogTitle>
          <DialogDescription>
            {t('measurements.editDescription')} {format(new Date(m.measured_at), 'dd-MM-yyyy')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">

          {/* Visit Info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="e_measured_at">{t('measurements.visitDate')}</Label>
              <DatePickerInput
                id="e_measured_at"
                name="measured_at"
                defaultValue={m.measured_at}
                onChange={handleDateChange}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="e_ga">
                {t('measurements.gaWeek')}
                {lmpDate && <span className="text-xs text-muted-foreground ms-1">{t('measurements.autoCalc')}</span>}
              </Label>
              <Input
                id="e_ga"
                type="number" min={1} max={42} placeholder="1–42"
                value={gaWeek}
                onChange={(e) => setGaWeek(e.target.value)}
              />
            </div>
          </div>

          {/* Vital Signs */}
          <div className="space-y-2 rounded-lg border bg-card shadow-sm p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              {t('measurements.vitalSigns')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label={t('measurements.weightKg')} name="weight_kg" type="number" defaultValue={n(m.weight_kg)} />
              <F label={t('measurements.bloodPressure')} name="blood_pressure" type="text" defaultValue={m.blood_pressure ?? ''} placeholder="120/80" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Fetal Heart select */}
              <div className="space-y-1">
                <Label>{t('measurements.fh')}</Label>
                <Select value={fhVal} onValueChange={setFhVal}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Placenta select */}
              <div className="space-y-1">
                <Label>{t('measurements.placenta')}</Label>
                <Select value={placentaVal} onValueChange={setPlacentaVal}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fundal">Fundal</SelectItem>
                    <SelectItem value="lateral">Lateral</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Amniotic Fluid select */}
              <div className="space-y-1">
                <Label>{t('measurements.liquor')}</Label>
                <Select value={liquorVal} onValueChange={setLiquorVal}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                    <SelectItem value="increase">Increase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Ultrasound + Lab side by side */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                {t('measurements.ultrasoundSection')}
              </p>
              <div className="space-y-3">
                <F label="CRL (mm)" name="crl" type="text" defaultValue={n(m.crl)} />
                <F label="BPD (mm)" name="bpd" type="text" defaultValue={n(m.bpd)} />
                <F label="FL (mm)"  name="fl"  type="text" defaultValue={n(m.fl)} />
                <F label="AC (mm)"  name="ac"  type="text" defaultValue={n(m.ac)} />
                <F label="EFW (g)"  name="efw" type="text" defaultValue={n(m.efw)} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                {t('measurements.labSection')}
              </p>
              <div className="space-y-3">
                <F label={t('measurements.hb')}       name="hb"           type="number" defaultValue={n(m.hb)} />
                <F label="PLT"                         name="plt"          type="number" defaultValue={n(m.plt)} />
                <F label={t('measurements.rbs')}       name="rbs"          type="number" defaultValue={n(m.rbs)} />
                <F label="UA"                           name="ua"           type="text"   defaultValue={m.ua ?? ''} />
                <F label="OGTT Fasting (mg/dL)"        name="ogtt_fasting" type="number" defaultValue={n(m.ogtt_fasting)} />
                <F label="OGTT 1hr (mg/dL)"            name="ogtt_1hr"     type="number" defaultValue={n(m.ogtt_1hr)} />
                <F label="OGTT 2hr (mg/dL)"            name="ogtt_2hr"     type="number" defaultValue={n(m.ogtt_2hr)} />
                <F label="TSH (mIU/L)"                 name="tsh_lab"      type="number" defaultValue={n(m.tsh_lab)} />
                <F label="β-HCG (mIU/mL)"              name="b_hcg"        type="number" defaultValue={n(m.b_hcg)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Plan — blue box */}
          <div className="space-y-1 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 shadow-sm p-4">
            <Label htmlFor="e_notes" className="text-blue-700 dark:text-blue-400 font-semibold">
              {t('measurements.notes')}
            </Label>
            <Textarea
              id="e_notes"
              name="notes"
              rows={2}
              defaultValue={m.notes ?? ''}
              className="border-blue-200 dark:border-blue-800 focus-visible:ring-blue-400"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '...' : t('measurements.saveEdits')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DataChip({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="rounded-md border bg-muted/30 shadow-sm px-2 py-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function F({ label, name, type, defaultValue, placeholder }: {
  label: string; name: string; type: string; defaultValue?: string; placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`e_${name}`}>{label}</Label>
      <Input
        id={`e_${name}`}
        name={name}
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        min={type === 'number' ? 0 : undefined}
        defaultValue={defaultValue}
        placeholder={placeholder ?? '—'}
      />
    </div>
  )
}
