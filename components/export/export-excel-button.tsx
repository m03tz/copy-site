'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportExcelButtonProps {
  data: Record<string, unknown>[]
  headers: { key: string; label: string }[]
  filename: string
  sheetName?: string
}

export function ExportExcelButton({
  data,
  headers,
  filename,
  sheetName = 'Sheet1',
}: ExportExcelButtonProps) {
  const t = useTranslations('common')
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const XLSX = await import('xlsx')

      // Build rows with Arabic headers
      const rows = data.map((item) => {
        const row: Record<string, unknown> = {}
        for (const h of headers) {
          row[h.label] = item[h.key] ?? ''
        }
        return row
      })

      const ws = XLSX.utils.json_to_sheet(rows)

      // Set RTL for the sheet
      ws['!dir'] = 'rtl' as const

      // Auto-size columns
      const colWidths = headers.map((h) => ({
        wch: Math.max(
          h.label.length * 2,
          ...data.map((item) => String(item[h.key] ?? '').length)
        ),
      }))
      ws['!cols'] = colWidths

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      XLSX.writeFile(wb, `${filename}.xlsx`)
    } catch (e) {
      console.error('Failed to export Excel:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      <span className="ms-2">{t('exportExcel')}</span>
    </Button>
  )
}
