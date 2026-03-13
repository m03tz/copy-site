'use client'

import { useState, useCallback } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useDebouncedCallback } from 'use-debounce'
import { globalSearch, type SearchResult } from '@/lib/actions/search'
import { Users, Calendar, FileText, Search } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'

const typeIcons = {
  patient: Users,
  appointment: Calendar,
  visit: FileText,
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const t = useTranslations('search')

const debouncedSearch = useDebouncedCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const data = await globalSearch(value)
    setResults(data)
    setLoading(false)
  }, 300)

  const handleValueChange = useCallback(
    (value: string) => {
      setQuery(value)
      debouncedSearch(value)
    },
    [debouncedSearch]
  )

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false)
      setQuery('')
      setResults([])
      router.push(href)
    },
    [router]
  )

  // Group results by type
  const patients = results.filter((r) => r.type === 'patient')
  const appointments = results.filter((r) => r.type === 'appointment')
  const visits = results.filter((r) => r.type === 'visit')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>{t('placeholder')}</span>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('title')}
        description={t('placeholder')}
        shouldFilter={false}
      >
        <CommandInput
          placeholder={t('placeholder')}
          value={query}
          onValueChange={handleValueChange}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('loading')}
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>{t('noResults')}</CommandEmpty>
          )}
          {patients.length > 0 && (
            <CommandGroup heading={t('patients')}>
              {patients.map((r) => {
                const Icon = typeIcons[r.type]
                return (
                  <CommandItem key={r.id} onSelect={() => handleSelect(r.href)}>
                    <Icon className="me-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{r.title}</span>
                      <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
          {appointments.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t('appointments')}>
                {appointments.map((r) => {
                  const Icon = typeIcons[r.type]
                  return (
                    <CommandItem key={r.id} onSelect={() => handleSelect(r.href)}>
                      <Icon className="me-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{r.title}</span>
                        <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </>
          )}
          {visits.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t('visits')}>
                {visits.map((r) => {
                  const Icon = typeIcons[r.type]
                  return (
                    <CommandItem key={r.id} onSelect={() => handleSelect(r.href)}>
                      <Icon className="me-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{r.title}</span>
                        <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
