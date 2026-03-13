'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload } from 'lucide-react'
import { uploadFile, getFileUrl } from '@/lib/actions/files'

// Allowed MIME types for client-side validation
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

interface VisitOption {
  id: string
  visit_date: string
}

interface FileUploadProps {
  patientId: string
  /** Visits available for linking the file to a specific visit */
  visits: VisitOption[]
}

export function FileUpload({ patientId, visits }: FileUploadProps) {
  const t = useTranslations('files')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isPending, startTransition] = useTransition()
  const [selectedVisitId, setSelectedVisitId] = useState<string>('')
  const [clientError, setClientError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  /** Called when the user picks a file — validates and uploads immediately */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setClientError(null)
    setServerError(null)
    setSuccess(false)

    if (!file) return

    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setClientError(t('upload.allowedTypes'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setClientError(t('upload.maxSize'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (!selectedVisitId) {
      setClientError(t('upload.selectVisit'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const formData = new FormData()
    formData.set('file', file)
    formData.set('patient_id', patientId)
    formData.set('medical_record_id', selectedVisitId)

    startTransition(async () => {
      const result = await uploadFile(formData)

      if (result.error) {
        setServerError(result.error)
      } else {
        setSuccess(true)
        // Reset form
        if (fileInputRef.current) fileInputRef.current.value = ''
        setSelectedVisitId('')

        // Auto-open the uploaded file in a new tab
        if (result.filePath) {
          const url = await getFileUrl(result.filePath)
          if (url) window.open(url, '_blank', 'noopener,noreferrer')
        }
      }
    })
  }

  /** Opens the file picker (only if a visit is selected) */
  function handleUploadClick() {
    if (!selectedVisitId) {
      setClientError(t('upload.selectVisit'))
      return
    }
    setClientError(null)
    setServerError(null)
    fileInputRef.current?.click()
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold">{t('upload.title')}</h3>

      <div className="space-y-3">
        {/* Visit selector — required to link file to a specific visit */}
        <div className="space-y-1">
          <Label htmlFor="visit-select">{t('upload.linkToVisit')}</Label>
          <Select value={selectedVisitId} onValueChange={setSelectedVisitId} disabled={isPending}>
            <SelectTrigger id="visit-select">
              <SelectValue placeholder={t('upload.selectVisitPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {visits.length === 0 ? (
                <SelectItem value="no-visits" disabled>
                  {t('upload.noVisits')}
                </SelectItem>
              ) : (
                visits.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.visit_date}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Hidden file input — triggered by the button below */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={isPending}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Error messages */}
        {(clientError || serverError) && (
          <Alert variant="destructive">
            <AlertDescription>{clientError ?? serverError}</AlertDescription>
          </Alert>
        )}

        {/* Success message */}
        {success && (
          <Alert>
            <AlertDescription>{t('upload.success')}</AlertDescription>
          </Alert>
        )}

        {/* Single upload button — opens file picker directly */}
        <Button
          type="button"
          disabled={isPending || visits.length === 0}
          className="gap-1"
          onClick={handleUploadClick}
        >
          <Upload className="h-4 w-4" />
          {isPending ? t('upload.uploading') : t('upload.title')}
        </Button>
      </div>
    </div>
  )
}
