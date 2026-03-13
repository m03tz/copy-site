import { redirect } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrescriptionPrint } from '@/components/prescriptions/prescription-print'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CalendarDays, Pill, FileImage, FileText, Download, ClipboardList } from 'lucide-react'
import { getFileUrl } from '@/lib/actions/files'
import type { Metadata } from 'next'

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: 'nav' })

  return {
    title: t('myRecords'),
  }
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function PatientRecordsPage() {
  const supabase = await createClient()

  // Get current authenticated patient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const tVisits = await getTranslations('visits')
  const tPrescriptions = await getTranslations('prescriptions')
  const tFiles = await getTranslations('files')

  // Fetch profile for patient name (used in prescription print)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name_ar, full_name_en')
    .eq('id', user.id)
    .single() as {
      data: { full_name_ar: string; full_name_en: string | null } | null
    }

  const patientName = profile?.full_name_ar || profile?.full_name_en || ''

  // Fetch patient's own medical records with prescriptions (newest first, exclude soft-deleted)
  const { data: records } = await supabase
    .from('medical_records')
    .select('*, prescriptions(*)')
    .eq('patient_id', user.id)
    .is('deleted_at', null)
    .order('visit_date', { ascending: false }) as {
      data: {
        id: string
        visit_date: string
        notes: string | null
        prescriptions: {
          id: string
          medication_name: string
          dosage: string
          duration: string
          instructions: string | null
        }[]
      }[] | null
    }

  // Fetch patient's own files (newest first)
  const { data: allFiles } = await supabase
    .from('patient_files')
    .select('*')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false }) as {
      data: {
        id: string
        file_name: string
        file_type: string
        file_path: string
        medical_record_id: string | null
        created_at: string
      }[] | null
    }

  const visitRecords = records ?? []
  const files = allFiles ?? []

  // Group files by medical_record_id for embedding in visit cards
  const filesByVisit = files.reduce<Record<string, typeof files>>((acc, file) => {
    const key = file.medical_record_id ?? '__unlinked__'
    if (!acc[key]) acc[key] = []
    acc[key].push(file)
    return acc
  }, {})

  // Empty state
  if (visitRecords.length === 0 && files.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{tVisits('title')}</h1>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <ClipboardList className="h-16 w-16 opacity-30" />
          <p>{tVisits('empty')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{tVisits('title')}</h1>

      {/* Visit cards — chronological, newest first, READ-ONLY */}
      <div className="space-y-4">
        {visitRecords.map((record) => {
          let formattedDate = record.visit_date
          try {
            formattedDate = format(new Date(record.visit_date), 'dd-MM-yyyy')
          } catch {
            // keep original
          }

          const visitFiles = filesByVisit[record.id] ?? []
          const hasPrescriptions = record.prescriptions && record.prescriptions.length > 0

          return (
            <Card key={record.id} className="w-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {formattedDate}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Clinical notes — read-only display */}
                {record.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {tVisits('card.notes')}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
                  </div>
                )}

                {/* Prescriptions — read-only with print button */}
                {hasPrescriptions && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Pill className="h-3.5 w-3.5" />
                        {tPrescriptions('title')}
                      </p>

                      {/* Print button — patient can print their own prescriptions */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            {tPrescriptions('print.printButton')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader className="no-print">
                            <DialogTitle>{tPrescriptions('print.title')}</DialogTitle>
                          </DialogHeader>
                          <PrescriptionPrint
                            patientName={patientName}
                            visitDate={record.visit_date}
                            medications={record.prescriptions}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Medication table — read-only */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-start py-1 pe-3 font-medium">
                              {tPrescriptions('form.medicationName')}
                            </th>
                            <th className="text-start py-1 pe-3 font-medium">
                              {tPrescriptions('form.dosage')}
                            </th>
                            <th className="text-start py-1 pe-3 font-medium">
                              {tPrescriptions('form.duration')}
                            </th>
                            <th className="text-start py-1 font-medium">
                              {tPrescriptions('form.instructions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.prescriptions.map((med) => (
                            <tr key={med.id} className="border-b last:border-0">
                              <td className="py-1 pe-3">{med.medication_name}</td>
                              <td className="py-1 pe-3">{med.dosage}</td>
                              <td className="py-1 pe-3">{med.duration}</td>
                              <td className="py-1 text-muted-foreground">
                                {med.instructions ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Files linked to this visit — read-only with download */}
                {visitFiles.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {tFiles('title')}
                    </p>
                    <div className="space-y-1">
                      {visitFiles.map((file) => (
                        <FileDownloadRow key={file.id} file={file} />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Files not linked to any specific visit */}
      {filesByVisit['__unlinked__'] && filesByVisit['__unlinked__'].length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{tFiles('title')}</h2>
          <Card>
            <CardContent className="pt-4 space-y-1">
              {filesByVisit['__unlinked__'].map((file) => (
                <FileDownloadRow key={file.id} file={file} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── FileDownloadRow ──────────────────────────────────────────────────────────
// Server Component row — uses a form + server action for file download.
// Patient can download but NOT delete (read-only portal).

async function FileDownloadRow({
  file,
}: {
  file: {
    id: string
    file_name: string
    file_type: string
    file_path: string
    created_at: string
  }
}) {
  const tFiles = await getTranslations('files')

  let formattedDate = file.created_at
  try {
    formattedDate = format(new Date(file.created_at), 'dd-MM-yyyy')
  } catch {
    // keep original
  }

  const isImage = file.file_type === 'image'

  // Inline server action bound to this specific file
  const filePath = file.file_path
  async function handleDownload() {
    'use server'
    const url = await getFileUrl(filePath)
    if (url) {
      redirect(url)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {isImage ? (
          <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm truncate">{file.file_name}</span>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {isImage ? tFiles('types.image') : tFiles('types.pdf')}
        </Badge>
        <span className="text-xs text-muted-foreground shrink-0">{formattedDate}</span>
      </div>
      {/* Download via server action — no delete button (read-only) */}
      <form action={handleDownload}>
        <Button type="submit" variant="ghost" size="sm" aria-label={file.file_name}>
          <Download className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
