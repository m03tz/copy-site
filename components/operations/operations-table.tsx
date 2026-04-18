'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Plus, Pencil, Trash2, Check, X, Loader2, Printer, Search, ChevronsUpDown, DollarSign, CheckCircle2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { createOperation, updateOperation, deleteOperation, completeOperation, updateCompletedOperation, uncompleteOperation } from '@/lib/actions/operations'
import { searchPatientsForCombobox } from '@/lib/actions/patients'
import { createExternalCost, updateExternalCost, deleteExternalCost } from '@/lib/actions/external-costs'
import type { ExternalCost } from '@/lib/actions/external-costs'
import { getClinicHeaderHtml, getClinicHeaderStyles } from '@/lib/print-utils'
import type { Operation } from '@/lib/actions/operations'

const VISIT_TYPES = ['VISIT', 'INSURANCE', 'CS', 'LAP', 'IVF', 'IUI', 'NVD', 'D&C', 'OTHERS'] as const

interface Patient {
  id: string
  full_name_ar: string
  full_name_en: string | null
  patient_code: string | null
  phone: string | null
}

interface OperationsTableProps {
  operations: Operation[]
  patients: Patient[]
  externalCosts: ExternalCost[]
}

interface FormState {
  patient_id: string
  operation_date: string
  hospital_name: string
  operation_type: string
  notes: string
}

const EMPTY_FORM: FormState = {
  patient_id: '',
  operation_date: '',
  hospital_name: '',
  operation_type: '',
  notes: '',
}

// ─── Searchable Patient Combobox ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function normalizeArabicCombo(text: string): string {
  return text
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .toLowerCase()
}

function PatientCombobox({
  patients,
  value,
  onChange,
  placeholder,
}: {
  patients: Patient[]
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const t = useTranslations('operations')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = search.trim()
    if (!q) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      const result = await searchPatientsForCombobox(q)
      setSearchResults(result.patients ?? [])
      setIsSearching(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const displayedPatients = search.trim() ? searchResults : patients

  const allKnown = [...patients, ...searchResults]
  const selected = allKnown.find((p) => p.id === value)
  const selectedLabel = selected
    ? `${selected.full_name_ar}${selected.patient_code ? ` (${selected.patient_code})` : ''}`
    : placeholder

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(''); setSearchResults([]) } }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={value ? '' : 'text-muted-foreground'}>{selectedLabel}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('searchPlaceholder')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isSearching ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CommandEmpty>{t('noResults')}</CommandEmpty>
            )}
            <CommandGroup>
              {displayedPatients.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onChange(p.id)
                    setSearch('')
                    setSearchResults([])
                    setOpen(false)
                  }}
                >
                  <Check
                    className={`me-2 h-4 w-4 ${value === p.id ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <span>{p.full_name_ar}</span>
                  {p.patient_code && (
                    <span className="ms-2 text-xs text-muted-foreground">({p.patient_code})</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Operation Form ───────────────────────────────────────────────────────────

function OperationFormDialog({
  patients,
  operation,
  onClose,
}: {
  patients: Patient[]
  operation?: Operation
  onClose: () => void
}) {
  const t = useTranslations('operations')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>(
    operation
      ? {
          patient_id: operation.patient_id,
          operation_date: operation.operation_date,
          hospital_name: operation.hospital_name,
          operation_type: operation.operation_type,
          notes: operation.notes ?? '',
        }
      : EMPTY_FORM
  )
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const fd = new FormData()
    if (operation) fd.append('id', operation.id)
    fd.append('patient_id', form.patient_id)
    fd.append('operation_date', form.operation_date)
    fd.append('hospital_name', form.hospital_name)
    fd.append('operation_type', form.operation_type)
    fd.append('notes', form.notes)

    startTransition(async () => {
      const result = operation ? await updateOperation(fd) : await createOperation(fd)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient — searchable combobox */}
      <div className="space-y-1.5">
        <Label>{t('patient')}</Label>
        <PatientCombobox
          patients={patients}
          value={form.patient_id}
          onChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}
          placeholder={t('selectPatient')}
        />
      </div>

      {/* Operation Date */}
      <div className="space-y-1.5">
        <Label>{t('operationDate')}</Label>
        <DatePickerInput
          value={form.operation_date}
          onChange={(v) => setForm((f) => ({ ...f, operation_date: v }))}
          required
        />
      </div>

      {/* Hospital Name */}
      <div className="space-y-1.5">
        <Label>{t('hospitalName')}</Label>
        <Input
          value={form.hospital_name}
          onChange={(e) => setForm((f) => ({ ...f, hospital_name: e.target.value }))}
          required
        />
      </div>

      {/* Operation Type */}
      <div className="space-y-1.5">
        <Label>{t('operationType')}</Label>
        <Input
          value={form.operation_type}
          onChange={(e) => setForm((f) => ({ ...f, operation_type: e.target.value }))}
          required
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>{t('notes')}</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder={t('notesPlaceholder')}
          rows={3}
          className="resize-y"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : null}
          {t('save')}
        </Button>
      </div>
    </form>
  )
}

// ─── Complete Operation Dialog ────────────────────────────────────────────────

function CompleteOperationDialog({
  operation,
  onClose,
}: {
  operation: Operation
  onClose: () => void
}) {
  const t = useTranslations('operations')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [amount, setAmount] = useState('')
  const [completedDate, setCompletedDate] = useState(todayStr)
  const [completionType, setCompletionType] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = parseFloat(amount)
    if (!completionType) {
      setError(t('fillAllFields'))
      return
    }
    if (isNaN(amt) || amt < 0 || !completedDate) {
      setError(t('fillAllFields'))
      return
    }
    startTransition(async () => {
      const result = await completeOperation(operation.id, amt, completedDate, completionType)
      if (result.error) { setError(result.error); return }
      router.refresh()
      onClose()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {operation.patient?.full_name_ar} — {operation.operation_type}
      </p>

      <div className="space-y-1.5">
        <Label>{t('completionDate')}</Label>
        <DatePickerInput
          value={completedDate}
          onChange={setCompletedDate}
          required
        />
      </div>

      {/* Operation/Completion Type */}
      <div className="space-y-1.5">
        <Label>{t('visitType')}</Label>
        <Select value={completionType} onValueChange={setCompletionType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('selectType')} />
          </SelectTrigger>
          <SelectContent>
            {VISIT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t('completionAmount')}</Label>
        <Input
          type="number"
          min="0"
          step="0.5"
          dir="ltr"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <CheckCircle2 className="h-4 w-4 me-1" />}
          {t('markCompleted')}
        </Button>
      </div>
    </form>
  )
}

// ─── External Cost Form ───────────────────────────────────────────────────────

function ExternalCostDialog({
  patients,
  onClose,
}: {
  patients: Patient[]
  onClose: () => void
}) {
  const t = useTranslations('operations')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    patient_id: '',
    cost_date: '',
    visit_type: '',
    amount: '',
  })
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amount = parseFloat(form.amount)
    if (!form.patient_id || !form.cost_date || !form.visit_type || isNaN(amount) || amount <= 0) {
      setError(t('fillAllFields'))
      return
    }

    startTransition(async () => {
      const result = await createExternalCost({
        patient_id: form.patient_id,
        cost_date: form.cost_date,
        visit_type: form.visit_type,
        amount,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient */}
      <div className="space-y-1.5">
        <Label>{t('patient')}</Label>
        <PatientCombobox
          patients={patients}
          value={form.patient_id}
          onChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}
          placeholder={t('selectPatient')}
        />
        {form.patient_id && (() => {
          const p = patients.find((x) => x.id === form.patient_id)
          const name = p?.full_name_ar || p?.full_name_en
          return name ? <p className="text-sm font-medium text-foreground">{name}</p> : null
        })()}
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label>{t('costDate')}</Label>
        <DatePickerInput
          value={form.cost_date}
          onChange={(v) => setForm((f) => ({ ...f, cost_date: v }))}
          required
        />
      </div>

      {/* Visit Type */}
      <div className="space-y-1.5">
        <Label>{t('visitType')}</Label>
        <Select
          value={form.visit_type}
          onValueChange={(v) => setForm((f) => ({ ...f, visit_type: v }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('selectType')} />
          </SelectTrigger>
          <SelectContent>
            {VISIT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label>{t('amount')}</Label>
        <Input
          type="number"
          min="0"
          step="0.5"
          dir="ltr"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          placeholder="0.00"
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : null}
          {t('save')}
        </Button>
      </div>
    </form>
  )
}

// ─── Print ────────────────────────────────────────────────────────────────────

function handlePrint(op: Operation) {
  const patientName = op.patient?.full_name_ar || op.patient?.full_name_en || '—'
  const opDate = format(new Date(op.operation_date), 'dd-MM-yyyy')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>تقرير عملية</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; direction: rtl; padding: 1.5cm 2cm; color: #111; min-height: 29.7cm; position: relative; }
    ${getClinicHeaderStyles()}
    .report-title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 28px; text-decoration: underline; text-underline-offset: 4px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 14px; }
    .info-table td { padding: 10px 14px; border: 1px solid #ddd; line-height: 1.6; }
    .info-table td:first-child { font-weight: bold; background: #f7f7f7; width: 160px; color: #333; }
    .signature-area { position: absolute; bottom: 2.5cm; left: 2cm; text-align: center; font-size: 13px; }
    .signature-line { border-top: 1px solid #333; width: 160px; margin: 40px auto 6px; }
    @media print { body { padding: 1cm 1.5cm; } @page { size: A4; margin: 0; } }
  </style>
</head>
<body>
  ${getClinicHeaderHtml()}
  <div class="report-title">تقرير عملية جراحية</div>
  <table class="info-table">
    <tr><td>اسم المريضة</td><td>${patientName}</td></tr>
    <tr><td>تاريخ العملية</td><td>${opDate}</td></tr>
    <tr><td>المستشفى</td><td>${op.hospital_name}</td></tr>
    <tr><td>نوع العملية</td><td>${op.operation_type}</td></tr>
    ${op.notes ? `<tr><td>ملاحظات</td><td>${op.notes}</td></tr>` : ''}
  </table>
  <div class="signature-area">
    <div class="signature-line"></div>
    <div>توقيع الطبيب</div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    win.print()
  }
}

// ─── Main Table ───────────────────────────────────────────────────────────────

export function OperationsTable({ operations, patients, externalCosts }: OperationsTableProps) {
  const t = useTranslations('operations')
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editOperation, setEditOperation] = useState<Operation | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [extCostOpen, setExtCostOpen] = useState(false)
  const [completingOp, setCompletingOp] = useState<Operation | null>(null)

  // Inline amount editing — shared for both completed ops and external costs
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null)
  const [editAmountKind, setEditAmountKind] = useState<'operation' | 'external'>('operation')
  const [editAmountValue, setEditAmountValue] = useState('')
  const [savingAmountId, setSavingAmountId] = useState<string | null>(null)

  // Uncomplete confirm (for completed operations)
  const [uncompleteConfirmId, setUncompleteConfirmId] = useState<string | null>(null)
  const [uncomletingId, setUncompletingId] = useState<string | null>(null)

  // Delete confirm for external costs
  const [extDeleteConfirmId, setExtDeleteConfirmId] = useState<string | null>(null)
  const [extDeletingId, setExtDeletingId] = useState<string | null>(null)

  function getPatientName(patientId: string) {
    const p = patients.find((pt) => pt.id === patientId)
    return p ? p.full_name_ar : '—'
  }

  function getOpPatientName(op: Operation) {
    if (!op.patient) return '—'
    return op.patient.full_name_ar || op.patient.full_name_en || '—'
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteOperation(id)
      setDeleteConfirmId(null)
      router.refresh()
    })
  }

  async function handleSaveAmount(id: string, kind: 'operation' | 'external') {
    const amount = parseFloat(editAmountValue)
    if (isNaN(amount) || amount < 0) return
    setSavingAmountId(id)
    if (kind === 'external') {
      await updateExternalCost(id, amount)
    } else {
      await updateCompletedOperation(id, amount)
    }
    setSavingAmountId(null)
    setEditingAmountId(null)
    setEditAmountValue('')
    router.refresh()
  }

  async function handleUncomplete(id: string) {
    setUncompletingId(id)
    await uncompleteOperation(id)
    setUncompletingId(null)
    setUncompleteConfirmId(null)
    router.refresh()
  }

  async function handleDeleteExtCost(id: string) {
    setExtDeletingId(id)
    await deleteExternalCost(id)
    setExtDeletingId(null)
    setExtDeleteConfirmId(null)
    router.refresh()
  }

  // Normalize Arabic: unify alef variants, remove diacritics, normalize ta-marbuta & alef-maqsura
  function normalizeArabic(text: string): string {
    return text
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .toLowerCase()
  }

  function matchesPatient(nameAr: string, nameEn: string, code: string, phone: string, q: string): boolean {
    const nq = normalizeArabic(q)
    return (
      normalizeArabic(nameAr).includes(nq) ||
      normalizeArabic(nameEn).includes(nq) ||
      normalizeArabic(code).includes(nq) ||
      phone.includes(q)
    )
  }

  // Filter operations — use patients array as fallback when op.patient join is missing
  const q = searchQuery.trim()
  const filtered = q
    ? operations.filter((op) => {
        const nameAr = op.patient?.full_name_ar ?? ''
        const nameEn = op.patient?.full_name_en ?? ''
        const code = op.patient?.patient_code ?? ''
        const phone = op.patient?.phone ?? ''
        return matchesPatient(nameAr, nameEn, code, phone, q)
      })
    : operations

  const filteredExtCosts = q
    ? externalCosts.filter((ec) => {
        const p = patients.find((pt) => pt.id === ec.patient_id)
        if (!p) return false
        return matchesPatient(p.full_name_ar, p.full_name_en ?? '', p.patient_code ?? '', p.phone ?? '', q)
      })
    : externalCosts

  const pendingOps = filtered.filter((op) => !op.is_completed)
  const completedOps = filtered.filter((op) => op.is_completed)
  const completedCount = completedOps.length + filteredExtCosts.length

  type CompletedItem = { kind: 'operation'; data: Operation } | { kind: 'external'; data: ExternalCost }
  const sortedCompletedItems: CompletedItem[] = [
    ...completedOps.map((op): CompletedItem => ({ kind: 'operation', data: op })),
    ...filteredExtCosts.map((ec): CompletedItem => ({ kind: 'external', data: ec })),
  ].sort((a, b) => {
    const dateA = a.kind === 'operation' ? a.data.operation_date : a.data.cost_date
    const dateB = b.kind === 'operation' ? b.data.operation_date : b.data.cost_date
    return dateA.localeCompare(dateB)
  })

  return (
    <div className="space-y-4">
      {/* Top bar: search + buttons */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="ps-9"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="ms-auto flex items-center gap-2">
          {/* External Operation Cost */}
          <Dialog open={extCostOpen} onOpenChange={setExtCostOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <DollarSign className="h-4 w-4 me-1" />
                {t('externalCostBtn')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('addExternalCost')}</DialogTitle>
              </DialogHeader>
              <ExternalCostDialog
                patients={patients}
                onClose={() => setExtCostOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Add Operation */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 me-1" />
                {t('addOperation')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('addOperation')}</DialogTitle>
              </DialogHeader>
              <OperationFormDialog
                patients={patients}
                onClose={() => setAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editOperation} onOpenChange={(open) => !open && setEditOperation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('editOperation')}</DialogTitle>
          </DialogHeader>
          {editOperation && (
            <OperationFormDialog
              patients={patients}
              operation={editOperation}
              onClose={() => setEditOperation(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Complete operation dialog */}
      <Dialog open={!!completingOp} onOpenChange={(open) => !open && setCompletingOp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('completeOperation')}</DialogTitle>
          </DialogHeader>
          {completingOp && (
            <CompleteOperationDialog
              operation={completingOp}
              onClose={() => setCompletingOp(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Tabs: Pending / Completed */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            {t('pendingTab')}
            {pendingOps.length > 0 && (
              <span className="ms-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                {pendingOps.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t('completedTab')}
            {completedCount > 0 && (
              <span className="ms-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 text-xs font-medium">
                {completedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Pending Operations ── */}
        <TabsContent value="pending" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t('colPatient')}</TableHead>
                <TableHead className="text-start">رقم الملف</TableHead>
                <TableHead className="text-start">الهاتف</TableHead>
                <TableHead className="text-start">{t('colDate')}</TableHead>
                <TableHead className="text-start">{t('colHospital')}</TableHead>
                <TableHead className="text-start">{t('colType')}</TableHead>
                <TableHead className="text-start">{t('colNotes')}</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-8">
                    {searchQuery ? t('noMatchingResults') : t('noOperations')}
                  </TableCell>
                </TableRow>
              ) : (
                pendingOps.map((op) => {
                  return (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium">{getOpPatientName(op)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{op.patient?.patient_code ?? '—'}</TableCell>
                    <TableCell className="text-xs dir-ltr">{op.patient?.phone ?? '—'}</TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {format(new Date(op.operation_date), 'dd-MM-yyyy')}
                    </TableCell>
                    <TableCell>{op.hospital_name}</TableCell>
                    <TableCell>{op.operation_type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {op.notes ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Complete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={() => setCompletingOp(op)}
                          title={t('completeOperation')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        {/* Print */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handlePrint(op)}
                          title="طباعة"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setEditOperation(op)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {/* Delete */}
                        {deleteConfirmId === op.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(op.id)}
                              disabled={isPending}
                            >
                              {isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={isPending}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmId(op.id)}
                            title={t('deleteOperation')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ── Completed Operations ── */}
        <TabsContent value="completed" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t('colPatient')}</TableHead>
                <TableHead className="text-start">{t('colDate')}</TableHead>
                <TableHead className="text-start">{t('colCompletedDate')}</TableHead>
                <TableHead className="text-start">{t('colHospital')}</TableHead>
                <TableHead className="text-start">{t('colType')}</TableHead>
                <TableHead className="text-start">{t('colRecordType')}</TableHead>
                <TableHead className="text-start">{t('colAmount')}</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedOps.length === 0 && filteredExtCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-8">
                    {searchQuery ? t('noMatchingResults') : t('noCompletedOperations')}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {sortedCompletedItems.map((item) => item.kind === 'operation' ? (
                    <TableRow key={`op-${item.data.id}`}>
                      <TableCell className="font-medium">{getOpPatientName(item.data)}</TableCell>
                      <TableCell dir="ltr" className="text-start">
                        {format(new Date(item.data.operation_date), 'dd-MM-yyyy')}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start">
                        {item.data.completed_date ? format(new Date(item.data.completed_date), 'dd-MM-yyyy') : '—'}
                      </TableCell>
                      <TableCell>{item.data.hospital_name}</TableCell>
                      <TableCell>{item.data.operation_type}</TableCell>
                      <TableCell>
                        <span className="inline-block rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 dark:bg-green-900/30 dark:text-green-400">
                          {t('operationBadge')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {editingAmountId === item.data.id && editAmountKind === 'operation' ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" min="0" step="0.5" value={editAmountValue} onChange={(e) => setEditAmountValue(e.target.value)} className="h-7 w-20 text-xs" dir="ltr" autoFocus />
                            <button onClick={() => handleSaveAmount(item.data.id, 'operation')} disabled={savingAmountId === item.data.id} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                              {savingAmountId === item.data.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </button>
                            <button onClick={() => { setEditingAmountId(null); setEditAmountValue('') }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group">
                            <span className="font-semibold">{item.data.completion_amount?.toFixed(2) ?? '—'}</span>
                            <span className="text-xs text-muted-foreground">د.أ</span>
                            <button onClick={() => { setEditingAmountId(item.data.id); setEditAmountKind('operation'); setEditAmountValue((item.data.completion_amount ?? 0).toString()) }} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handlePrint(item.data)} title="طباعة"><Printer className="h-3.5 w-3.5" /></Button>
                          {uncompleteConfirmId === item.data.id ? (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-600 hover:text-amber-700" onClick={() => handleUncomplete(item.data.id)} disabled={uncomletingId === item.data.id}>
                                {uncomletingId === item.data.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setUncompleteConfirmId(null)}><X className="h-3.5 w-3.5" /></Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20" onClick={() => setUncompleteConfirmId(item.data.id)} title={t('uncompleteOperation')}>
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={`ext-${item.data.id}`}>
                      <TableCell className="font-medium">{getPatientName(item.data.patient_id)}</TableCell>
                      <TableCell dir="ltr" className="text-start">
                        {format(new Date(item.data.cost_date), 'dd-MM-yyyy')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell>
                        <span className="inline-block rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 dark:bg-blue-900/30 dark:text-blue-400">
                          {item.data.visit_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-block rounded-full bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 dark:bg-orange-900/30 dark:text-orange-400">
                          {t('externalBadge')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {editingAmountId === item.data.id && editAmountKind === 'external' ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" min="0" step="0.5" value={editAmountValue} onChange={(e) => setEditAmountValue(e.target.value)} className="h-7 w-20 text-xs" dir="ltr" autoFocus />
                            <button onClick={() => handleSaveAmount(item.data.id, 'external')} disabled={savingAmountId === item.data.id} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                              {savingAmountId === item.data.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </button>
                            <button onClick={() => { setEditingAmountId(null); setEditAmountValue('') }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group">
                            <span className="font-semibold">{item.data.amount.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">د.أ</span>
                            <button onClick={() => { setEditingAmountId(item.data.id); setEditAmountKind('external'); setEditAmountValue(item.data.amount.toString()) }} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {extDeleteConfirmId === item.data.id ? (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDeleteExtCost(item.data.id)} disabled={extDeletingId === item.data.id}>
                                {extDeletingId === item.data.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setExtDeleteConfirmId(null)}><X className="h-3.5 w-3.5" /></Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setExtDeleteConfirmId(item.data.id)} title={t('deleteOperation')}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  )
}
