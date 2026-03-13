'use client'

import { useState, useTransition, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileImage, FileText, Download, Trash2, FolderOpen, Eye, LayoutGrid, List } from 'lucide-react'
import { deleteFile, getFileUrl } from '@/lib/actions/files'
import { FileViewer } from '@/components/files/file-viewer'

interface FileRow {
  id: string
  file_name: string
  file_type: string
  file_path: string
  description: string | null
  medical_record_id: string | null
  created_at: string
}

interface FileListProps {
  files: FileRow[]
  patientId: string
}

// ─── Thumbnail Component ──────────────────────────────────────────────────────
// Loads and shows image thumbnails inline. Uses signed URL lazily.

function ImageThumbnail({
  file,
  onClick,
}: {
  file: FileRow
  onClick: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    getFileUrl(file.file_path).then(setUrl)
  }, [file.file_path])

  return (
    <button
      onClick={onClick}
      className="relative group w-full aspect-square rounded-lg overflow-hidden border bg-muted/40 hover:ring-2 hover:ring-primary transition-all"
      title={file.file_name}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={file.file_name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <FileImage className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
        <Eye className="h-6 w-6 text-white" />
      </div>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FileList({ files, patientId }: FileListProps) {
  const t = useTranslations('files')
  const [isPending, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<FileRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [viewFile, setViewFile] = useState<FileRow | null>(null)
  const [gridView, setGridView] = useState(false)

  function handleDownload(file: FileRow) {
    setDownloadingId(file.id)
    startTransition(async () => {
      const url = await getFileUrl(file.file_path)
      setDownloadingId(null)
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteError(null)

    startTransition(async () => {
      const result = await deleteFile(deleteTarget.id, deleteTarget.file_path)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        setDeleteTarget(null)
      }
    })
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <FolderOpen className="h-10 w-10 opacity-40" />
        <p className="text-sm">{t('empty')}</p>
      </div>
    )
  }

  const imageFiles = files.filter((f) => f.file_type === 'image')
  const otherFiles = files.filter((f) => f.file_type !== 'image')

  return (
    <>
      <div className="space-y-4">
        {/* Header with view toggle */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('title')}</h3>
          <div className="flex gap-1 border rounded-md p-0.5">
            <Button
              variant={gridView ? 'ghost' : 'secondary'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setGridView(false)}
              title="قائمة"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={gridView ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setGridView(true)}
              title="شبكة"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Grid View: Images thumbnails + files ── */}
        {gridView ? (
          <div className="space-y-4">
            {/* Image thumbnails grid */}
            {imageFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  الصور ({imageFiles.length})
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {imageFiles.map((file) => (
                    <div key={file.id} className="space-y-1">
                      <ImageThumbnail file={file} onClick={() => setViewFile(file)} />
                      <p className="text-[10px] text-muted-foreground truncate text-center">{file.file_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Non-image files in compact list */}
            {otherFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  ملفات PDF ({otherFiles.length})
                </p>
                <div className="rounded-lg border divide-y">
                  {otherFiles.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      onView={() => setViewFile(file)}
                      onDownload={() => handleDownload(file)}
                      onDelete={() => { setDeleteError(null); setDeleteTarget(file) }}
                      downloading={isPending && downloadingId === file.id}
                      isPending={isPending}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── List View ── */
          <div className="rounded-lg border divide-y">
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onView={() => setViewFile(file)}
                onDownload={() => handleDownload(file)}
                onDelete={() => { setDeleteError(null); setDeleteTarget(file) }}
                downloading={isPending && downloadingId === file.id}
                isPending={isPending}
                t={t}
                showThumbnail
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) { setDeleteTarget(null); setDeleteError(null) }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('actions.delete')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('confirmDelete')}</p>
          {deleteTarget && (
            <p className="text-sm font-medium">{deleteTarget.file_name}</p>
          )}
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              {t('actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isPending}>
              {isPending ? '...' : t('actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File viewer modal */}
      <FileViewer
        open={!!viewFile}
        onOpenChange={(open) => { if (!open) setViewFile(null) }}
        file={viewFile}
      />
    </>
  )
}

// ─── File Row Sub-component ───────────────────────────────────────────────────

function FileRow({
  file, onView, onDownload, onDelete, downloading, isPending, t, showThumbnail,
}: {
  file: FileRow
  onView: () => void
  onDownload: () => void
  onDelete: () => void
  downloading: boolean
  isPending: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
  showThumbnail?: boolean
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const isImage = file.file_type === 'image'

  useEffect(() => {
    if (showThumbnail && isImage) {
      getFileUrl(file.file_path).then(setThumbUrl)
    }
  }, [showThumbnail, isImage, file.file_path])

  let formattedDate = file.created_at
  try { formattedDate = format(new Date(file.created_at), 'dd-MM-yyyy') } catch { /* keep */ }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
      <div className="flex items-center gap-3 min-w-0">
        {/* Thumbnail for images in list view */}
        {showThumbnail && isImage ? (
          <button
            onClick={onView}
            className="shrink-0 w-10 h-10 rounded overflow-hidden border bg-muted/40 hover:ring-2 hover:ring-primary transition-all"
          >
            {thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl} alt={file.file_name} className="w-full h-full object-cover" />
            ) : (
              <FileImage className="h-5 w-5 text-muted-foreground m-auto mt-2.5" />
            )}
          </button>
        ) : isImage ? (
          <FileImage className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
        )}

        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{file.file_name}</p>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>

        <Badge variant="secondary" className="shrink-0">
          {t(`types.${file.file_type as 'image' | 'pdf'}`)}
        </Badge>
      </div>

      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={onView} aria-label={t('viewer.zoomIn')}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={onDownload}
          disabled={downloading}
          aria-label={t('actions.download')}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={onDelete}
          disabled={isPending}
          aria-label={t('actions.delete')}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
