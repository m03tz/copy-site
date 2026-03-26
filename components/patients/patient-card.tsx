import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NewVisitButton } from '@/components/patients/new-visit-button'

interface PatientData {
  id: string
  full_name_ar: string
  full_name_en: string | null
  phone: string
  patients:
    | {
        date_of_birth: string
        blood_type: string | null
        patient_code: string | null
      }
    | {
        date_of_birth: string
        blood_type: string | null
        patient_code: string | null
      }[]
    | null
}

interface PatientCardProps {
  patient: PatientData
  basePath: string
  lastVisitDate?: string | null
  labels: {
    phone: string
    dateOfBirth: string
    bloodType: string
  }
}

export function PatientCard({ patient, basePath, lastVisitDate, labels }: PatientCardProps) {
  // Supabase may return the nested record as array or object
  const patientRecord = Array.isArray(patient.patients)
    ? patient.patients[0]
    : patient.patients

  return (
    <Card className="h-full flex flex-col transition-shadow hover:shadow-md">
      <Link href={`${basePath}/${patient.id}`} className="flex-1">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-start font-semibold leading-tight">{patient.full_name_ar}</p>
              {patient.full_name_en && (
                <p className="text-start text-sm text-muted-foreground">{patient.full_name_en}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {patientRecord?.patient_code && (
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  {patientRecord.patient_code}
                </span>
              )}
              {lastVisitDate && (
                <span className="text-xs font-medium text-red-500">{lastVisitDate}</span>
              )}
            </div>
          </div>
          {patientRecord?.blood_type && (
            <Badge variant="secondary" className="w-fit">
              {patientRecord.blood_type}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{labels.phone}:</span>
            <span dir="ltr">{patient.phone}</span>
          </div>
          {patientRecord?.date_of_birth && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{labels.dateOfBirth}:</span>
              <span>{patientRecord.date_of_birth}</span>
            </div>
          )}
        </CardContent>
      </Link>
      <CardFooter className="pt-0 pb-3 px-4">
        <NewVisitButton patientId={patient.id} lastVisitDate={lastVisitDate} />
      </CardFooter>
    </Card>
  )
}
