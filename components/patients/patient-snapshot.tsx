'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar, Baby, Stethoscope, Activity, Pencil, X, Check, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updatePatientMedicalHistory } from '@/lib/actions/patients'

// ─── PDH / Note line type ─────────────────────────────────────────────────────
type NoteLine = { text: string; color: 'black' | 'red' }

function parseNoteLines(raw: string): NoteLine[] {
  if (!raw || raw.trim() === '') return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as NoteLine[]
  } catch {
    // plain text — treat as single black line
    return [{ text: raw, color: 'black' }]
  }
  return []
}

function serializeNoteLines(lines: NoteLine[]): string {
  const nonEmpty = lines.filter((l) => l.text.trim() !== '')
  if (nonEmpty.length === 0) return ''
  return JSON.stringify(nonEmpty)
}

interface Visit {
  id: string
  visit_date: string
  chief_complaint: string | null
  diagnosis: string | null
  treatment_plan: string | null
  vital_signs: Record<string, string> | null
  notes: string | null
  appointment_id: string | null
  is_ended?: boolean
  prescriptions: {
    id: string
    medical_record_id: string
    medication_name: string
    dosage: string
    duration: string
    instructions: string | null
  }[]
}

interface PregnancyData {
  id: string
  status: string
  lmp_date: string
  expected_due_date: string
  notes: string | null
  pregnancy_measurements: {
    id: string
    measured_at: string
    gestational_week: number | null
    weight_kg: number | null
    blood_pressure: string | null
    fetal_heartbeat: number | null
    notes: string | null
  }[]
}

interface PatientData {
  id: string
  full_name_ar: string
  full_name_en: string | null
  phone: string
  email: string | null
  patients: {
    date_of_birth: string
    blood_type: string | null
    national_id: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    notes: string | null
    pmh?: string | null
    psh?: string | null
    pdh?: string | null
    parity?: string | null
    married_for?: string | null
    gravida?: number | null
    para?: number | null
  } | null
}

interface PatientSnapshotProps {
  patient: PatientData
  visits: Visit[]
  pregnancies: PregnancyData[]
  /** Override computed lastVisitDate — pass from server when visits may be soft-deleted */
  lastVisitDate?: string | null
}

function calculateAge(dateOfBirth: string): number | null {
  const dob = new Date(dateOfBirth)
  if (isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-CA')
}

export function PatientSnapshot({ patient, visits, pregnancies, lastVisitDate: lastVisitDateProp }: PatientSnapshotProps) {
  const t = useTranslations('patients.snapshot')
  const [editingHistory, setEditingHistory] = useState(false)
  const [editingObHistory, setEditingObHistory] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [historyValues, setHistoryValues] = useState({
    pmh: patient.patients?.pmh ?? '',
    psh: patient.patients?.psh ?? '',
    parity: patient.patients?.parity ?? '',
    married_for: patient.patients?.married_for ?? '',
  })
  const [noteLines, setNoteLines] = useState<NoteLine[]>(
    parseNoteLines(patient.patients?.pdh ?? '')
  )
  const [obValues, setObValues] = useState({
    gravida: patient.patients?.gravida !== null && patient.patients?.gravida !== undefined ? String(patient.patients.gravida) : '',
    para:    patient.patients?.para    !== null && patient.patients?.para    !== undefined ? String(patient.patients.para)    : '',
  })

  const age = useMemo(() => {
    if (!patient.patients?.date_of_birth) return null
    return calculateAge(patient.patients.date_of_birth)
  }, [patient.patients?.date_of_birth])

  const pregnancyCount = pregnancies.length

  // OB History: G (gravida), P (para), A (abortus = G - P)
  const gravidaNum = obValues.gravida !== '' ? parseInt(obValues.gravida, 10) : (patient.patients?.gravida ?? null)
  const paraNum    = obValues.para    !== '' ? parseInt(obValues.para,    10) : (patient.patients?.para    ?? null)
  const gravida = patient.patients?.gravida ?? null
  const para    = patient.patients?.para    ?? null
  const abortus = gravidaNum !== null && paraNum !== null && !isNaN(gravidaNum as number) && !isNaN(paraNum as number)
    ? Math.max(0, (gravidaNum as number) - (paraNum as number) - 1)
    : null

  const lastVisitDate = useMemo(() => {
    // Prefer the server-supplied prop (includes soft-deleted visits with fees)
    if (lastVisitDateProp !== undefined) return lastVisitDateProp
    // Fallback: find the most recent ended visit from the visits array
    for (let i = visits.length - 1; i >= 0; i--) {
      if (visits[i].is_ended) return visits[i].visit_date
    }
    return null
  }, [visits, lastVisitDateProp])


  function handleSaveObHistory() {
    startTransition(async () => {
      const g = obValues.gravida !== '' ? parseInt(obValues.gravida, 10) : null
      const p = obValues.para    !== '' ? parseInt(obValues.para,    10) : null
      const result = await updatePatientMedicalHistory(patient.id, { gravida: g, para: p })
      if (!result.error) setEditingObHistory(false)
    })
  }

  function handleSaveHistory() {
    startTransition(async () => {
      const pdh = serializeNoteLines(noteLines)
      const result = await updatePatientMedicalHistory(patient.id, {
        pmh: historyValues.pmh || undefined,
        psh: historyValues.psh || undefined,
        pdh: pdh || undefined,
        parity: historyValues.parity || undefined,
        married_for: historyValues.married_for || undefined,
      })
      if (!result.error) setEditingHistory(false)
    })
  }

  const hasHistory = historyValues.pmh || historyValues.psh || noteLines.length > 0 || historyValues.parity || historyValues.married_for

  return (
    <div className="space-y-3">
      {/* ── Vital Stats ── */}
      <Card className="border-muted bg-muted/30">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t('title')}
            </CardTitle>
            {!editingObHistory ? (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingObHistory(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingObHistory(false); setObValues({ gravida: patient.patients?.gravida !== null && patient.patients?.gravida !== undefined ? String(patient.patients.gravida) : '', para: patient.patients?.para !== null && patient.patients?.para !== undefined ? String(patient.patients.para) : '' }) }}>
                  <X className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={handleSaveObHistory} disabled={isPending}>
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 pt-0">
          {editingObHistory ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-muted-foreground">{t('pregnancies')} (G)</label>
                <Input type="number" min="0" step="1" value={obValues.gravida} onChange={(e) => setObValues((p) => ({ ...p, gravida: e.target.value }))} className="h-7 text-xs" dir="ltr" />
              </div>
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-muted-foreground">{t('deliveries')} (P)</label>
                <Input type="number" min="0" step="1" value={obValues.para} onChange={(e) => setObValues((p) => ({ ...p, para: e.target.value }))} className="h-7 text-xs" dir="ltr" />
              </div>
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-muted-foreground">{t('miscarriages')} (A)</label>
                <div className="h-7 flex items-center text-sm font-semibold">
                  {abortus !== null && !isNaN(abortus) ? abortus : '—'}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {/* Age */}
              <SnapshotItem
                icon={<Calendar className="h-4 w-4 text-blue-500" />}
                label={t('age')}
                value={age !== null ? `${age} ${t('years')}` : t('noData')}
              />

              {/* G — Gravida */}
              <SnapshotItem
                icon={<Baby className="h-4 w-4 text-pink-500" />}
                label={`${t('pregnancies')} (G)`}
                value={gravida !== null ? String(gravida) : String(pregnancyCount)}
              />

              {/* P — Para */}
              <SnapshotItem
                icon={<Baby className="h-4 w-4 text-green-500" />}
                label={`${t('deliveries')} (P)`}
                value={para !== null ? String(para) : t('noData')}
              />

              {/* A — Abortus (auto-computed) */}
              <SnapshotItem
                icon={<Baby className="h-4 w-4 text-amber-500" />}
                label={`${t('miscarriages')} (A)`}
                value={abortus !== null ? String(abortus) : t('noData')}
              />

              {/* Last Visit */}
              <SnapshotItem
                icon={<Stethoscope className="h-4 w-4 text-purple-500" />}
                label={t('lastVisit')}
                value={lastVisitDate ? formatDate(lastVisitDate) : t('noData')}
              />

            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Medical History (PMH / PSH / Note / Parity) ── */}
      <Card className="border-muted bg-muted/20">
        <CardContent className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('medicalHistoryTitle')}
            </p>
            {!editingHistory ? (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingHistory(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                  setEditingHistory(false)
                  setHistoryValues({ pmh: patient.patients?.pmh ?? '', psh: patient.patients?.psh ?? '', parity: patient.patients?.parity ?? '', married_for: patient.patients?.married_for ?? '' })
                  setNoteLines(parseNoteLines(patient.patients?.pdh ?? ''))
                }}>
                  <X className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={handleSaveHistory} disabled={isPending}>
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {editingHistory ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <HistoryEditField label="PMH" value={historyValues.pmh} placeholder="FREE / DM / HTN..." onChange={(v) => setHistoryValues((p) => ({ ...p, pmh: v }))} />
                <HistoryEditField label="PSH" value={historyValues.psh} placeholder="FREE / CS / Appendix..." onChange={(v) => setHistoryValues((p) => ({ ...p, psh: v }))} />
                <HistoryEditField label="Parity" value={historyValues.parity} placeholder="P0 / P1G2..." onChange={(v) => setHistoryValues((p) => ({ ...p, parity: v }))} />
                <HistoryEditField label="Married for" value={historyValues.married_for} placeholder="e.g. 2 years..." onChange={(v) => setHistoryValues((p) => ({ ...p, married_for: v }))} />
              </div>
              {/* Note (PDH) — per-line with color toggle */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-muted-foreground">Note</label>
                <div className="space-y-1.5">
                  {noteLines.map((line, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={line.text}
                        onChange={(e) => setNoteLines((prev) => prev.map((l, idx) => idx === i ? { ...l, text: e.target.value } : l))}
                        className="h-8 text-sm flex-1"
                        style={{ color: line.color === 'red' ? '#dc2626' : '#000000' }}
                        placeholder="—"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 shrink-0"
                        style={{ color: line.color === 'red' ? '#dc2626' : '#000000', borderColor: line.color === 'red' ? '#dc2626' : undefined }}
                        onClick={() => setNoteLines((prev) => prev.map((l, idx) => idx === i ? { ...l, color: l.color === 'black' ? 'red' : 'black' } : l))}
                        title="Toggle color"
                      >
                        {line.color === 'red' ? 'Red' : 'Black'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => setNoteLines((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setNoteLines((prev) => [...prev, { text: '', color: 'black' }])}
                >
                  <Plus className="h-3 w-3 me-1" /> Add line
                </Button>
              </div>
            </div>
          ) : hasHistory ? (
            <div className="space-y-2">
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                {historyValues.pmh && <HistoryChip label="PMH" value={historyValues.pmh} />}
                {historyValues.psh && <HistoryChip label="PSH" value={historyValues.psh} />}
                {historyValues.parity && <HistoryChip label="Parity" value={historyValues.parity} />}
                {historyValues.married_for && <HistoryChip label="Married for" value={historyValues.married_for} />}
              </div>
              {noteLines.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-muted-foreground">Note:</span>
                  {noteLines.map((line, i) => (
                    <span key={i} className="text-sm font-medium" style={{ color: line.color === 'red' ? '#dc2626' : 'inherit' }}>
                      {line.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('noHistoryText')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SnapshotItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function HistoryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="font-semibold text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function HistoryEditField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-0.5">
      <label className="text-sm font-semibold text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  )
}
