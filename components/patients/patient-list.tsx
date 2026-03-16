'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { PatientCard } from './patient-card'
import { Button } from '@/components/ui/button'

interface PatientData {
  id: string
  full_name_ar: string
  full_name_en: string | null
  phone: string
  last_visit_date?: string | null
  patients: {
    date_of_birth: string
    blood_type: string | null
    patient_code: string | null
  } | null
}

interface PatientListProps {
  patients: PatientData[]
  count: number
  page: number
  perPage: number
  basePath: string
  labels: {
    phone: string
    dateOfBirth: string
    bloodType: string
    empty: string
    noResults: string
    previous: string
    next: string
    pageLabel: string
    of: string
    total: string
  }
  hasQuery: boolean
}

export function PatientList({
  patients,
  count,
  page,
  perPage,
  basePath,
  labels,
  hasQuery,
}: PatientListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = Math.ceil(count / perPage)

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.replace(`${pathname}?${params.toString()}`)
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-lg">{hasQuery ? labels.noResults : labels.empty}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Total count */}
      <p className="text-sm text-muted-foreground">
        {labels.total}: {count}
      </p>

      {/* Patient grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {patients.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={patient}
            basePath={basePath}
            lastVisitDate={patient.last_visit_date}
            labels={{
              phone: labels.phone,
              dateOfBirth: labels.dateOfBirth,
              bloodType: labels.bloodType,
            }}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            {labels.previous}
          </Button>
          <span className="text-sm text-muted-foreground">
            {labels.pageLabel} {page} {labels.of} {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
          >
            {labels.next}
          </Button>
        </div>
      )}
    </div>
  )
}
