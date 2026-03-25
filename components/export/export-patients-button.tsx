'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getExportPatients } from '@/lib/actions/export'

export function ExportPatientsButton() {
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const result = await getExportPatients()
      if (result.error || !result.data) return

      const XLSX = await import('xlsx')

      const headers = [
        { key: 'full_name_ar', label: 'اسم المريض' },
        { key: 'patient_code', label: 'رقم الملف' },
        { key: 'national_id', label: 'الرقم الوطني' },
        { key: 'phone', label: 'رقم الهاتف' },
      ]

      const rows = result.data.map((item) => {
        const row: Record<string, string> = {}
        for (const h of headers) {
          row[h.label] = (item as unknown as Record<string, string>)[h.key] ?? ''
        }
        return row
      })

      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!dir'] = 'rtl' as const
      ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.label.length * 2, 15) }))

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'المرضى')
      XLSX.writeFile(wb, `patients_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      <span className="ms-2">{tc('exportExcel')}</span>
    </Button>
  )
}
