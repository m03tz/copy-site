'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
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
import { TrendingUp, CalendarDays, Printer, Loader2, Pencil, Check, X, Trash2, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { getFinancialSummaryByDate, getFinancialRecords } from '@/lib/actions/invoices'
import { updateVisitFee, deleteVisitRecord } from '@/lib/actions/medical-records'
import { updateExternalCost, deleteExternalCost } from '@/lib/actions/external-costs'
import { updateCompletedOperation, uncompleteOperation } from '@/lib/actions/operations'

interface FinancialSummaryProps {
  todayTotal: number
  monthTotal: number
  yearTotal: number
}

interface VisitRecord {
  id: string
  patient_name: string
  patient_id: string
  visit_date: string
  visit_fee: number
  national_id: string | null
  patient_code: string | null
  phone: string | null
  visit_type?: string
  record_type?: 'visit' | 'external' | 'operation'
}

export function FinancialSummary({ todayTotal, monthTotal, yearTotal }: FinancialSummaryProps) {
  const t = useTranslations('financial')
  // Selected day state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [dayCalOpen, setDayCalOpen] = useState(false)
  const [dayTotal, setDayTotal] = useState<number>(todayTotal)
  const [dayLoading, startDayTransition] = useTransition()

  // Print range state
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [fromCalOpen, setFromCalOpen] = useState(false)
  const [toCalOpen, setToCalOpen] = useState(false)
  const [printLoading, startPrintTransition] = useTransition()
  const [printRecords, setPrintRecords] = useState<VisitRecord[] | null>(null)
  const [printTotal, setPrintTotal] = useState(0)
  const [printOpen, setPrintOpen] = useState(false)

  // Inline fee editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDaySelect(date: Date | undefined) {
    setSelectedDate(date)
    setDayCalOpen(false)
    if (!date) return
    const dateStr = format(date, 'yyyy-MM-dd')
    startDayTransition(async () => {
      const result = await getFinancialSummaryByDate(dateStr)
      setDayTotal(result.total ?? 0)
    })
  }

  function handlePrint() {
    if (!fromDate || !toDate) return
    const from = format(fromDate, 'yyyy-MM-dd')
    const to = format(toDate, 'yyyy-MM-dd')
    startPrintTransition(async () => {
      const result = await getFinancialRecords(from, to)
      if (result.records) {
        setPrintRecords(result.records)
        setPrintTotal(result.total ?? 0)
        setPrintOpen(true)
      }
    })
  }

  async function handleSaveFee(record: VisitRecord) {
    const amount = parseFloat(editValue)
    if (isNaN(amount) || amount < 0) return
    setSavingId(record.id)
    const result = record.record_type === 'external'
      ? await updateExternalCost(record.id, amount)
      : record.record_type === 'operation'
        ? await updateCompletedOperation(record.id, amount)
        : await updateVisitFee(record.id, record.patient_id, amount)
    if (result.success) {
      setPrintRecords((prev) => {
        if (!prev) return prev
        const updated = prev.map((r) => r.id === record.id ? { ...r, visit_fee: amount } : r)
        setPrintTotal(updated.reduce((acc, r) => acc + r.visit_fee, 0))
        return updated
      })
      // Also refresh the day total if needed
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const res = await getFinancialSummaryByDate(dateStr)
        setDayTotal(res.total ?? 0)
      }
    }
    setSavingId(null)
    setEditingId(null)
    setEditValue('')
  }

  async function handleDeleteRecord(record: VisitRecord) {
    setDeletingId(record.id)
    const result = record.record_type === 'external'
      ? await deleteExternalCost(record.id)
      : record.record_type === 'operation'
        ? await uncompleteOperation(record.id)
        : await deleteVisitRecord(record.id, record.patient_id)
    if (!result.error) {
      setPrintRecords((prev) => {
        if (!prev) return prev
        const updated = prev.filter((r) => r.id !== record.id)
        setPrintTotal(updated.reduce((acc, r) => acc + r.visit_fee, 0))
        return updated
      })
    }
    setDeletingId(null)
    setDeleteConfirmId(null)
  }

  function handleExportExcel() {
    if (!printRecords || !fromDate || !toDate) return
    const from = format(fromDate, 'yyyy-MM-dd')
    const to = format(toDate, 'yyyy-MM-dd')

    const rows = printRecords.map((r) => ({
      'Patient': r.patient_name,
      'National ID': r.national_id ?? '',
      'Patient ID': r.patient_code ?? '',
      'Phone': r.phone ?? '',
      'Visit Type': r.visit_type ?? '',
      'Date': r.visit_date,
      'Amount': r.visit_fee,
    }))
    rows.push({ 'Patient': 'Total', 'National ID': '', 'Patient ID': '', 'Phone': '', 'Visit Type': '', 'Date': '', 'Amount': printTotal })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Financial Records')
    XLSX.writeFile(wb, `financial-${from}-${to}.xlsx`)
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const selectedStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : todayStr
  const isToday = selectedStr === todayStr

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── اختيار اليوم ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t('totalSelectedDay')}</span>
            <Popover open={dayCalOpen} onOpenChange={setDayCalOpen}>
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
            {dayLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-1">
                  {isToday ? t('today') : format(selectedDate!, 'dd-MM-yyyy')}
                </p>
                <p className="text-2xl font-bold">{dayTotal.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">د.أ</p>
              </>
            )}
          </div>
        </div>

        {/* ── الشهر والسنة ── */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg border px-3 py-2 space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('thisMonth')}</p>
            <p className="text-lg font-bold">{monthTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">د.أ</p>
          </div>
          <div className="rounded-lg border px-3 py-2 space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('thisYear')}</p>
            <p className="text-lg font-bold">{yearTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">د.أ</p>
          </div>
        </div>

        {/* ── طباعة فترة ── */}
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

            {/* Print button */}
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handlePrint}
              disabled={printLoading || !fromDate || !toDate}
            >
              {printLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
              {t('viewReport')}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Print Preview Dialog */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('reportTitle')} —{' '}
              {fromDate && format(fromDate, 'dd-MM-yyyy')} {t('to')} {toDate && format(toDate, 'dd-MM-yyyy')}
            </DialogTitle>
          </DialogHeader>

          {printRecords && printRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('noInvoices')}</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-start py-2 px-3 font-medium">#</th>
                      <th className="text-start py-2 px-3 font-medium">المريضة</th>
                      <th className="text-start py-2 px-3 font-medium">الرقم الوطني</th>
                      <th className="text-start py-2 px-3 font-medium">رقم الملف</th>
                      <th className="text-start py-2 px-3 font-medium">الهاتف</th>
                      <th className="text-start py-2 px-3 font-medium whitespace-nowrap">التاريخ</th>
                      <th className="text-start py-2 px-3 font-medium">النوع</th>
                      <th className="text-start py-2 px-3 font-medium">نوع الزيارة</th>
                      <th className="text-start py-2 px-3 font-medium">الرسوم (د.أ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printRecords?.map((r, i) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-3">{r.patient_name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{r.national_id ?? '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{r.patient_code ?? '—'}</td>
                        <td className="py-2 px-3 text-xs" dir="ltr">{r.phone ?? '—'}</td>
                        <td className="py-2 px-3 whitespace-nowrap" dir="ltr">{r.visit_date}</td>
                        <td className="py-2 px-3">
                          {r.record_type === 'visit'
                            ? <span className="text-muted-foreground text-xs">زيارة</span>
                            : r.record_type === 'external'
                              ? <span className="text-muted-foreground text-xs">عمليات</span>
                              : <span className="text-muted-foreground text-xs">عملية</span>
                          }
                        </td>
                        <td className="py-2 px-3">
                          {r.visit_type ? (
                            <span className="inline-block rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 dark:bg-blue-900/30 dark:text-blue-400">
                              {r.visit_type}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-3">
                          {editingId === r.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-7 w-20 text-xs"
                                dir="ltr"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveFee(r)}
                                disabled={savingId === r.id}
                                className="text-green-600 hover:text-green-700 disabled:opacity-50"
                              >
                                {savingId === r.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Check className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setEditValue('') }}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="font-semibold">{r.visit_fee.toFixed(2)}</span>
                              <button
                                onClick={() => { setEditingId(r.id); setEditValue(r.visit_fee.toString()) }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {deleteConfirmId === r.id ? (
                                <>
                                  <button
                                    onClick={() => handleDeleteRecord(r)}
                                    disabled={deletingId === r.id}
                                    className="text-destructive hover:text-destructive/80 disabled:opacity-50"
                                    title="تأكيد الحذف"
                                  >
                                    {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-muted-foreground hover:text-foreground"
                                    title="إلغاء"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(r.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                                  title="حذف"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40 font-bold">
                      <td colSpan={8} className="py-2 px-3 text-end">الإجمالي</td>
                      <td className="py-2 px-3 text-primary">{printTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleExportExcel} className="gap-2">
                  <Download className="h-4 w-4" />
                  تصدير Excel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
