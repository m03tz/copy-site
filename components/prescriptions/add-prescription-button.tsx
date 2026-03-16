'use client'

import { useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pill, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { createPrescription } from '@/lib/actions/prescriptions'

interface Patient {
  id: string
  full_name_ar: string
  full_name_en: string | null
}

interface VisitRecord {
  id: string
  patient_id: string
  visit_date: string
  patient_name: string
}

interface AddPrescriptionButtonProps {
  patients: Patient[]
  recentVisits: VisitRecord[]
}

interface MedicationRow {
  medication_name: string
  dosage: string
  quantity: string
  instructions: string
  duration: string
}

export function AddPrescriptionButton({ recentVisits }: AddPrescriptionButtonProps) {
  const t = useTranslations('prescriptions')
  const tPage = useTranslations('prescriptionsPage')
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<string>('')
  const [medications, setMedications] = useState<MedicationRow[]>([
    { medication_name: '', dosage: '', quantity: '', instructions: '', duration: '' },
  ])

  function addMedication() {
    setMedications([...medications, { medication_name: '', dosage: '', duration: '', instructions: '', quantity: '' }])
  }

  function removeMedication(index: number) {
    setMedications(medications.filter((_, i) => i !== index))
  }

  function updateMedication(index: number, field: keyof MedicationRow, value: string) {
    const updated = [...medications]
    updated[index] = { ...updated[index], [field]: value }
    setMedications(updated)
  }

  function handleSubmit() {
    setError(null)
    setSuccess(false)

    if (!selectedVisit) {
      setError(locale === 'ar' ? 'يرجى اختيار الزيارة' : 'Please select a visit')
      return
    }

    const visit = recentVisits.find((v) => v.id === selectedVisit)
    if (!visit) return

    // Validate medications
    const validMeds = medications.filter((m) => m.medication_name.trim() && m.dosage.trim() && m.duration.trim())
    if (validMeds.length === 0) {
      setError(locale === 'ar' ? 'يرجى إضافة دواء واحد على الأقل' : 'Please add at least one medication')
      return
    }

    startTransition(async () => {
      const result = await createPrescription({
        medical_record_id: selectedVisit,
        patient_id: visit.patient_id,
        medications: validMeds.map((m) => ({
          medication_name: m.medication_name,
          dosage: m.dosage,
          quantity: m.quantity || undefined,
          instructions: m.instructions || undefined,
          duration: m.duration,
        })),
      })

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'An error occurred')
      } else {
        setSuccess(true)
        router.refresh()
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          setSelectedVisit('')
          setMedications([{ medication_name: '', dosage: '', duration: '', instructions: '', quantity: '' }])
        }, 1500)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); setSuccess(false) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pill className="h-4 w-4 me-1" />
          {t('create')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('create')}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">
              {locale === 'ar' ? 'تم حفظ الوصفة بنجاح' : 'Prescription saved successfully'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select Visit */}
            <div className="space-y-1">
              <Label>{tPage('selectVisit')}</Label>
              <Select value={selectedVisit} onValueChange={setSelectedVisit}>
                <SelectTrigger>
                  <SelectValue placeholder={tPage('selectVisit')} />
                </SelectTrigger>
                <SelectContent>
                  {recentVisits.map((visit) => (
                    <SelectItem key={visit.id} value={visit.id}>
                      {visit.patient_name} — {visit.visit_date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Medications */}
            <div className="space-y-3">
              {/* Column headers */}
              <div className="grid grid-cols-[16px_2fr_1fr_1fr_1fr_1fr_32px] gap-2 px-1 text-xs font-medium text-muted-foreground">
                <div />
                <span>Medication <span className="text-destructive">*</span></span>
                <span>Dose</span>
                <span>Amount</span>
                <span>Frequency</span>
                <span>Duration</span>
                <div />
              </div>

              {medications.map((med, index) => (
                <div key={index} className="grid grid-cols-[16px_2fr_1fr_1fr_1fr_1fr_32px] gap-2 items-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" className="text-sky-400 fill-current shrink-0">
                    <polygon points="5,0 10,5 5,10 0,5" />
                  </svg>

                  <Input
                    value={med.medication_name}
                    onChange={(e) => updateMedication(index, 'medication_name', e.target.value)}
                    placeholder="Medication name"
                  />
                  <Input
                    value={med.dosage}
                    onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                    placeholder="e.g., 500mg"
                  />
                  <Input
                    value={med.quantity}
                    onChange={(e) => updateMedication(index, 'quantity', e.target.value)}
                    placeholder="e.g., 1 tab"
                  />
                  <Input
                    value={med.instructions}
                    onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                    placeholder="e.g., twice daily"
                  />
                  <Input
                    value={med.duration}
                    onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                    placeholder="e.g., 7 days"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMedication(index)}
                    disabled={medications.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addMedication}>
              <Plus className="h-4 w-4 me-1" />
              {t('form.addMedication')}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                {t('actions.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? '...' : t('actions.save')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
