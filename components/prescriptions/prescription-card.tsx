'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PrescriptionPrint } from '@/components/prescriptions/prescription-print'
import { PrescriptionForm } from '@/components/prescriptions/prescription-form'
import { Pill, Trash2, Pencil, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deletePrescription, updatePrescription } from '@/lib/actions/prescriptions'

// DB field mapping: dosage=frequency, instructions=frequency_type, duration=period

interface MedicationRow {
  id: string
  medical_record_id: string
  medication_name: string
  dosage: string       // frequency value
  duration: string     // period
  quantity?: string | null
  instructions?: string | null  // frequency_type: day | week | month
}

interface PrescriptionCardProps {
  /** All medications for one visit (same medical_record_id) */
  medications: MedicationRow[]
  visitDate: string
  patientName: string
  patientId?: string
}

export function PrescriptionCard({
  medications,
  visitDate,
  patientName,
  patientId,
}: PrescriptionCardProps) {
  const t = useTranslations('prescriptions')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingMed, setEditingMed] = useState<MedicationRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const medicalRecordId = medications[0]?.medical_record_id

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deletePrescription(id)
    setDeletingId(null)
  }

  async function handleEditSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingMed) return
    const form = e.currentTarget
    const fd = new FormData(form)
    setSaving(true)
    await updatePrescription({
      id: editingMed.id,
      medication_name: fd.get('medication_name') as string,
      dosage: fd.get('dosage') as string,
      duration: fd.get('duration') as string,
      quantity: (fd.get('quantity') as string) || undefined,
      instructions: (fd.get('instructions') as string) || undefined,
    })
    setSaving(false)
    setEditingMed(null)
  }

  let formattedDate = visitDate
  try {
    formattedDate = format(new Date(visitDate), 'dd-MM-yyyy')
  } catch {
    // keep original
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4 text-muted-foreground" />
              {formattedDate}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                title="Add medication"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <PrescriptionPrint
                patientName={patientName}
                visitDate={visitDate}
                medications={medications}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {t('card.medications')}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-start py-1 pe-3 font-medium">{t('card.colDrug')}</th>
                  <th className="text-center py-1 pe-3 font-medium">{t('card.colFrequency')}</th>
                  <th className="text-center py-1 pe-3 font-medium">{t('card.colFreqType')}</th>
                  <th className="text-center py-1 pe-3 font-medium">{t('card.colPeriod')}</th>
                  <th className="py-1 w-8" />
                </tr>
              </thead>
              <tbody>
                {medications.map((med) => (
                  <tr key={med.id} className="border-b last:border-0">
                    <td className="py-1 pe-3">{med.medication_name}</td>
                    <td className="py-1 pe-3 text-center">{med.dosage}</td>
                    <td className="py-1 pe-3 text-center">{med.instructions === 'day' ? t('card.freqDay') : med.instructions === 'week' ? t('card.freqWeek') : med.instructions === 'month' ? t('card.freqMonth') : med.instructions ?? '—'}</td>
                    <td className="py-1 pe-3 text-center">{med.duration}</td>
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setEditingMed(med)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(med.id)}
                          disabled={deletingId === med.id}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add medication dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>إضافة دواء</DialogTitle>
          </DialogHeader>
          {medicalRecordId && patientId && (
            <PrescriptionForm
              medicalRecordId={medicalRecordId}
              patientId={patientId}
              patientName={patientName}
              onSuccess={() => setAddOpen(false)}
              onCancel={() => setAddOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit medication dialog */}
      <Dialog open={!!editingMed} onOpenChange={(v) => { if (!v) setEditingMed(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('card.editMedication')}</DialogTitle>
          </DialogHeader>
          {editingMed && (
            <form onSubmit={handleEditSave} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="edit-med-name">{t('card.colDrug')}</Label>
                <Input id="edit-med-name" name="medication_name" defaultValue={editingMed.medication_name} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-dosage">{t('card.colFrequency')}</Label>
                <Input id="edit-dosage" name="dosage" defaultValue={editingMed.dosage} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-instructions">{t('card.colFreqType')}</Label>
                <Input id="edit-instructions" name="instructions" defaultValue={editingMed.instructions ?? ''} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-duration">{t('card.colPeriod')}</Label>
                <Input id="edit-duration" name="duration" defaultValue={editingMed.duration} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input id="edit-quantity" name="quantity" defaultValue={editingMed.quantity ?? ''} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingMed(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? '...' : 'Save'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
