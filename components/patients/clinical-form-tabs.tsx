'use client'

import { useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FlaskConical, Baby, Pill, FolderOpen, TestTube, CalendarPlus, DoorOpen, FileText } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { endVisitRecord } from '@/lib/actions/medical-records'

const VISIT_TYPES = ['VISIT', 'INSURANCE', 'CS', 'LAP', 'IVF', 'IUI', 'NVD', 'D&C', 'OTHERS'] as const
import { InfertilitySection } from '@/components/patients/infertility-section'
import { PregnancyList } from '@/components/pregnancy/pregnancy-list'
import { PrescriptionList } from '@/components/prescriptions/prescription-list'
import { FileUpload } from '@/components/files/file-upload'
import { FileList } from '@/components/files/file-list'
import { TestRequestForm } from '@/components/lab-tests/test-request-form'
import { MedicalReportForm } from '@/components/medical-report/medical-report-form'
import { BookingForm } from '@/components/appointments/booking-form'
import type { InfertilityRecord, Pregnancy, PregnancyMeasurement } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type PregnancyWithMeasurements = Pregnancy & {
  pregnancy_measurements: PregnancyMeasurement[]
}

type FormMode = 'infertility' | 'anc' | 'prescriptions' | 'medicalReport' | 'files' | 'testRequest' | 'booking'

interface LatestVitals {
  blood_pressure?: string
  weight?: string
}

interface VisitWithPrescriptions {
  id: string
  visit_date: string
  is_ended?: boolean
  medication_only?: boolean
  prescriptions: {
    id: string
    medical_record_id: string
    medication_name: string
    dosage: string
    duration: string
    instructions?: string | null
    quantity?: string | null
  }[]
}

interface FileRow {
  id: string
  file_name: string
  file_type: string
  file_path: string
  description: string | null
  medical_record_id: string | null
  created_at: string
}

interface ClinicalFormTabsProps {
  patientId: string
  patientName: string
  infertilityRecords: InfertilityRecord[]
  pregnancies: PregnancyWithMeasurements[]
  activePregnancy: PregnancyWithMeasurements | null
  latestVitals?: LatestVitals | null
  visits: VisitWithPrescriptions[]
  files: FileRow[]
  doctorId: string
  /** Path to navigate to after end-visit. Defaults to /{locale}/doctor/medical-records */
  afterEndVisitPath?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClinicalFormTabs({
  patientId,
  patientName,
  infertilityRecords,
  pregnancies,
  activePregnancy,
  latestVitals,
  visits,
  files,
  doctorId,
  afterEndVisitPath,
}: ClinicalFormTabsProps) {
  const t = useTranslations('anc')
  const params = useParams()
  const [mode, setMode] = useState<FormMode>('infertility')

  // End-visit dialog state
  const [endOpen, setEndOpen] = useState(false)
  const [endFee, setEndFee] = useState('')
  const [endVisitType, setEndVisitType] = useState('')
  const [endError, setEndError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Find today's active visit (non-ended, non-medication_only)
  const todayStr = new Date().toISOString().slice(0, 10)
  const activeVisit = visits.find(
    (v) => !v.is_ended && !v.medication_only && v.visit_date?.slice(0, 10) === todayStr
  )

  function handleEndVisit() {
    if (!endVisitType) {
      setEndError('يرجى اختيار نوع الزيارة')
      return
    }
    const amount = parseFloat(endFee)
    if (!endFee || isNaN(amount) || amount < 0) {
      setEndError('يرجى إدخال مبلغ صحيح')
      return
    }
    if (!activeVisit) return
    setEndError(null)
    startTransition(async () => {
      const result = await endVisitRecord(activeVisit.id, patientId, amount, endVisitType)
      if (result.error) {
        setEndError(typeof result.error === 'string' ? result.error : 'حدث خطأ')
        return
      }
      setEndOpen(false)
      setEndFee('')
      const locale = (params?.locale as string) || 'ar'
      window.location.href = afterEndVisitPath ?? `/${locale}/doctor/medical-records`
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Mode Toggle + End Visit button ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
          <ModeButton label={t('gynSection')} icon={<FlaskConical className="h-4 w-4" />} active={mode === 'infertility'} onClick={() => setMode('infertility')} />
          <ModeButton label={t('ancSection')} icon={<Baby className="h-4 w-4" />} active={mode === 'anc'} onClick={() => setMode('anc')} />
          <ModeButton label={t('tabPrescriptions')} icon={<Pill className="h-4 w-4" />} active={mode === 'prescriptions'} onClick={() => setMode('prescriptions')} />
          <ModeButton label={t('tabMedicalReport')} icon={<FileText className="h-4 w-4" />} active={mode === 'medicalReport'} onClick={() => setMode('medicalReport')} />
          <ModeButton label={t('tabFiles')} icon={<FolderOpen className="h-4 w-4" />} active={mode === 'files'} onClick={() => setMode('files')} />
          <ModeButton label={t('tabLabTests')} icon={<TestTube className="h-4 w-4" />} active={mode === 'testRequest'} onClick={() => setMode('testRequest')} />
          <ModeButton label={t('tabBooking')} icon={<CalendarPlus className="h-4 w-4" />} active={mode === 'booking'} onClick={() => setMode('booking')} />
        </div>
        {activeVisit && (
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => { setEndFee(''); setEndVisitType(''); setEndError(null); setEndOpen(true) }}
          >
            <DoorOpen className="h-4 w-4" />
            <span className="hidden sm:inline">{t('endVisitBtn')}</span>
          </Button>
        )}
      </div>

      {/* ── End Visit Dialog ── */}
      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنهاء الزيارة — تسجيل الرسوم</DialogTitle>
            <DialogDescription>أدخل قيمة رسوم الزيارة بالدينار الأردني</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Visit Type */}
            <div className="space-y-1.5">
              <Label>نوع الزيارة</Label>
              <Select value={endVisitType} onValueChange={setEndVisitType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الزيارة" />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_TYPES.map((vt) => (
                    <SelectItem key={vt} value={vt}>{vt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Fee */}
            <div className="space-y-1.5">
              <Label>الرسوم (دينار أردني)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="مثال: 10"
                value={endFee}
                onChange={(e) => setEndFee(e.target.value)}
                dir="ltr"
              />
            </div>
            {endError && <p className="text-sm text-destructive">{endError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEndOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleEndVisit}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? '...' : 'إنهاء الزيارة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Active pregnancy quick-info banner (ANC mode) ── */}
      {mode === 'anc' && activePregnancy && (
        <ActivePregnancyBanner pregnancy={activePregnancy} />
      )}

      {/* ── Form Content ── */}
      {mode === 'infertility' && (
        <InfertilitySection
          records={infertilityRecords}
          patientId={patientId}
          patientName={patientName}
          canEdit={true}
        />
      )}

      {mode === 'anc' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">{t('ancSection')}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t('ancDescription')}</p>
          </div>
          <PregnancyList
            pregnancies={pregnancies}
            patientId={patientId}
            latestVitals={latestVitals}
          />
        </div>
      )}

      {mode === 'prescriptions' && (
        <PrescriptionList
          visits={visits}
          patientName={patientName}
          patientId={patientId}
        />
      )}

      {mode === 'medicalReport' && (
        <MedicalReportForm
          patientName={patientName}
          activePregnancy={activePregnancy
            ? { lmp_date: activePregnancy.lmp_date, expected_due_date: activePregnancy.expected_due_date }
            : null}
        />
      )}

      {mode === 'files' && (
        <div className="space-y-6">
          <FileUpload
            patientId={patientId}
            visits={visits.map((v) => ({ id: v.id, visit_date: v.visit_date }))}
          />
          <FileList files={files} patientId={patientId} />
        </div>
      )}

      {mode === 'testRequest' && (
        <TestRequestForm patientName={patientName} />
      )}

      {mode === 'booking' && (
        <BookingForm
          patients={[]}
          doctorId={doctorId}
          preselectedPatientId={patientId}
          preselectedPatientName={patientName}
        />
      )}
    </div>
  )
}

// ─── Mode Button ──────────────────────────────────────────────────────────────

function ModeButton({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <Button variant={active ? 'default' : 'ghost'} size="sm" onClick={onClick} className="gap-1.5">
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}

// ─── Active Pregnancy Banner ──────────────────────────────────────────────────

function ActivePregnancyBanner({ pregnancy }: { pregnancy: PregnancyWithMeasurements }) {
  const t = useTranslations('anc')
  const lmp = new Date(pregnancy.lmp_date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((now.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24))
  const weeks = Math.floor(diffDays / 7)
  const days = diffDays % 7

  const edd = new Date(pregnancy.expected_due_date)
  edd.setHours(0, 0, 0, 0)
  const daysUntilDue = Math.floor((edd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isCritical = daysUntilDue >= 0 && daysUntilDue <= 7
  const isWarning  = daysUntilDue >  7 && daysUntilDue <= 14

  const bannerClass = isCritical
    ? 'border-red-400 bg-red-50 dark:bg-red-950/20'
    : isWarning
      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
      : 'border-green-300 bg-green-50 dark:bg-green-950/20'

  const daysClass = isCritical
    ? 'font-bold text-red-600'
    : isWarning
      ? 'font-medium text-amber-700'
      : 'font-medium'

  const genderLabel =
    pregnancy.baby_gender === 'male' ? t('genderMale') :
    pregnancy.baby_gender === 'female' ? t('genderFemale') : null

  return (
    <div className={`rounded-lg border px-4 py-3 space-y-2 ${bannerClass}`}>
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
          {t('activePregnancyLabel')}
        </p>
        {genderLabel && (
          <span className="text-xs font-medium bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">
            {genderLabel}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{t('lmpLabel')}</p>
          <p className="font-medium">{pregnancy.lmp_date}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('gaLabel')}</p>
          <p className="font-medium">{weeks}w {days}d</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('eddLabel')}</p>
          <p className="font-medium">{pregnancy.expected_due_date}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('daysLeftLabel')}</p>
          <p className={daysClass}>
            {daysUntilDue > 0 ? daysUntilDue : daysUntilDue === 0 ? t('dueToday') : t('overdue')}
          </p>
        </div>
      </div>
    </div>
  )
}
