'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { VisitForm } from '@/components/medical-records/visit-form'
import { PrescriptionForm } from '@/components/prescriptions/prescription-form'
import { deleteVisitRecord, endVisitRecord, updateVisitFee } from '@/lib/actions/medical-records'
import { CalendarDays, Pencil, Plus, FileText, Activity, Trash2, CircleDollarSign, CheckCircle2, Hash } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const VISIT_TYPES = ['VISIT', 'INSURANCE', 'CS', 'LAP', 'IVF', 'IUI', 'NVD', 'D&C', 'OTHERS'] as const

interface PrescriptionRow {
  id: string
  medication_name: string
  dosage: string
  duration: string
  instructions?: string | null
}

interface VitalSigns {
  blood_pressure?: string
  weight?: string
  temperature?: string
  pulse?: string
}

interface VisitRecord {
  id: string
  visit_date: string
  chief_complaint?: string | null
  diagnosis?: string | null
  treatment_plan?: string | null
  vital_signs?: VitalSigns | null
  notes: string | null
  appointment_id?: string | null
  is_ended?: boolean
  visit_fee?: number | null
  prescriptions: PrescriptionRow[]
}

interface VisitCardProps {
  visit: VisitRecord
  patientId: string
  /** Whether the current user can create prescriptions (doctor only) */
  canPrescribe?: boolean
  /** Whether the current user can end visits and set fees (doctor + secretary) */
  canEndVisit?: boolean
  /** Optional: show patient name (for all-records view) */
  patientName?: string
  /** Queue number within the day (1, 2, 3...) */
  dayQueueNum?: number
  /** If true, redirect to medical-records page after ending visit */
  redirectAfterEnd?: boolean
  /** Called when clicking the patient name to navigate to patient profile */
  onPatientClick?: () => void
  /** Most recent previous visit date for this patient — shown in red */
  lastVisitDate?: string | null
}

export function VisitCard({ visit, patientId, canPrescribe = true, canEndVisit, patientName, dayQueueNum, redirectAfterEnd = true, onPatientClick, lastVisitDate }: VisitCardProps) {
  // If canEndVisit is not explicitly set, fall back to canPrescribe (backward compatibility)
  const canEnd = canEndVisit ?? canPrescribe
  const t = useTranslations('visits')
  const tPrescriptions = useTranslations('prescriptions')
  const router = useRouter()
  const params = useParams()
  const [editOpen, setEditOpen] = useState(false)
  const [prescribeOpen, setPrescribeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // End visit dialog
  const [endVisitOpen, setEndVisitOpen] = useState(false)
  const [visitFee, setVisitFee] = useState('')
  const [visitType, setVisitType] = useState('')
  const [feeError, setFeeError] = useState<string | null>(null)

  // Edit fee dialog (for already-ended visits)
  const [editFeeOpen, setEditFeeOpen] = useState(false)
  const [editFeeValue, setEditFeeValue] = useState('')
  const [editFeeError, setEditFeeError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  function handleEndVisit() {
    const amount = parseFloat(visitFee)
    if (!visitType) {
      setFeeError('يرجى اختيار نوع الزيارة')
      return
    }
    if (!visitFee || isNaN(amount) || amount < 0) {
      setFeeError('يرجى إدخال مبلغ صحيح')
      return
    }
    setFeeError(null)
    startTransition(async () => {
      // Mark visit as ended and save fee
      const result = await endVisitRecord(visit.id, patientId, amount, visitType)
      if (result.error) {
        setFeeError(typeof result.error === 'string' ? result.error : 'حدث خطأ')
        return
      }
      setEndVisitOpen(false)
      setVisitFee('')
      // Redirect to visit log page
      if (redirectAfterEnd) {
        const locale = (params?.locale as string) || 'ar'
        router.push(`/${locale}/doctor/medical-records`)
      }
    })
  }

  function handleEditFee() {
    const amount = parseFloat(editFeeValue)
    if (!editFeeValue || isNaN(amount) || amount < 0) {
      setEditFeeError('يرجى إدخال مبلغ صحيح')
      return
    }
    setEditFeeError(null)
    startTransition(async () => {
      const result = await updateVisitFee(visit.id, patientId, amount)
      if (result.error) {
        setEditFeeError(typeof result.error === 'string' ? result.error : 'حدث خطأ')
      } else {
        setEditFeeOpen(false)
        setEditFeeValue('')
      }
    })
  }

  function handleDelete() {
    setDeleteError(null)
    setDeleteOpen(false)
    startTransition(async () => {
      const result = await deleteVisitRecord(visit.id, patientId)
      if (result.error) {
        setDeleteError(typeof result.error === 'string' ? result.error : 'حدث خطأ أثناء الحذف')
        setDeleteOpen(false)
      }
    })
  }

  const prescriptionCount = visit.prescriptions?.length ?? 0
  const vitalSigns = visit.vital_signs as VitalSigns | null
  const isEnded = visit.is_ended === true

  let formattedDate = visit.visit_date
  try {
    formattedDate = format(new Date(visit.visit_date), 'dd-MM-yyyy')
  } catch {
    // keep original
  }

  return (
    <>
      <Card
        className={`w-full ${isEnded ? 'border-green-200 bg-green-50/30' : ''}${onPatientClick ? ' cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
        onClick={onPatientClick ?? undefined}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2 text-base flex-wrap">
                {dayQueueNum != null && (
                  <Badge variant="secondary" className="text-xs font-bold flex items-center gap-0.5 shrink-0">
                    <Hash className="h-3 w-3" />
                    {dayQueueNum}
                  </Badge>
                )}
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {formattedDate}
                {isEnded && (
                  <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    منتهية
                  </Badge>
                )}
              </CardTitle>
              {patientName && (
                <span className="text-base font-semibold">
                  {patientName}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {/* Edit visit data */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setEditOpen(true) }}
                aria-label={t('edit')}
              >
                <Pencil className="h-4 w-4" />
              </Button>

              {/* Add prescription */}
              {canPrescribe && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setPrescribeOpen(true) }}
                  aria-label={tPrescriptions('create')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}

              {/* End Visit button (only for active visits) */}
              {canEnd && !isEnded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); setVisitFee(''); setVisitType(''); setFeeError(null); setEndVisitOpen(true) }}
                  aria-label="إنهاء الزيارة"
                  title="إنهاء الزيارة"
                >
                  <CircleDollarSign className="h-4 w-4" />
                </Button>
              )}

              {/* Edit Fee button (only for ended visits) */}
              {canEnd && isEnded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:bg-green-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditFeeValue(visit.visit_fee?.toString() ?? '')
                    setEditFeeError(null)
                    setEditFeeOpen(true)
                  }}
                  aria-label="تعديل الرسوم"
                  title="تعديل الرسوم"
                >
                  <CircleDollarSign className="h-4 w-4" />
                </Button>
              )}

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); setDeleteOpen(true) }}
                disabled={isPending}
                aria-label="حذف الزيارة"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Vital Signs */}
          {vitalSigns && Object.keys(vitalSigns).length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" />
                {t('card.vitalSigns')}
              </p>
              <div className="flex flex-wrap gap-2">
                {vitalSigns.blood_pressure && (
                  <Badge variant="outline" className="text-xs">
                    {t('form.bloodPressure')}: {vitalSigns.blood_pressure}
                  </Badge>
                )}
                {vitalSigns.weight && (
                  <Badge variant="outline" className="text-xs">
                    {t('form.weight')}: {vitalSigns.weight} kg
                  </Badge>
                )}
                {vitalSigns.temperature && (
                  <Badge variant="outline" className="text-xs">
                    {t('form.temperature')}: {vitalSigns.temperature}°C
                  </Badge>
                )}
                {vitalSigns.pulse && (
                  <Badge variant="outline" className="text-xs">
                    {t('form.pulse')}: {vitalSigns.pulse} bpm
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Notes — ANC / GYNE */}
          {visit.notes ? (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {t('card.notes')}
              </p>
              {visit.notes === 'ANC' ? (
                <span className="font-bold text-red-600 text-sm">ANC</span>
              ) : visit.notes === 'GYNE' ? (
                <span className="font-bold text-green-600 text-sm">GYNE</span>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{visit.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{t('card.notes')}: —</p>
          )}

          {/* Last visit date */}
          {lastVisitDate && (
            <p className="text-xs font-medium text-red-500">
              آخر زيارة: {lastVisitDate}
            </p>
          )}

          {/* Prescription count badge */}
          {prescriptionCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>
                {prescriptionCount} {tPrescriptions('title').toLowerCase()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Visit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('edit')}</DialogTitle>
          </DialogHeader>
          <VisitForm
            patientId={patientId}
            existingRecord={{
              id: visit.id,
              visit_date: visit.visit_date,
              chief_complaint: visit.chief_complaint,
              diagnosis: visit.diagnosis,
              treatment_plan: visit.treatment_plan,
              vital_signs: vitalSigns,
              notes: visit.notes,
              appointment_id: visit.appointment_id,
            }}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Prescription Dialog */}
      {canPrescribe && (
        <Dialog open={prescribeOpen} onOpenChange={setPrescribeOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{tPrescriptions('create')}</DialogTitle>
            </DialogHeader>
            <PrescriptionForm
              medicalRecordId={visit.id}
              patientId={patientId}
              onSuccess={() => setPrescribeOpen(false)}
              onCancel={() => setPrescribeOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* End Visit / Fee Dialog */}
      {canEnd && (
        <Dialog open={endVisitOpen} onOpenChange={setEndVisitOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنهاء الزيارة — تسجيل الرسوم</DialogTitle>
              <DialogDescription>
                أدخل قيمة رسوم الزيارة بالدينار الأردني
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {/* Visit Type */}
              <div className="space-y-1.5">
                <Label>نوع الزيارة</Label>
                <Select value={visitType} onValueChange={setVisitType}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الزيارة" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Amount */}
              <div className="space-y-1.5">
                <Label>المبلغ (دينار أردني)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="مثال: 10"
                  value={visitFee}
                  onChange={(e) => setVisitFee(e.target.value)}
                  dir="ltr"
                />
              </div>
              {feeError && <p className="text-sm text-destructive">{feeError}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEndVisitOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleEndVisit} disabled={isPending} className="bg-green-600 hover:bg-green-700">
                {isPending ? '...' : 'إنهاء الزيارة'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Fee Dialog (for already-ended visits) */}
      {canEnd && (
        <Dialog open={editFeeOpen} onOpenChange={setEditFeeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل رسوم الزيارة</DialogTitle>
              <DialogDescription>
                تعديل قيمة رسوم الزيارة بالدينار الأردني
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="مثال: 10"
                value={editFeeValue}
                onChange={(e) => setEditFeeValue(e.target.value)}
                dir="ltr"
              />
              {editFeeError && <p className="text-sm text-destructive">{editFeeError}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditFeeOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleEditFee} disabled={isPending}>
                {isPending ? '...' : 'حفظ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف الزيارة</DialogTitle>
            <DialogDescription>
              سيتم حذف سجل زيارة {formattedDate} بشكل نهائي. هل أنت متأكد؟
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
