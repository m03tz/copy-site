'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Trash2, FlaskConical, User, ClipboardList, Printer } from 'lucide-react'
import { getClinicHeaderHtml, getClinicHeaderStyles } from '@/lib/print-utils'
import {
  createInfertilityRecord,
  updateInfertilityRecord,
  deleteInfertilityRecord,
} from '@/lib/actions/infertility'
import type { InfertilityRecord } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InfertilitySectionProps {
  records: InfertilityRecord[]
  patientId: string
  patientName: string
  canEdit: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try { return format(new Date(d), 'dd-MM-yyyy') } catch { return d }
}

const today = () => new Date().toISOString().split('T')[0]

// ─── Empty form default ────────────────────────────────────────────────────────

function emptyForm(rec?: InfertilityRecord) {
  return {
    record_date:    rec?.record_date ?? today(),
    lmp_date:       rec?.lmp_date ?? '',
    complaint:      rec?.complaint ?? '',
    us_findings:    rec?.us_findings ?? '',
    plan:           rec?.plan ?? '',
    hsg_date:       rec?.hsg_date ?? '',
    hsg_result:     rec?.hsg_result ?? '',
    fsh:            rec?.fsh !== null && rec?.fsh !== undefined ? String(rec.fsh) : '',
    lh:             rec?.lh !== null && rec?.lh !== undefined ? String(rec.lh) : '',
    amh:            rec?.amh !== null && rec?.amh !== undefined ? String(rec.amh) : '',
    tsh:            rec?.tsh !== null && rec?.tsh !== undefined ? String(rec.tsh) : '',
    prl:            rec?.prl !== null && rec?.prl !== undefined ? String(rec.prl) : '',
    sfa_count:      rec?.sfa_count !== null && rec?.sfa_count !== undefined ? String(rec.sfa_count) : '',
    sfa_motility:   rec?.sfa_motility !== null && rec?.sfa_motility !== undefined ? String(rec.sfa_motility) : '',
    sfa_morphology: rec?.sfa_morphology !== null && rec?.sfa_morphology !== undefined ? String(rec.sfa_morphology) : '',
    sfa_viscosity:  rec?.sfa_viscosity ?? '',
    notes:          rec?.notes ?? '',
  }
}

// ─── Record Form Dialog ───────────────────────────────────────────────────────

interface RecordFormProps {
  open: boolean
  onClose: () => void
  patientId: string
  editRecord?: InfertilityRecord | null
  nextVisitNum?: number
}

function RecordFormDialog({ open, onClose, patientId, editRecord, nextVisitNum }: RecordFormProps) {
  const t = useTranslations('infertility')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [lmpDate, setLmpDate] = useState(editRecord?.lmp_date ?? '')
  const isEdit = !!editRecord
  const def = emptyForm(editRecord ?? undefined)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('patient_id', patientId)
    if (isEdit) formData.set('record_id', editRecord!.id)

    startTransition(async () => {
      const result = isEdit
        ? await updateInfertilityRecord(formData)
        : await createInfertilityRecord(formData)
      if (result.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit
              ? `${t('editVisitNum')} ${editRecord?.visit_number ?? '—'}`
              : `${t('newVisitNum')} ${nextVisitNum ?? '—'}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">

          {/* ── 1. Visit Info ── */}
          <SectionTitle icon={<ClipboardList className="h-3.5 w-3.5" />} label={t('form.visitData')} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('form.visitDate')} required>
              <DatePickerInput name="record_date" defaultValue={def.record_date} required />
            </Field>
            <Field label={t('form.lmp')}>
              <DatePickerInput
                name="lmp_date"
                value={lmpDate}
                onChange={(v) => setLmpDate(v)}
              />
            </Field>
          </div>

          {/* ── 2. Clinical Overview ── */}
          <Separator />
          <SectionTitle icon={<ClipboardList className="h-3.5 w-3.5" />} label={t('form.clinicalExam')} />
          <Field label={t('form.complaintLabel')}>
            <Textarea name="complaint" rows={2} defaultValue={def.complaint ?? ''} placeholder="INFERTILITY FOR 2 YEARS..." />
          </Field>
          <Field label={t('form.usFindings')}>
            <Textarea name="us_findings" rows={2} defaultValue={def.us_findings ?? ''} placeholder="ANTERIOR WALL FIBROID 2x2 / NORMAL..." />
          </Field>
          <Field label={t('form.plan')}>
            <Textarea name="plan" rows={2} defaultValue={def.plan ?? ''} placeholder="DO HSG / IUI / OI..." />
          </Field>

          {/* ── 4 & 5. HSG + Hormones (side by side) ── */}
          <Separator />
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Left col: Hormones */}
            <div className="space-y-3">
              <SectionTitle icon={<FlaskConical className="h-3.5 w-3.5" />} label={t('form.hormones')} />
              <div className="grid grid-cols-2 gap-3">
                <NumField label="FSH (IU/L)"  name="fsh" defaultValue={def.fsh} />
                <NumField label="AMH (ng/mL)" name="amh" defaultValue={def.amh} />
                <NumField label="PRL (ng/mL)" name="prl" defaultValue={def.prl} />
                <NumField label="LH (IU/L)"   name="lh"  defaultValue={def.lh} />
                <NumField label="TSH (mIU/L)" name="tsh" defaultValue={def.tsh} />
              </div>
            </div>

            {/* Right col: HSG + SFA below */}
            <div className="space-y-4">
              <div className="space-y-3">
                <SectionTitle icon={<FlaskConical className="h-3.5 w-3.5" />} label={t('form.hsgTitle')} />
                <Field label={t('form.hsgResult')}>
                  <Input type="text" name="hsg_result" defaultValue={def.hsg_result ?? ''} placeholder="NORMAL / BILATERAL BLOCK / LEFT TUBE BLOCKED..." />
                </Field>
              </div>
              <Separator />
              <div className="space-y-3">
                <SectionTitle icon={<User className="h-3.5 w-3.5" />} label={t('form.sfa')} />
                <NumField label="Count (×10⁶/mL)" name="sfa_count"      defaultValue={def.sfa_count} step="0.01" />
                <NumField label="Motility %"       name="sfa_motility"   defaultValue={def.sfa_motility} min={0} max={100} step="0.1" />
                <NumField label="Morphology %"     name="sfa_morphology" defaultValue={def.sfa_morphology} min={0} max={100} step="0.1" />
                <Field label="Viscosity">
                  <Input type="text" name="sfa_viscosity" defaultValue={def.sfa_viscosity ?? ''} placeholder="Normal / High / Low" />
                </Field>
              </div>
            </div>
          </div>

          <Separator />
          <Field label={t('form.notes')}>
            <Textarea name="notes" rows={2} defaultValue={def.notes ?? ''} placeholder="..." />
          </Field>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '...' : isEdit ? t('update') : t('saveVisit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Single Record Card ───────────────────────────────────────────────────────

interface RecordCardProps {
  record: InfertilityRecord
  patientId: string
  patientName: string
  canEdit: boolean
}

function RecordCard({ record, patientId, patientName, canEdit }: RecordCardProps) {
  const t = useTranslations('infertility')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDelete() {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteInfertilityRecord(record.id, patientId)
      if (result.error) setDeleteError(result.error)
      else setDeleteOpen(false)
    })
  }

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    const hasHormones = record.fsh || record.lh || record.amh || record.tsh || record.prl
    const hasSFA = record.sfa_count || record.sfa_motility || record.sfa_morphology || record.sfa_viscosity
    const hasHSG = record.hsg_result || record.hsg_date

    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8"/>
      <title>سجل زيارة — ${patientName}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:1.5cm 1cm;color:#111;font-size:13px}
        ${getClinicHeaderStyles()}
        .sub{text-align:center;color:#666;font-size:11px;margin-bottom:16px}
        .header-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#f5f5f5;padding:10px;border-radius:4px;margin-bottom:14px}
        .section{margin-bottom:12px}
        .section-title{font-weight:bold;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:6px;font-size:12px;color:#444}
        .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
        .chip{border:1px solid #e2e8f0;border-radius:4px;padding:5px 8px;text-align:center}
        .chip-label{font-size:10px;color:#888}
        .chip-val{font-weight:600;font-size:13px}
        label{font-size:10px;color:#888;display:block}
        p{margin:2px 0;font-size:13px}
        hr{border:none;border-top:1px solid #eee;margin:10px 0}
        @media print{body{padding:10px}}
        @page{size:A4;margin:0}
      </style></head><body>
      ${getClinicHeaderHtml()}
      <div class="sub">سجل خصوبة / Infertility Record — زيارة رقم ${record.visit_number ?? '—'}</div>
      <div class="header-bar">
        <div><label>المريضة</label><p>${patientName}</p></div>
        <div><label>تاريخ الزيارة</label><p>${fmtDate(record.record_date)}</p></div>
        <div><label>LMP</label><p>${fmtDate(record.lmp_date)}</p></div>
      </div>
      ${record.complaint ? `<div class="section"><div class="section-title">الشكوى (C/O)</div><p>${record.complaint}</p></div>` : ''}
      ${record.us_findings ? `<div class="section"><div class="section-title">السونار (US)</div><p>${record.us_findings}</p></div>` : ''}
      ${record.plan ? `<div class="section"><div class="section-title">خطة العلاج (Plan)</div><p>${record.plan}</p></div>` : ''}
      ${hasHSG ? `<div class="section"><div class="section-title">HSG</div>
        <div class="grid2">
          <div><label>تاريخ HSG</label><p>${fmtDate(record.hsg_date)}</p></div>
          <div><label>نتيجة HSG</label><p>${record.hsg_result ?? '—'}</p></div>
        </div></div>` : ''}
      ${hasHormones ? `<div class="section"><div class="section-title">الهرمونات</div>
        <div class="grid3">
          ${record.fsh ? `<div class="chip"><div class="chip-label">FSH</div><div class="chip-val">${record.fsh} IU/L</div></div>` : ''}
          ${record.lh  ? `<div class="chip"><div class="chip-label">LH</div><div class="chip-val">${record.lh} IU/L</div></div>` : ''}
          ${record.amh ? `<div class="chip"><div class="chip-label">AMH</div><div class="chip-val">${record.amh} ng/mL</div></div>` : ''}
          ${record.tsh ? `<div class="chip"><div class="chip-label">TSH</div><div class="chip-val">${record.tsh} mIU/L</div></div>` : ''}
          ${record.prl ? `<div class="chip"><div class="chip-label">PRL</div><div class="chip-val">${record.prl} ng/mL</div></div>` : ''}
        </div></div>` : ''}
      ${hasSFA ? `<div class="section"><div class="section-title">SFA — تحليل السائل المنوي</div>
        <div class="grid3">
          ${record.sfa_count    ? `<div class="chip"><div class="chip-label">Count</div><div class="chip-val">${record.sfa_count} ×10⁶/mL</div></div>` : ''}
          ${record.sfa_motility ? `<div class="chip"><div class="chip-label">Motility</div><div class="chip-val">${record.sfa_motility}%</div></div>` : ''}
          ${record.sfa_morphology ? `<div class="chip"><div class="chip-label">Morphology</div><div class="chip-val">${record.sfa_morphology}%</div></div>` : ''}
          ${record.sfa_viscosity ? `<div class="chip"><div class="chip-label">Viscosity</div><div class="chip-val">${record.sfa_viscosity}</div></div>` : ''}
        </div></div>` : ''}
      ${record.notes ? `<div class="section"><div class="section-title">ملاحظات</div><p>${record.notes}</p></div>` : ''}
      <hr/>
      <div style="display:flex;justify-content:space-between;margin-top:28px;font-size:11px;color:#888">
        <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-JO')}</span>
        <span>توقيع الطبيب: _______________</span>
      </div>
    </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  const hasHormones = record.fsh || record.lh || record.amh || record.tsh || record.prl
  const hasSFA = record.sfa_count || record.sfa_motility || record.sfa_morphology || record.sfa_viscosity

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            {/* Visit badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="text-xs font-bold">
                {t('visitBadge')} #{record.visit_number ?? '—'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {fmtDate(record.record_date)}
              </Badge>
              {record.lmp_date && (
                <span className="text-xs text-muted-foreground">
                  {t('lmpShort')}: {fmtDate(record.lmp_date)}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrint} title={t('print')}>
                <Printer className="h-4 w-4" />
              </Button>
              {canEdit && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} title={t('editBtn')}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} title={t('deleteBtn')}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {/* Clinical */}
          <div className="space-y-1.5">
            {record.complaint && <ReadLine label="C/O" value={record.complaint} />}
            {record.us_findings && <ReadLine label="US" value={record.us_findings} />}
          </div>

          {/* Plan — blue square */}
          {record.plan && (
            <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-xs">
              <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Plan</p>
              <span className="text-foreground">{record.plan}</span>
            </div>
          )}

          {/* HSG — white square */}
          {record.hsg_result && (
            <div className="rounded-md border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-sm">
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">HSG</p>
              <span className="text-muted-foreground">{t('hsgResultLabel')}: <span className="text-foreground font-medium">{record.hsg_result}</span></span>
            </div>
          )}

          {/* Hormones */}
          {hasHormones && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <FlaskConical className="h-3 w-3" /> {t('hormones')}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <HormoneChip label="FSH" value={record.fsh} unit="IU/L" />
                <HormoneChip label="LH"  value={record.lh}  unit="IU/L" />
                <HormoneChip label="AMH" value={record.amh} unit="ng/mL" />
                <HormoneChip label="TSH" value={record.tsh} unit="mIU/L" />
                <HormoneChip label="PRL" value={record.prl} unit="ng/mL" />
              </div>
            </div>
          )}

          {/* SFA */}
          {hasSFA && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <User className="h-3 w-3" /> SFA
              </p>
              <div className="grid grid-cols-3 gap-2">
                <HormoneChip label="Count"      value={record.sfa_count}      unit="×10⁶/mL" />
                <HormoneChip label="Motility"   value={record.sfa_motility}   unit="%" />
                <HormoneChip label="Morphology" value={record.sfa_morphology} unit="%" />
              </div>
              {record.sfa_viscosity && (
                <div className="flex gap-2 text-sm">
                  <span className="text-muted-foreground font-medium shrink-0">Viscosity:</span>
                  <span>{record.sfa_viscosity}</span>
                </div>
              )}
            </div>
          )}

          {record.notes && (
            <p className="text-xs text-muted-foreground border-t pt-2">{record.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <RecordFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        patientId={patientId}
        editRecord={record}
      />

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { if (!v) setDeleteOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteVisitTitle')} {record.visit_number}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('deleteVisitConfirm')}</p>
          {deleteError && (
            <Alert variant="destructive"><AlertDescription>{deleteError}</AlertDescription></Alert>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isPending}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? '...' : t('deleteBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function InfertilitySection({ records, patientId, patientName, canEdit }: InfertilitySectionProps) {
  const t = useTranslations('infertility')
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{t('sectionTitle')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{records.length} {t('visitCountLabel')}</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t('addVisit')}
          </Button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <FlaskConical className="h-10 w-10 opacity-30" />
          <p className="text-sm">{t('noRecords')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
            <RecordCard key={r.id} record={r} patientId={patientId} patientName={patientName} canEdit={canEdit} />
          ))}
        </div>
      )}

      <RecordFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        patientId={patientId}
        nextVisitNum={records.length + 1}
      />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
      {icon} {label}
    </p>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}{required && <span className="ms-1 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

function NumField({
  label, name, defaultValue, step = '0.01', min, max
}: {
  label: string; name: string; defaultValue?: string | null; step?: string; min?: number; max?: number
}) {
  return (
    <Field label={label}>
      <Input type="number" name={name} step={step} min={min} max={max}
        defaultValue={defaultValue ?? ''} placeholder="—" />
    </Field>
  )
}

function ReadLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground font-medium shrink-0">{label}:</span>
      <span>{value}</span>
    </div>
  )
}

function HormoneChip({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  if (!value) return null
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1.5 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{unit}</p>
    </div>
  )
}
