'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { getFileUrl } from '@/lib/actions/files'

interface FileViewerFile {
  id: string
  file_name: string
  file_type: string
  file_path: string
}

interface FileViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileViewerFile | null
}

export function FileViewer({ open, onOpenChange, file }: FileViewerProps) {
  const t = useTranslations('files.viewer')
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Fetch signed URL when dialog opens with a file
  useEffect(() => {
    if (open && file) {
      setLoading(true)
      setUrl(null)
      setScale(1)
      setRotation(0)
      getFileUrl(file.file_path).then((signedUrl) => {
        setUrl(signedUrl)
        setLoading(false)
      })
    }
  }, [open, file])

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }, [])

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  const handleReset = useCallback(() => {
    setScale(1)
    setRotation(0)
  }, [])

  const handleDownload = useCallback(() => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [url])

  const handleOpenNewTab = useCallback(() => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [url])

  const isImage = file?.file_type === 'image'
  const isPdf = file?.file_type === 'pdf'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate text-base">
              {file?.file_name ?? ''}
            </DialogTitle>
            <div className="flex items-center gap-1">
              {/* Image-only controls */}
              {isImage && !loading && url && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={scale >= 3}
                    aria-label={t('zoomIn')}
                    title={t('zoomIn')}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={scale <= 0.5}
                    aria-label={t('zoomOut')}
                    title={t('zoomOut')}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRotate}
                    aria-label={t('rotate')}
                    title={t('rotate')}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReset}
                    aria-label={t('reset')}
                    title={t('reset')}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>

                  {/* Separator */}
                  <div className="w-px h-5 bg-border mx-1" />
                </>
              )}

              {/* Common controls */}
              {!loading && url && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    aria-label={t('download')}
                    title={t('download')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleOpenNewTab}
                    aria-label={t('openNewTab')}
                    title={t('openNewTab')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label={t('close')}
                title={t('close')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content area */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/30">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">{t('loading')}</p>
            </div>
          )}

          {!loading && url && isImage && (
            <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={file?.file_name ?? ''}
                className="max-w-none transition-transform duration-200"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                }}
                draggable={false}
              />
            </div>
          )}

          {!loading && url && isPdf && (
            <iframe
              src={url}
              className="w-full h-full border-0"
              title={file?.file_name ?? 'PDF'}
            />
          )}

          {!loading && !url && (
            <p className="text-sm text-muted-foreground">
              {t('loading')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
