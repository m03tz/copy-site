'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Download, Loader2, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getExportAppointments } from '@/lib/actions/export'

const STATUS_MAP: Record<string, string> = {
  scheduled: 'مجدول',
  confirmed: 'مؤكد',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

const TYPE_MAP: Record<string, string> = {
  consultation: 'استشارة',
  follow_up: 'متابعة',
  prenatal: 'متابعة حمل',
  ultrasound: 'تصوير بالموجات',
  other: 'أخرى',
}

export function ExportAppointmentsButton() {
  const t = useTranslations('appointments')
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [calOpen, setCalOpen] = useState(false)

  const handleExport = async (dateFilter?: string) => {
    setLoading(true)
    try {
      const result = await getExportAppointments(dateFilter)
      if (result.error || !result.data) return

      const XLSX = await import('xlsx')

      const rows = result.data.map((item) => ({
        'اسم المريضة': item.patient_name,
        'رقم الملف': item.patient_code,
        'رقم الهاتف': item.phone,
        'تاريخ الموعد': format(new Date(item.scheduled_start), 'dd-MM-yyyy'),
        'الوقت': `${format(new Date(item.scheduled_start), 'HH:mm')} – ${format(new Date(item.scheduled_end), 'HH:mm')}`,
        'نوع الموعد': TYPE_MAP[item.appointment_type] ?? item.appointment_type,
        'الحالة': STATUS_MAP[item.status] ?? item.status,
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!dir'] = 'rtl' as const
      ws['!cols'] = [
        { wch: 25 }, // اسم المريضة
        { wch: 12 }, // رقم الملف
        { wch: 15 }, // رقم الهاتف
        { wch: 14 }, // تاريخ الموعد
        { wch: 16 }, // الوقت
        { wch: 16 }, // نوع الموعد
        { wch: 10 }, // الحالة
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'المواعيد')
      const filename = dateFilter
        ? `appointments_${dateFilter}.xlsx`
        : `appointments_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(wb, filename)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Export all appointments */}
      <Button variant="outline" size="sm" onClick={() => handleExport()} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        <span className="ms-2">{t('exportAll')}</span>
      </Button>

      {/* Export specific date */}
      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            <CalendarDays className="h-4 w-4" />
            <span className="ms-2">
              {selectedDate ? format(selectedDate, 'dd-MM-yyyy') : t('exportDay')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              setSelectedDate(d)
              setCalOpen(false)
              if (d) handleExport(format(d, 'yyyy-MM-dd'))
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
