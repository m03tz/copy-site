'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { searchPatients } from '@/lib/actions/patients'

// ─── Types ────────────────────────────────────────────────────────────────────

type PatientResult = {
  id: string
  full_name_ar: string
  full_name_en: string | null
  phone: string
  patients: { id: string; national_id?: string | null; patient_code?: string | null }[] | { id: string; national_id?: string | null; patient_code?: string | null }
}

// ─── PatientAutocomplete ──────────────────────────────────────────────────────

/**
 * Debounced patient search with autocomplete dropdown.
 * Navigates to the patient profile page on selection.
 * Uses shadcn Popover + Command pattern per research.
 */
export function PatientAutocomplete({ basePath = '/doctor/patients' }: { basePath?: string }) {
  const t = useTranslations('dashboard')
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientResult[]>([])
  const [isPending, startTransition] = useTransition()

  const handleSearch = useDebouncedCallback((value: string) => {
    if (!value.trim()) {
      setResults([])
      return
    }

    startTransition(async () => {
      const { patients } = await searchPatients(value, 1, 8)
      setResults((patients as PatientResult[] | undefined) ?? [])
    })
  }, 300)

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    setOpen(true)
    handleSearch(value)
  }

  function handleSelect(patient: PatientResult) {
    router.push(`/doctor/patients/${patient.id}`)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <Popover open={open && results.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Wrap in a div so Popover trigger matches the full width input */}
        <div className="relative w-full">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={handleInputChange}
            placeholder={t('searchPatients')}
            className="ps-10"
            autoComplete="off"
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            <CommandEmpty>
              {isPending ? t('searchLoading') : t('searchNoResults')}
            </CommandEmpty>

            <CommandGroup>
              {results.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.id}
                  onSelect={() => handleSelect(patient)}
                  className="flex flex-col items-start gap-0.5 cursor-pointer"
                >
                  <span className="font-medium">{patient.full_name_ar}</span>
                  <span className="text-xs text-muted-foreground">
                    {patient.phone}
                    {(() => {
                      const p = Array.isArray(patient.patients) ? patient.patients[0] : patient.patients
                      return p?.national_id ? ` · ${p.national_id}` : ''
                    })()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
