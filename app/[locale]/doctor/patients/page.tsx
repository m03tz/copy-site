import { getTranslations } from 'next-intl/server'
import { searchPatients } from '@/lib/actions/patients'
import { PatientSearch } from '@/components/patients/patient-search'
import { PatientList } from '@/components/patients/patient-list'
import { AddPatientButton } from '@/components/patients/add-patient-button'
import { ExportPatientsButton } from '@/components/export/export-patients-button'

interface DoctorPatientsPageProps {
  searchParams: Promise<{ query?: string; page?: string }>
}

export default async function DoctorPatientsPage({ searchParams }: DoctorPatientsPageProps) {
  const t = await getTranslations('patients')

  const { query = '', page: pageParam = '1' } = await searchParams
  const page = Math.max(1, parseInt(pageParam, 10) || 1)

  const result = await searchPatients(query, page)

  const patients = (result.patients ?? []) as {
    id: string
    full_name_ar: string
    full_name_en: string | null
    phone: string
    patients: {
      date_of_birth: string
      blood_type: string | null
      patient_code: string | null
    } | null
  }[]

  const count = result.count ?? 0
  const perPage = result.perPage ?? 12

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <ExportPatientsButton />
          <AddPatientButton />
        </div>
      </div>

      <PatientSearch placeholder={t('search.placeholder')} />

      <PatientList
        patients={patients}
        count={count}
        page={page}
        perPage={perPage}
        basePath="/doctor/patients"
        labels={{
          phone: t('card.phone'),
          dateOfBirth: t('card.dateOfBirth'),
          bloodType: t('card.bloodType'),
          empty: t('empty'),
          noResults: t('search.noResults'),
          previous: t('pagination.previous'),
          next: t('pagination.next'),
          pageLabel: t('pagination.page'),
          of: t('pagination.of'),
          total: t('title'),
        }}
        hasQuery={!!query}
      />
    </div>
  )
}
