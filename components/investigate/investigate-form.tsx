'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Printer, FlaskConical, Baby, TestTube, Pill, Microscope, Droplets, ShieldAlert } from 'lucide-react'
import { getClinicHeaderHtml, getClinicHeaderStyles } from '@/lib/print-utils'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateId = 'sfa' | 'ivf' | 'hp' | 'investigation' | 'vitd' | 'hsg' | 'thrombophila'

interface InvestigateFormProps {
  patientName: string
}

// ─── IVF row type ─────────────────────────────────────────────────────────────

interface IvfRow {
  day: string
  date: string
  merional: string
  cetrotide: string
  chorimoin: string
  note: string
}

function buildDefaultIvfRows(): IvfRow[] {
  const today = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return {
      day: `D${i + 1}`,
      date: `${dd}/${mm}/${yyyy}`,
      merional: '',
      cetrotide: '',
      chorimoin: '',
      note: '',
    }
  })
}

// ─── Default checkbox items per template ─────────────────────────────────────

const HP_ITEMS = ['FSH', 'LH', 'TSH', 'PROLACTINE', 'AMH', 'HOMA SCORE']
const INVESTIGATION_ITEMS = ['CBC', 'Urine analysis', 'RBS', 'BLOOD GROUP', 'OGTT 75mg (2 readings)']
const THROMBOPHILA_ITEMS = [
  'Antithrombin (previously called Antithrombin III)',
  'Protein C',
  'Protein S',
  'Lupus Anticoagulant',
  'Factor V Leiden',
  'Prothrombin Mutation',
  'anti-Cardiolipin IGM antibodies',
  'anti-Cardiolipin IGG antibodies',
  'MTHFD',
  'Antiphospholipid IGG',
  'Antiphospholipid IGM',
  'ANA',
]

// ─── Arabic strings (always used — UI and print) ──────────────────────────────

const AR = {
  selectType:          'اختر نوع الفحص',
  tmplSFA:             'سائل منوي (SFA)',
  tmplIVF:             'برنامج الزراعة (IVF)',
  tmplHP:              'هرمونات (HP)',
  tmplInvestigation:   'فحوصات مخبرية',
  tmplVitD:            'فيتامين د (Vit D)',
  tmplHSG:             'صورة ملونة (HSG)',
  tmplThrombophilia:   'تجلط الدم (Thrombophilia)',
  sfaDaysLabel:        'عدد أيام الامتناع',
  sfaDaysNote:         (days: string) => `يمنع العلاقه الزوجيه لمده ${days} ايام`,
  sfaExtraNotes:       'ملاحظات إضافية',
  sfaNotesPlaceholder: 'ملاحظات اختيارية...',
  ivfHint:             'برنامج الزراعة — أدخل الجرعات والتواريخ',
  hpTests:             'الفحوصات المطلوبة',
  instructions:        'تعليمات',
  invTests:            'الفحوصات المخبرية',
  invCustomLabel:      'فحوصات إضافية (سطر لكل فحص)',
  invCustomPlaceholder:'أضف فحوصات أخرى...',
  invNotes:            'ملاحظات',
  vitdMedLabel:        'الدواء',
  throTests:           'فحوصات التخثر',
  printBtn:            'طباعة',
  printName:           'الاسم',
  printDate:           'التاريخ',
  doctorSignature:     'توقيع الطبيب',
  defaultHpNotes:      'فحص هرمونات // اليوم الثاني من الدوره',
  defaultVitdNotes:    'فيتامين د / حبة مرتين بالاسبوع بعد وجبة الغداء',
  defaultHsgNotes:     'صوره ملونه للرحم // اليوم العاشر من الدوره\nيمنع العلاقه الزوجيه قبل الصوره ب 3 ايام',
  defaultThroNotes:    'بعد 6 اسابيع من التنزيل',
} as const

// ─── Component ────────────────────────────────────────────────────────────────

export function InvestigateForm({ patientName }: InvestigateFormProps) {
  const today = format(new Date(), 'dd-MM-yyyy')

  const TEMPLATES: { id: TemplateId; labelKey: keyof typeof AR; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'sfa',           labelKey: 'tmplSFA',           Icon: FlaskConical },
    { id: 'ivf',           labelKey: 'tmplIVF',           Icon: Baby         },
    { id: 'hp',            labelKey: 'tmplHP',            Icon: TestTube     },
    { id: 'investigation', labelKey: 'tmplInvestigation', Icon: Microscope   },
    { id: 'vitd',          labelKey: 'tmplVitD',          Icon: Pill         },
    { id: 'hsg',           labelKey: 'tmplHSG',           Icon: Droplets     },
    { id: 'thrombophila',  labelKey: 'tmplThrombophilia', Icon: ShieldAlert  },
  ]

  const [selected, setSelected] = useState<TemplateId>('sfa')

  // SFA state
  const [sfaDays, setSfaDays] = useState('4')
  const [sfaNotes, setSfaNotes] = useState('')

  // IVF state
  const [ivfRows, setIvfRows] = useState<IvfRow[]>(() => buildDefaultIvfRows())

  // HP state
  const [hpChecked, setHpChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(HP_ITEMS.map((i) => [i, false]))
  )
  const [hpNotes, setHpNotes] = useState<string>(AR.defaultHpNotes)

  // Investigation state
  const [invChecked, setInvChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(INVESTIGATION_ITEMS.map((i) => [i, false]))
  )
  const [invCustom, setInvCustom] = useState('')
  const [invNotes, setInvNotes] = useState('')

  // Vit D state
  const [vitdMed, setVitdMed] = useState('Biodal  5000 UNITE')
  const [vitdNotes, setVitdNotes] = useState<string>(AR.defaultVitdNotes)

  // HSG state
  const [hsgNotes, setHsgNotes] = useState<string>(AR.defaultHsgNotes)

  // Thrombophilia state
  const [throChecked, setThroChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(THROMBOPHILA_ITEMS.map((i) => [i, false]))
  )
  const [throNotes, setThroNotes] = useState<string>(AR.defaultThroNotes)

  // ── Helpers ────────────────────────────────────────────────────────────────
  function updateIvfRow(index: number, field: keyof IvfRow, value: string) {
    setIvfRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }
  function toggleHp(item: string) { setHpChecked((prev) => ({ ...prev, [item]: !prev[item] })) }
  function toggleInv(item: string) { setInvChecked((prev) => ({ ...prev, [item]: !prev[item] })) }
  function toggleThro(item: string) { setThroChecked((prev) => ({ ...prev, [item]: !prev[item] })) }

  // ── Print (always Arabic / RTL) ────────────────────────────────────────────
  function handlePrint() {
    const dir = 'rtl'
    const lang = 'ar'
    const tmplLabel = AR[TEMPLATES.find((x) => x.id === selected)!.labelKey] as string

    let bodyHtml = ''

    if (selected === 'sfa') {
      bodyHtml = `
        <p class="instruction">${AR.sfaDaysNote(sfaDays)}</p>
        ${sfaNotes ? `<p class="notes">${sfaNotes.replace(/\n/g, '<br/>')}</p>` : ''}
      `
    } else if (selected === 'ivf') {
      const rows = ivfRows.filter((r) => r.date || r.merional || r.cetrotide || r.chorimoin || r.note)
      const printRows = rows.length > 0 ? rows : ivfRows
      bodyHtml = `
        <table class="ivf-table">
          <thead>
            <tr>
              <th>DAY</th>
              <th>${AR.printDate}</th>
              <th>MERIONAL<br/><small>(بالعضل)</small></th>
              <th>Cetrotide<br/><small>(تحت الجلد)</small></th>
              <th>Chorimoin<br/><small>(بالعضل)</small></th>
              <th>ملاحظه</th>
            </tr>
          </thead>
          <tbody>
            ${printRows.map((r) => `<tr>
              <td>${r.day}</td><td>${r.date}</td><td>${r.merional}</td>
              <td>${r.cetrotide}</td><td>${r.chorimoin}</td><td>${r.note}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `
    } else if (selected === 'hp') {
      const items = HP_ITEMS.filter((i) => hpChecked[i])
      bodyHtml = `
        <ul class="check-list">${items.map((i) => `<li>&#x2713; ${i}</li>`).join('')}</ul>
        ${hpNotes ? `<p class="notes">${hpNotes.replace(/\n/g, '<br/>')}</p>` : ''}
      `
    } else if (selected === 'investigation') {
      const items = INVESTIGATION_ITEMS.filter((i) => invChecked[i])
      const customItems = invCustom.split('\n').map((s) => s.trim()).filter(Boolean)
      bodyHtml = `
        <ul class="check-list">${[...items, ...customItems].map((i) => `<li>&#x2713; ${i}</li>`).join('')}</ul>
        ${invNotes ? `<p class="notes">${invNotes.replace(/\n/g, '<br/>')}</p>` : ''}
      `
    } else if (selected === 'vitd') {
      bodyHtml = `
        <p class="medication"><strong>${vitdMed}</strong></p>
        ${vitdNotes ? `<p class="instruction">${vitdNotes.replace(/\n/g, '<br/>')}</p>` : ''}
      `
    } else if (selected === 'hsg') {
      bodyHtml = `<p class="instruction">${hsgNotes.replace(/\n/g, '<br/>')}</p>`
    } else if (selected === 'thrombophila') {
      const items = THROMBOPHILA_ITEMS.filter((i) => throChecked[i])
      bodyHtml = `
        <ul class="check-list">${items.map((i) => `<li>&#x2713; ${i}</li>`).join('')}</ul>
        ${throNotes ? `<p class="notes">${throNotes.replace(/\n/g, '<br/>')}</p>` : ''}
      `
    }

    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${tmplLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; direction: ${dir}; text-align: right; padding: 1.5cm 2cm; color: #111; min-height: 29.7cm; position: relative; font-size:18px; }
    ${getClinicHeaderStyles()}
    .report-meta { display:flex; justify-content:space-between; margin-bottom:24px; font-size:18px; color:#444; border-bottom:1px solid #e0e0e0; padding-bottom:10px; }
    .report-meta span { font-weight:bold; color:#111; }
    .report-title { font-size:18px; font-weight:bold; text-align:center; margin-bottom:28px; text-decoration:underline; text-underline-offset:5px; }
    .instruction { font-size:18px; line-height:2.2; margin-bottom:12px; }
    .medication { font-size:18px; margin-bottom:12px; }
    .notes { font-size:18px; color:#444; margin-top:16px; line-height:2; border-top:1px dashed #ccc; padding-top:10px; }
    .check-list { list-style:none; font-size:18px; line-height:2.2; margin-bottom:16px; padding-right:0; }
    .check-list li { padding-right:8px; }
    .ivf-table { width:100%; border-collapse:collapse; font-size:18px; margin-bottom:16px; }
    .ivf-table th, .ivf-table td { border:1px solid #ccc; padding:5px 8px; text-align:center; }
    .ivf-table th { background:#f0f0f0; font-weight:bold; }
    .stamp-area { position:absolute; bottom:2.5cm; left:2cm; width:140px; height:140px; }
    .stamp-area img { width:140px; height:140px; object-fit:contain; }
    .signature-area { position:absolute; bottom:2.5cm; right:2cm; text-align:center; font-size:18px; }
    .signature-line { border-top:1px solid #333; width:160px; margin:40px auto 6px; }
    @media print { body { padding:1cm 1.5cm; } @page { size:A4; margin:0; } }
  </style>
</head>
<body>
  ${getClinicHeaderHtml()}
  <div class="report-meta">
    <div>${AR.printName}: <span>${selected === 'sfa' ? 'الزوج' : patientName}</span></div>
    <div>${AR.printDate}: <span>${today}</span></div>
  </div>
  <div class="report-title">${tmplLabel}</div>
  ${bodyHtml}
  <div class="stamp-area">
    <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/images/stamp.png" alt="stamp" onerror="this.style.display='none'" />
  </div>
  <div class="signature-area">
    <div class="signature-line"></div>
    <div>${AR.doctorSignature}</div>
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500) }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">

      {/* ── Template selector ── */}
      <div>
        <Label className="mb-3 block text-sm font-medium">{AR.selectType}</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {TEMPLATES.map(({ id, labelKey, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center text-xs transition-colors hover:bg-accent',
                selected === id
                  ? 'border-primary bg-primary/5 text-primary font-semibold ring-1 ring-primary'
                  : 'border-border text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', selected === id ? 'text-primary' : 'text-muted-foreground')} />
              <span className="leading-tight">{AR[labelKey] as string}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SFA ── */}
      {selected === 'sfa' && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-1">
            <Label>{AR.sfaDaysLabel}</Label>
            <Input
              type="number"
              min="1"
              value={sfaDays}
              onChange={(e) => setSfaDays(e.target.value)}
              className="h-8 w-32 text-sm"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              {AR.sfaDaysNote(sfaDays)}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{AR.sfaExtraNotes}</Label>
            <Textarea
              value={sfaNotes}
              onChange={(e) => setSfaNotes(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              placeholder={AR.sfaNotesPlaceholder}
              dir="auto"
            />
          </div>
        </div>
      )}

      {/* ── IVF ── */}
      {selected === 'ivf' && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4 overflow-x-auto">
          <p className="text-xs text-muted-foreground mb-2">{AR.ivfHint}</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border px-2 py-1 text-center">DAY</th>
                <th className="border px-2 py-1 text-center">التاريخ</th>
                <th className="border px-2 py-1 text-center">MERIONAL</th>
                <th className="border px-2 py-1 text-center">Cetrotide</th>
                <th className="border px-2 py-1 text-center">Chorimoin</th>
                <th className="border px-2 py-1 text-center">ملاحظه</th>
              </tr>
            </thead>
            <tbody>
              {ivfRows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="border px-1 py-0.5 text-center font-medium">{row.day}</td>
                  {(['date', 'merional', 'cetrotide', 'chorimoin', 'note'] as (keyof IvfRow)[]).map((field) => (
                    <td key={field} className="border px-1 py-0.5">
                      <input
                        type="text"
                        value={row[field]}
                        onChange={(e) => updateIvfRow(i, field, e.target.value)}
                        className="w-full text-center text-xs rounded border border-transparent focus:border-border focus:bg-background px-1 outline-none"
                        dir="auto"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── HP ── */}
      {selected === 'hp' && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label className="text-sm">{AR.hpTests}</Label>
            <div className="grid grid-cols-2 gap-2">
              {HP_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`hp-${item}`}
                    checked={!!hpChecked[item]}
                    onChange={() => toggleHp(item)}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300"
                  />
                  <label htmlFor={`hp-${item}`} className="text-sm cursor-pointer">{item}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{AR.instructions}</Label>
            <Textarea
              value={hpNotes}
              onChange={(e) => setHpNotes(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              dir="auto"
            />
          </div>
        </div>
      )}

      {/* ── INVESTIGATION ── */}
      {selected === 'investigation' && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label className="text-sm">{AR.invTests}</Label>
            <div className="grid grid-cols-2 gap-2">
              {INVESTIGATION_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`inv-${item}`}
                    checked={!!invChecked[item]}
                    onChange={() => toggleInv(item)}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300"
                  />
                  <label htmlFor={`inv-${item}`} className="text-sm cursor-pointer">{item}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{AR.invCustomLabel}</Label>
            <Textarea
              value={invCustom}
              onChange={(e) => setInvCustom(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              placeholder={AR.invCustomPlaceholder}
              dir="auto"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{AR.invNotes}</Label>
            <Textarea
              value={invNotes}
              onChange={(e) => setInvNotes(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              dir="auto"
            />
          </div>
        </div>
      )}

      {/* ── VIT D ── */}
      {selected === 'vitd' && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-1">
            <Label>{AR.vitdMedLabel}</Label>
            <Input
              value={vitdMed}
              onChange={(e) => setVitdMed(e.target.value)}
              className="h-8 text-sm"
              dir="ltr"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{AR.instructions}</Label>
            <Textarea
              value={vitdNotes}
              onChange={(e) => setVitdNotes(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              dir="auto"
            />
          </div>
        </div>
      )}

      {/* ── HSG ── */}
      {selected === 'hsg' && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-1">
            <Label>{AR.instructions}</Label>
            <Textarea
              value={hsgNotes}
              onChange={(e) => setHsgNotes(e.target.value)}
              rows={4}
              className="text-sm resize-none"
              dir="auto"
            />
          </div>
        </div>
      )}

      {/* ── THROMBOPHILA ── */}
      {selected === 'thrombophila' && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label className="text-sm">{AR.throTests}</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {THROMBOPHILA_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`thro-${item}`}
                    checked={!!throChecked[item]}
                    onChange={() => toggleThro(item)}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300"
                  />
                  <label htmlFor={`thro-${item}`} className="text-xs cursor-pointer leading-tight">{item}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{AR.invNotes}</Label>
            <Textarea
              value={throNotes}
              onChange={(e) => setThroNotes(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              dir="auto"
            />
          </div>
        </div>
      )}

      {/* ── Print button ── */}
      <div className="flex justify-start">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          {AR.printBtn}
        </Button>
      </div>
    </div>
  )
}
