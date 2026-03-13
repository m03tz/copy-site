'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Printer, FileText, Clock, Stethoscope, Building2, Plane, PenLine } from 'lucide-react'
import { getClinicHeaderHtml, getClinicHeaderStyles } from '@/lib/print-utils'
import { format, differenceInWeeks } from 'date-fns'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActivePregnancy {
  lmp_date: string
  expected_due_date: string
}

interface MedicalReportFormProps {
  patientName: string
  activePregnancy?: ActivePregnancy | null
}

type TemplateId =
  | 'report'
  | 'sickLeave'
  | 'dental'
  | 'hospital'
  | 'travel'
  | 'custom'

// ─── Template definitions ────────────────────────────────────────────────────

const TEMPLATES: { id: TemplateId; labelKey: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'report',      labelKey: 'tmplReport',      Icon: FileText    },
  { id: 'sickLeave',   labelKey: 'tmplSickLeave',   Icon: Clock       },
  { id: 'dental',      labelKey: 'tmplDental',      Icon: Stethoscope },
  { id: 'hospital',    labelKey: 'tmplHospital',    Icon: Building2   },
  { id: 'travel',      labelKey: 'tmplTravel',      Icon: Plane       },
  { id: 'custom',      labelKey: 'tmplCustom',      Icon: PenLine     },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gaWeeksFromLmp(lmpDate: string): number {
  try { return differenceInWeeks(new Date(), new Date(lmpDate)) } catch { return 0 }
}

function monthFromWeeks(weeks: number): string {
  const months: Record<number, string> = {
    1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع',
    5: 'الخامس', 6: 'السادس', 7: 'السابع', 8: 'الثامن', 9: 'التاسع',
  }
  return months[Math.min(9, Math.max(1, Math.ceil(weeks / 4.33)))] ?? 'التاسع'
}

// ─── Per-template extra fields ────────────────────────────────────────────────

interface FieldDef { key: string; labelKey: string; placeholder?: string }

const EXTRA_FIELDS: Partial<Record<TemplateId, FieldDef[]>> = {
  report: [
    { key: 'month',     labelKey: 'fieldMonth',     placeholder: 'مثال: التاسع' },
    { key: 'lmp',       labelKey: 'fieldLmp',       placeholder: 'dd-MM-yyyy'   },
    { key: 'edd',       labelKey: 'fieldEdd',       placeholder: 'dd-MM-yyyy'   },
  ],
  travel: [
    { key: 'month', labelKey: 'fieldMonth', placeholder: 'مثال: التاسع' },
    { key: 'ga',    labelKey: 'fieldGa',    placeholder: '38'           },
  ],
  sickLeave: [
    { key: 'month',     labelKey: 'fieldMonth',     placeholder: 'مثال: الثامن'         },
    { key: 'complaint', labelKey: 'fieldComplaint', placeholder: 'مثال: آلام أسفل البطن' },
    { key: 'duration',  labelKey: 'fieldDuration',  placeholder: 'مثال: 24 ساعة'         },
  ],
  dental: [
    { key: 'month', labelKey: 'fieldMonth', placeholder: 'مثال: الرابع' },
  ],
  hospital: [
    { key: 'gravida',      labelKey: 'fieldGravida',      placeholder: '5'              },
    { key: 'para',         labelKey: 'fieldPara',         placeholder: '4'              },
    { key: 'lmp',          labelKey: 'fieldLmp',          placeholder: 'dd-MM-yyyy'     },
    { key: 'edd',          labelKey: 'fieldEdd',          placeholder: 'dd-MM-yyyy'     },
    { key: 'ga',           labelKey: 'fieldGa',           placeholder: '38'             },
    { key: 'cs',           labelKey: 'fieldCs',           placeholder: '4'              },
    { key: 'pediatrician', labelKey: 'fieldPediatrician', placeholder: 'د. علاء المومني' },
  ],
}

// ─── Body builder for non-miscarriage templates ───────────────────────────────

function buildBody(id: TemplateId, patientName: string, p: Record<string, string>): string {
  switch (id) {
    case 'report':
      return `راجعت المريضة وهي حامل بالشهر ${p.month || 'التاسع'} وتاريخ آخر دورة ${p.lmp || '___'} وتوقع الولادة بتاريخ ${p.edd || '___'} وهي بحاجة إلى متابعة لدى طبيب نسائية وتوليد.`
    case 'sickLeave':
      return `راجعت المريضة المذكورة وهي حامل بالشهر ${p.month || 'الثامن'} وتعاني من ${p.complaint || 'آلام أسفل البطن'} وهي بحاجة إلى راحة تامة لمدة ${p.duration || '24 ساعة'}.`
    case 'dental':
      return `راجعت المريضة المذكورة وهي حامل بالشهر ${p.month || 'الرابع'} لا مانع من عمل الأسنان واستخدام التخدير الموضعي وذلك تحت إشراف طبيب الأسنان.`
    case 'hospital':
      return `G${p.gravida || '__'} P${p.para || '__'}
LMP: ${p.lmp || '___'}
EDD: ${p.edd || '___'}
GA: ${p.ga || '__'} WEEK
PREVIOUS ${p.cs || '__'} CS FOR ELECTIVE CS

طبيب الأطفال: ${p.pediatrician || 'د. علاء المومني'}`
    case 'travel':
      return `راجعت المريضة المذكورة أعلاه و هي حامل بالشهر ${p.month || '____'} بالأسبوع ${p.ga || '____'} وحالة الأم والطفل مستقرة لا مانع من السفر بالطائرة.\n\nI reviewed the above-mentioned patient who is pregnant at month ${p.month || '____'} week ${p.ga || '____'} and the condition of the mother and child is stable, with no contraindication for travel by air.`
    case 'custom':
    default:
      return p._body ?? ''
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MedicalReportForm({ patientName, activePregnancy }: MedicalReportFormProps) {
  const t = useTranslations('medicalReport')
  const locale = useLocale()
  const today = format(new Date(), 'dd-MM-yyyy')

  // Derive smart defaults from active pregnancy
  const smartDefaults = useMemo((): Record<string, string> => {
    if (!activePregnancy) return {}
    const ga = gaWeeksFromLmp(activePregnancy.lmp_date)
    return {
      month: monthFromWeeks(ga),
      lmp: activePregnancy.lmp_date,
      edd: activePregnancy.expected_due_date,
      ga: String(ga),
    }
  }, [activePregnancy])

  const [selected, setSelected] = useState<TemplateId>('report')

  // FIX: params are pre-seeded with smartDefaults so every input is a controlled field
  const [params, setParams] = useState<Record<string, string>>(() => ({ ...smartDefaults }))

  // Body textarea override (when user manually edits the text)
  const [bodyOverride, setBodyOverride] = useState<string | null>(null)

  const computedBody = useMemo(() => {
    return buildBody(selected, patientName, { ...params, _body: params._body ?? '' })
  }, [selected, patientName, params])

  const displayBody = bodyOverride !== null ? bodyOverride : computedBody

  // ── Template selection — pre-seed all params ──────────────────────────────
  function selectTemplate(id: TemplateId) {
    setSelected(id)
    // Seed params with smartDefaults so inputs are editable immediately
    setParams({ ...smartDefaults })
    setBodyOverride(null)
  }

  function setParam(key: string, val: string) {
    setParams(prev => ({ ...prev, [key]: val }))
    setBodyOverride(null)
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  function handlePrint() {
    const isAr = locale === 'ar'
    const dir = isAr ? 'rtl' : 'ltr'
    const lang = isAr ? 'ar' : 'en'
    const titleLabel = t(TEMPLATES.find(x => x.id === selected)?.labelKey ?? 'tmplCustom')
    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${t('docTitle')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial','Tahoma',sans-serif; direction: ${dir}; padding: 1.5cm 2cm; color: #111; min-height: 29.7cm; position: relative; }
    ${getClinicHeaderStyles()}
    .report-meta { display:flex; justify-content:space-between; margin-bottom:24px; font-size:13px; color:#444; border-bottom:1px solid #e0e0e0; padding-bottom:10px; }
    .report-meta span { font-weight:bold; color:#111; }
    .report-title { font-size:17px; font-weight:bold; text-align:center; margin-bottom:28px; text-decoration:underline; text-underline-offset:5px; }
    .report-body { font-size:14px; line-height:2.2; white-space:pre-wrap; min-height:180px; border-bottom:1px dashed #ccc; padding-bottom:16px; }
    .stamp-area { position:absolute; bottom:2.5cm; left:2cm; width:140px; height:140px; }
    .stamp-area img { width:140px; height:140px; object-fit:contain; }
    .signature-area { position:absolute; bottom:2.5cm; right:2cm; text-align:center; font-size:13px; }
    .signature-line { border-top:1px solid #333; width:160px; margin:40px auto 6px; }
    @media print { body { padding:1cm 1.5cm; } @page { size:A4; margin:0; } }
  </style>
</head>
<body>
  ${getClinicHeaderHtml()}
  <div class="report-meta">
    <div>${t('printPatient')}: <span>${patientName}</span></div>
    <div>${t('printDate')}: <span>${today}</span></div>
  </div>
  <div class="report-title">${titleLabel}</div>
  <div class="report-body">${displayBody.replace(/\n/g, '<br/>')}</div>
  <div class="stamp-area">
    <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/images/stamp.png" alt="ختم" onerror="this.style.display='none'" />
  </div>
  <div class="signature-area">
    <div class="signature-line"></div>
    <div>${t('doctorSignature')}</div>
  </div>
</body>
</html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.print() }
  }

  const extraFields = EXTRA_FIELDS[selected] ?? []

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Template selector ── */}
      <div>
        <Label className="mb-3 block text-sm font-medium">{t('selectTemplate')}</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {TEMPLATES.map(({ id, labelKey, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTemplate(id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center text-xs transition-colors hover:bg-accent',
                selected === id
                  ? 'border-primary bg-primary/5 text-primary font-semibold ring-1 ring-primary'
                  : 'border-border text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', selected === id ? 'text-primary' : 'text-muted-foreground')} />
              <span className="leading-tight">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Extra fields for this template ── */}
      {extraFields.length > 0 && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
          {extraFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs">{t(field.labelKey)}</Label>
              <Input
                value={params[field.key] ?? ''}
                onChange={(e) => setParam(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Body textarea ── */}
      <div className="space-y-1.5">
        <Label>{t('reportBody')}</Label>
        <Textarea
          value={displayBody}
          onChange={(e) => setBodyOverride(e.target.value)}
          rows={selected === 'hospital' ? 8 : 5}
          className="resize-y font-mono text-sm leading-relaxed"
          dir="auto"
        />
      </div>

      {/* ── Print button ── */}
      <div className="flex justify-end">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          {t('printBtn')}
        </Button>
      </div>
    </div>
  )
}
