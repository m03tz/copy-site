'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { FilePlus, CheckCircle, ChevronsUpDown, Check, Loader2 } from 'lucide-react'
import { createVisitRecord } from '@/lib/actions/medical-records'
import { searchPatientsForCombobox } from '@/lib/actions/patients'
import { format } from 'date-fns'

interface Patient {
  id: string
  full_name_ar: string
  full_name_en: string | null
  phone?: string | null
  national_id?: string | null
  patient_code?: string | null
  last_visit_date?: string | null
}

interface AddRecordButtonProps {
  patients: Patient[]
}

export function AddRecordButton({ patients }: AddRecordButtonProps) {
  const t = useTranslations('visits')
  const tMedical = useTranslations('medicalRecords')
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [comboOpen, setComboOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [patientId, setPatientId] = useState<string>('')
  const [visitNote, setVisitNote] = useState<string>('')
  const [patientSearch, setPatientSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = patientSearch.trim()
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
  }, [patientSearch])

  // Only show results when actively searching — prevents rendering 6000+ items at once
  const displayedPatients = patientSearch.trim() ? searchResults : []

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)

    if (!patientId) {
      setError(locale === 'ar' ? 'يرجى اختيار المريضة' : 'Please select a patient')
      return
    }

    if (!visitNote) {
      setError(locale === 'ar' ? 'الملاحظات السريرية مطلوبة' : 'Clinical Notes is required')
      return
    }

    formData.set('notes', visitNote)

    formData.set('patient_id', patientId)

    startTransition(async () => {
      const result = await createVisitRecord(formData)
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'An error occurred')
      } else {
        setSuccess(true)
        router.refresh()
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          setPatientId('')
          setVisitNote('')
        }, 1500)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); setSuccess(false); setPatientId(''); setVisitNote(''); setPatientSearch(''); setSearchResults([]); setComboOpen(false); setSelectedPatient(null) } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FilePlus className="h-4 w-4 me-1" />
          {t('create')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('create')}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">
              {locale === 'ar' ? 'تم حفظ السجل بنجاح' : 'Record saved successfully'}
            </p>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            {/* Patient Select (searchable) */}
            <div className="space-y-1">
              <Label>{tMedical('selectPatient')}</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {patientId
                        ? (selectedPatient?.full_name_ar ?? tMedical('selectPatient'))
                        : tMedical('selectPatient')}
                    </span>
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={locale === 'ar' ? 'بحث بالاسم...' : 'Search by name...'}
                      value={patientSearch}
                      onValueChange={setPatientSearch}
                    />
                    <CommandList>
                      {isSearching ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : patientSearch.trim() ? (
                        <CommandEmpty>{locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}</CommandEmpty>
                      ) : (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          {locale === 'ar' ? 'ابحث عن المريضة...' : 'Type to search patients...'}
                        </div>
                      )}
                      <CommandGroup>
                        {displayedPatients.map((patient) => (
                          <CommandItem
                            key={patient.id}
                            value={patient.id}
                            onSelect={() => {
                              setPatientId(patient.id)
                              setSelectedPatient(patient)
                              setPatientSearch('')
                              setComboOpen(false)
                            }}
                          >
                            <Check className={`me-2 h-4 w-4 shrink-0 ${patientId === patient.id ? 'opacity-100' : 'opacity-0'}`} />
                            <div className="flex flex-col min-w-0">
                              <span>{patient.full_name_ar}</span>
                              {(patient.patient_code || patient.national_id || patient.phone) && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {[patient.patient_code, patient.national_id, patient.phone].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Last visit date indicator */}
            {patientId && selectedPatient?.last_visit_date && (
              <p className="text-xs font-medium text-red-500">
                {locale === 'ar' ? 'آخر زيارة:' : 'Last visit:'} {selectedPatient.last_visit_date}
              </p>
            )}

            {/* Visit Date */}
            <div className="space-y-1">
              <Label htmlFor="visit_date">{t('form.visitDate')}</Label>
              <DatePickerInput id="visit_date" name="visit_date" defaultValue={todayStr} required />
            </div>

            {/* Vital Signs */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('form.vitalSigns')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="vs_bp" className="text-xs">{t('form.bloodPressure')}</Label>
                  <Input id="vs_bp" name="vital_signs_blood_pressure" placeholder="120/80" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vs_weight" className="text-xs">{t('form.weight')}</Label>
                  <Input id="vs_weight" name="vital_signs_weight" placeholder="70" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vs_temp" className="text-xs">{t('form.temperature')}</Label>
                  <Input id="vs_temp" name="vital_signs_temperature" placeholder="37.0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vs_pulse" className="text-xs">{t('form.pulse')}</Label>
                  <Input id="vs_pulse" name="vital_signs_pulse" placeholder="72" />
                </div>
              </div>
            </div>

            {/* Notes — ANC / GYNE */}
            <div className="space-y-1">
              <Label>{t('form.notes')} <span className="text-destructive">*</span></Label>
              <Select value={visitNote} onValueChange={setVisitNote}>
                <SelectTrigger>
                  <SelectValue placeholder={t('form.notes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANC">
                    <span className="font-semibold text-red-600">ANC</span>
                  </SelectItem>
                  <SelectItem value="GYNE">
                    <span className="font-semibold text-green-600">GYNE</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? '...' : t('actions.save')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
