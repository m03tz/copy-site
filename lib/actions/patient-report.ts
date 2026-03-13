'use server'

import { createClient } from '@/lib/supabase/server'

export interface PatientReportData {
  patient: {
    full_name_ar: string
    full_name_en: string | null
    phone: string
    email: string | null
    date_of_birth: string | null
    blood_type: string | null
    national_id: string | null
    patient_code: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    notes: string | null
  }
  visits: {
    visit_date: string
    chief_complaint: string | null
    diagnosis: string | null
    treatment_plan: string | null
    vital_signs: Record<string, string> | null
    notes: string | null
    prescriptions: {
      medication_name: string
      dosage: string
      duration: string
      instructions: string | null
    }[]
  }[]
  pregnancies: {
    status: string
    lmp_date: string
    expected_due_date: string
    notes: string | null
  }[]
}

/**
 * Fetch all patient data for PDF report generation.
 * Only doctor or secretary can access this.
 */
export async function getPatientReportData(
  patientId: string
): Promise<{ data?: PatientReportData; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Unauthorized' }
  }

  const [profileResult, visitsResult, pregnanciesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, patients(*)')
      .eq('id', patientId)
      .single() as unknown as Promise<{
        data: {
          full_name_ar: string
          full_name_en: string | null
          phone: string
          email: string | null
          patients: {
            date_of_birth: string
            blood_type: string | null
            national_id: string | null
            emergency_contact_name: string | null
            emergency_contact_phone: string | null
            notes: string | null
          } | null
        } | null
        error: unknown
      }>,

    supabase
      .from('medical_records')
      .select('*, prescriptions(*)')
      .eq('patient_id', patientId)
      .is('deleted_at', null)
      .order('visit_date', { ascending: false }) as unknown as Promise<{
        data: {
          visit_date: string
          chief_complaint: string | null
          diagnosis: string | null
          treatment_plan: string | null
          vital_signs: Record<string, string> | null
          notes: string | null
          prescriptions: {
            medication_name: string
            dosage: string
            duration: string
            instructions: string | null
          }[]
        }[] | null
        error: unknown
      }>,

    supabase
      .from('pregnancies')
      .select('status, lmp_date, expected_due_date, notes')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }) as unknown as Promise<{
        data: {
          status: string
          lmp_date: string
          expected_due_date: string
          notes: string | null
        }[] | null
        error: unknown
      }>,
  ])

  if (!profileResult.data) return { error: 'Patient not found' }

  const patientRecord = Array.isArray(profileResult.data.patients)
    ? (profileResult.data.patients[0] ?? null)
    : profileResult.data.patients

  return {
    data: {
      patient: {
        full_name_ar: profileResult.data.full_name_ar,
        full_name_en: profileResult.data.full_name_en,
        phone: profileResult.data.phone,
        email: profileResult.data.email,
        date_of_birth: patientRecord?.date_of_birth ?? null,
        blood_type: patientRecord?.blood_type ?? null,
        national_id: patientRecord?.national_id ?? null,
        patient_code: patientRecord?.patient_code ?? null,
        emergency_contact_name: patientRecord?.emergency_contact_name ?? null,
        emergency_contact_phone: patientRecord?.emergency_contact_phone ?? null,
        notes: patientRecord?.notes ?? null,
      },
      visits: visitsResult.data ?? [],
      pregnancies: pregnanciesResult.data ?? [],
    },
  }
}
