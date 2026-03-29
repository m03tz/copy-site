'use client'

import { useState, useTransition, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Users, CalendarDays, Loader2, Printer, Check, X, Trash2, Search } from 'lucide-react'
import { getVisitorCountByDate, getVisitorsByDateRange } from '@/lib/actions/invoices'
import { deleteVisitRecord } from '@/lib/actions/medical-records'
import { getClinicHeaderHtml, getClinicHeaderStyles } from '@/lib/print-utils'

interface VisitorsSummaryProps {
  todayCount: number
  monthCount: number
  yearCount: number
}

interface VisitorRecord {
  id: string
  patient_name: string
  patient_id: string
  visit_date: string
  visit_fee: number | null
  national_id: string | null
  patient_code: string | null
  phone?: string | null
  visit_type?: string | null
}

export function VisitorsSummary({ todayCount, monthCount, yearCount }: VisitorsSummaryProps) {
  const t = useTranslations('visitors')

  // Day picker state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [calOpen, setCalOpen] = useState(false)
  const [dayCount, setDayCount] = useState<number>(todayCount)
  const [loading, startTransition] = useTransition()

  // Report range state
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [fromCalOpen, setFromCalOpen] = useState(false)
  const [toCalOpen, setToCalOpen] = useState(false)
  const [reportLoading, startReportTransition] = useTransition()
  const [reportRecords, setReportRecords] = useState<VisitorRecord[] | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState(false)

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const selectedStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : todayStr
  const isToday = selectedStr === todayStr

  const filteredRecords = useMemo(() => {
    if (!reportRecords) return reportRecords
    if (!searchQuery.trim()) return reportRecords
    const q = searchQuery.toLowerCase()
    return reportRecords.filter(
      (r) =>
        r.patient_name.toLowerCase().includes(q) ||
        (r.national_id ?? '').toLowerCase().includes(q) ||
        (r.patient_code ?? '').toLowerCase().includes(q) ||
        (r.phone ?? '').includes(q)
    )
  }, [reportRecords, searchQuery])

  function handleDaySelect(date: Date | undefined) {
    setSelectedDate(date)
    setCalOpen(false)
    if (!date) return
    const dateStr = format(date, 'yyyy-MM-dd')
    startTransition(async () => {
      const result = await getVisitorCountByDate(dateStr)
      setDayCount(result.count ?? 0)
    })
  }

  function handleViewReport() {
    if (!fromDate || !toDate) return
    const from = format(fromDate, 'yyyy-MM-dd')
    const to = format(toDate, 'yyyy-MM-dd')
    startReportTransition(async () => {
      const result = await getVisitorsByDateRange(from, to)
      if (result.records) {
        setReportRecords(result.records)
        setSelectedIds(new Set())
        setSearchQuery('')
        setReportOpen(true)
      }
    })
  }

  async function handleDeleteRecord(record: VisitorRecord) {
    setDeletingId(record.id)
    const result = await deleteVisitRecord(record.id, record.patient_id)
    if (!result.error) {
      setReportRecords((prev) => prev ? prev.filter((r) => r.id !== record.id) : prev)
      setSelectedIds((prev) => { const s = new Set(prev); s.delete(record.id); return s })
      if (record.visit_date === selectedStr) {
        const res = await getVisitorCountByDate(selectedStr)
        setDayCount(res.count ?? 0)
      }
    }
    setDeletingId(null)
    setDeleteConfirmId(null)
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0 || !reportRecords) return
    setBulkDeleting(true)
    const toDelete = reportRecords.filter((r) => selectedIds.has(r.id))
    for (const record of toDelete) {
      const result = await deleteVisitRecord(record.id, record.patient_id)
      if (!result.error) {
        setReportRecords((prev) => prev ? prev.filter((r) => r.id !== record.id) : prev)
      }
    }
    // Refresh day count
    const res = await getVisitorCountByDate(selectedStr)
    setDayCount(res.count ?? 0)
    setSelectedIds(new Set())
    setBulkDeleting(false)
    setBulkConfirm(false)
  }

  const allVisibleIds = filteredRecords?.map((r) => r.id) ?? []
  const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id))
  const someSelected = selectedIds.size > 0

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const s = new Set(prev)
        allVisibleIds.forEach((id) => s.delete(id))
        return s
      })
    } else {
      setSelectedIds((prev) => new Set([...prev, ...allVisibleIds]))
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const s = new Set(prev)
      if (s.has(id)) { s.delete(id) } else { s.add(id) }
      return s
    })
  }

  function handlePrintWindow() {
    if (!reportRecords || !fromDate || !toDate) return
    const from = format(fromDate, 'dd-MM-yyyy')
    const to = format(toDate, 'dd-MM-yyyy')

    const rows = reportRecords
      .map(
        (r, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.patient_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">${r.patient_code ?? '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">${r.national_id ?? '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">${r.phone ?? '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">${r.visit_type ?? '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.visit_date}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">${r.visit_fee != null ? r.visit_fee.toFixed(2) : '—'}</td>
        </tr>`
      )
      .join('')

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>تقرير المراجعين ${from} — ${to}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; direction: rtl; padding: 1.5cm 1cm; color: #111; }
    ${getClinicHeaderStyles()}
    .report-title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    .period { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: #0d7377; color: white; }
    th { padding: 9px 10px; text-align: right; }
    td { padding: 8px 10px; }
    .total-row { background: #f0fdfa !important; font-weight: 700; font-size: 14px; }
    @media print { body { padding: 10px; } }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>
  ${getClinicHeaderHtml()}
  <p class="report-title">تقرير المراجعين</p>
  <p class="period">الفترة: ${from} — ${to}</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>اسم المريضة</th>
        <th>رقم الملف</th>
        <th>الرقم الوطني</th>
        <th>الهاتف</th>
        <th>نوع الزيارة</th>
        <th>تاريخ الزيارة</th>
        <th>الرسوم (د.أ)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="7" style="text-align:right">الإجمالي</td>
        <td>${reportRecords.length}</td>
      </tr>
    </tbody>
  </table>
</body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.print()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── Day picker ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t('visitorCount')}</span>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {selectedDate ? format(selectedDate, 'dd-MM-yyyy') : t('selectDay')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDaySelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-center">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-1">
                  {isToday ? t('today') : format(selectedDate!, 'dd-MM-yyyy')}
                </p>
                <p className="text-2xl font-bold">{dayCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('visitor')}</p>
              </>
            )}
          </div>
        </div>

        {/* ── Month / Year ── */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg border px-3 py-2 space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('thisMonth')}</p>
            <p className="text-lg font-bold">{monthCount}</p>
            <p className="text-xs text-muted-foreground">{t('visitor')}</p>
          </div>
          <div className="rounded-lg border px-3 py-2 space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('thisYear')}</p>
            <p className="text-lg font-bold">{yearCount}</p>
            <p className="text-xs text-muted-foreground">{t('visitor')}</p>
          </div>
        </div>

        {/* ── Report range ── */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">{t('printReport')}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* From */}
            <Popover open={fromCalOpen} onOpenChange={setFromCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t('from')}: {fromDate ? format(fromDate, 'dd-MM-yyyy') : '—'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(d) => { setFromDate(d); setFromCalOpen(false) }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* To */}
            <Popover open={toCalOpen} onOpenChange={setToCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t('to')}: {toDate ? format(toDate, 'dd-MM-yyyy') : '—'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(d) => { setToDate(d); setToCalOpen(false) }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* View Report button */}
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleViewReport}
              disabled={reportLoading || !fromDate || !toDate}
            >
              {reportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
              {t('viewReport')}
            </Button>
          </div>
        </div>

      </CardContent>

      {/* ── Report Dialog ── */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('reportTitle')} —{' '}
              {fromDate && format(fromDate, 'dd-MM-yyyy')} {t('to')} {toDate && format(toDate, 'dd-MM-yyyy')}
            </DialogTitle>
          </DialogHeader>

          {reportRecords && reportRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('noVisitors')}</p>
          ) : (
            <div className="space-y-3">
              {/* Search + bulk delete toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="بحث باسم المريضة أو الرقم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs pr-8"
                  />
                </div>
                {someSelected && (
                  bulkConfirm ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-destructive font-medium">حذف {selectedIds.size} سجل؟</span>
                      <button
                        onClick={handleBulkDelete}
                        disabled={bulkDeleting}
                        className="text-destructive hover:text-destructive/80 disabled:opacity-50"
                      >
                        {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setBulkConfirm(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => setBulkConfirm(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف المحدد ({selectedIds.size})
                    </Button>
                  )
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          className="rounded cursor-pointer"
                          title="تحديد الكل"
                        />
                      </th>
                      <th className="text-start py-2 px-3 font-medium">#</th>
                      <th className="text-start py-2 px-3 font-medium">{t('patient')}</th>
                      <th className="text-start py-2 px-3 font-medium">رقم الملف</th>
                      <th className="text-start py-2 px-3 font-medium">الرقم الوطني</th>
                      <th className="text-start py-2 px-3 font-medium">الهاتف</th>
                      <th className="text-start py-2 px-3 font-medium">نوع الزيارة</th>
                      <th className="text-start py-2 px-3 font-medium">{t('date')}</th>
                      <th className="text-start py-2 px-3 font-medium">{t('fee')}</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords?.map((r, i) => (
                      <tr key={r.id} className={`border-b last:border-0 ${selectedIds.has(r.id) ? 'bg-muted/30' : ''}`}>
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleRow(r.id)}
                            className="rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{r.patient_name}</td>
                        <td className="py-2 px-3 font-mono text-xs">{r.patient_code ?? '—'}</td>
                        <td className="py-2 px-3 text-xs">{r.national_id ?? '—'}</td>
                        <td className="py-2 px-3 text-xs dir-ltr">{r.phone ?? '—'}</td>
                        <td className="py-2 px-3 text-xs">
                          {r.visit_type ? (
                            <span className="inline-block rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 dark:bg-blue-900/30 dark:text-blue-400">
                              {r.visit_type}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-3 dir-ltr text-left whitespace-nowrap">{r.visit_date}</td>
                        <td className="py-2 px-3 font-semibold">
                          {r.visit_fee != null ? r.visit_fee.toFixed(2) : '—'}
                        </td>
                        <td className="py-2 px-3">
                          {deleteConfirmId === r.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteRecord(r)}
                                disabled={deletingId === r.id}
                                className="text-destructive hover:text-destructive/80 disabled:opacity-50"
                                title="تأكيد الحذف"
                              >
                                {deletingId === r.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Check className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-muted-foreground hover:text-foreground"
                                title="إلغاء"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(r.id)}
                              className="text-destructive hover:text-destructive/80 opacity-60 hover:opacity-100 transition-opacity"
                              title={t('deleteVisit')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40 font-bold">
                      <td colSpan={8} className="py-2 px-3 text-end">{t('total')}</td>
                      <td colSpan={2} className="py-2 px-3 text-primary">{filteredRecords?.length ?? 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button onClick={handlePrintWindow} className="gap-2">
                  <Printer className="h-4 w-4" />
                  {t('print')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
