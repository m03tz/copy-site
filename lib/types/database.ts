export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'patient' | 'doctor' | 'secretary'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
export type AppointmentType = 'consultation' | 'follow_up' | 'prenatal' | 'ultrasound' | 'other'
export type PregnancyStatus = 'active' | 'delivered' | 'miscarriage' | 'ectopic'
export type FileType = 'image' | 'pdf'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name_ar: string
          full_name_en: string | null
          phone: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: UserRole
          full_name_ar: string
          full_name_en?: string | null
          phone: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          full_name_ar?: string
          full_name_en?: string | null
          phone?: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          id: string
          date_of_birth: string
          blood_type: string | null
          national_id: string | null
          patient_code: string | null
          nickname: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id: string
          date_of_birth: string
          blood_type?: string | null
          national_id?: string | null
          patient_code?: string | null
          nickname?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date_of_birth?: string
          blood_type?: string | null
          national_id?: string | null
          patient_code?: string | null
          nickname?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      doctor_schedule: {
        Row: {
          id: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration_minutes: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration_minutes?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          slot_duration_minutes?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      doctor_holidays: {
        Row: {
          id: string
          doctor_id: string
          holiday_date: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          holiday_date: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          holiday_date?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          scheduled_start: string
          scheduled_end: string
          status: AppointmentStatus
          appointment_type: AppointmentType
          cancellation_reason: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          scheduled_start: string
          scheduled_end: string
          status?: AppointmentStatus
          appointment_type: AppointmentType
          cancellation_reason?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          scheduled_start?: string
          scheduled_end?: string
          status?: AppointmentStatus
          appointment_type?: AppointmentType
          cancellation_reason?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          id: string
          patient_id: string
          appointment_id: string | null
          doctor_id: string
          visit_date: string
          chief_complaint: string | null
          diagnosis: string | null
          treatment_plan: string | null
          vital_signs: Json | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          appointment_id?: string | null
          doctor_id: string
          visit_date: string
          chief_complaint?: string | null
          diagnosis?: string | null
          treatment_plan?: string | null
          vital_signs?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          appointment_id?: string | null
          doctor_id?: string
          visit_date?: string
          chief_complaint?: string | null
          diagnosis?: string | null
          treatment_plan?: string | null
          vital_signs?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          id: string
          medical_record_id: string
          patient_id: string
          doctor_id: string
          medication_name: string
          dosage: string
          duration: string
          quantity: string | null
          instructions: string | null
          created_at: string
        }
        Insert: {
          id?: string
          medical_record_id: string
          patient_id: string
          doctor_id: string
          medication_name: string
          dosage: string
          duration: string
          quantity?: string | null
          instructions?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          medical_record_id?: string
          patient_id?: string
          doctor_id?: string
          medication_name?: string
          dosage?: string
          duration?: string
          quantity?: string | null
          instructions?: string | null
          created_at?: string
        }
        Relationships: []
      }
      patient_files: {
        Row: {
          id: string
          patient_id: string
          uploaded_by: string
          file_name: string
          file_type: FileType
          file_path: string
          description: string | null
          medical_record_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          uploaded_by: string
          file_name: string
          file_type: FileType
          file_path: string
          description?: string | null
          medical_record_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          uploaded_by?: string
          file_name?: string
          file_type?: FileType
          file_path?: string
          description?: string | null
          medical_record_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pregnancies: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          lmp_date: string
          expected_due_date: string
          edd_by_early_us: string | null
          status: PregnancyStatus
          baby_gender: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          lmp_date: string
          expected_due_date?: string
          edd_by_early_us?: string | null
          status?: PregnancyStatus
          baby_gender?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          lmp_date?: string
          expected_due_date?: string
          edd_by_early_us?: string | null
          status?: PregnancyStatus
          baby_gender?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pregnancy_measurements: {
        Row: {
          id: string
          pregnancy_id: string
          measured_at: string
          gestational_week: number | null
          weight_kg: number | null
          blood_pressure: string | null
          fetal_heartbeat: number | null
          notes: string | null
          // ANC ultrasound fields (TEXT — free text allowed)
          crl: string | null
          bpd: string | null
          fl: string | null
          ac: string | null
          efw: string | null
          // ANC lab fields
          hb: number | null
          rbs: number | null
          tsh_lab: number | null
          ogtt: number | null
          ogtt_fasting: number | null
          ogtt_1hr: number | null
          ogtt_2hr: number | null
          // Obstetric clinical fields
          fh: string | null
          placenta: string | null
          liquor: string | null
          plt: number | null
          ua: string | null
          hcg: number | null
          b_hcg: number | null
          created_at: string
        }
        Insert: {
          id?: string
          pregnancy_id: string
          measured_at?: string
          gestational_week?: number | null
          weight_kg?: number | null
          blood_pressure?: string | null
          fetal_heartbeat?: number | null
          notes?: string | null
          crl?: string | null
          bpd?: string | null
          fl?: string | null
          ac?: string | null
          efw?: string | null
          hb?: number | null
          rbs?: number | null
          tsh_lab?: number | null
          ogtt?: number | null
          ogtt_fasting?: number | null
          ogtt_1hr?: number | null
          ogtt_2hr?: number | null
          fh?: string | null
          placenta?: string | null
          liquor?: string | null
          plt?: number | null
          ua?: string | null
          hcg?: number | null
          b_hcg?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          pregnancy_id?: string
          measured_at?: string
          gestational_week?: number | null
          weight_kg?: number | null
          blood_pressure?: string | null
          fetal_heartbeat?: number | null
          notes?: string | null
          crl?: string | null
          bpd?: string | null
          fl?: string | null
          ac?: string | null
          efw?: string | null
          hb?: number | null
          rbs?: number | null
          tsh_lab?: number | null
          ogtt?: number | null
          ogtt_fasting?: number | null
          ogtt_1hr?: number | null
          ogtt_2hr?: number | null
          fh?: string | null
          placenta?: string | null
          liquor?: string | null
          plt?: number | null
          ua?: string | null
          hcg?: number | null
          b_hcg?: number | null
          created_at?: string
        }
        Relationships: []
      }
      infertility_records: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          record_date: string
          visit_number: number | null
          parity: string | null
          pmh: string | null
          psh: string | null
          pdh: string | null
          lmp_date: string | null
          complaint: string | null
          us_findings: string | null
          plan: string | null
          hsg_date: string | null
          hsg_result: string | null
          fsh: number | null
          lh: number | null
          amh: number | null
          tsh: number | null
          prl: number | null
          homa_score: number | null
          sfa_count: number | null
          sfa_motility: number | null
          sfa_morphology: number | null
          sfa_viscosity: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          record_date?: string
          visit_number?: number | null
          parity?: string | null
          pmh?: string | null
          psh?: string | null
          pdh?: string | null
          lmp_date?: string | null
          complaint?: string | null
          us_findings?: string | null
          plan?: string | null
          hsg_date?: string | null
          hsg_result?: string | null
          fsh?: number | null
          lh?: number | null
          amh?: number | null
          tsh?: number | null
          prl?: number | null
          homa_score?: number | null
          sfa_count?: number | null
          sfa_motility?: number | null
          sfa_morphology?: number | null
          sfa_viscosity?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          record_date?: string
          visit_number?: number | null
          parity?: string | null
          pmh?: string | null
          psh?: string | null
          pdh?: string | null
          lmp_date?: string | null
          complaint?: string | null
          us_findings?: string | null
          plan?: string | null
          hsg_date?: string | null
          hsg_result?: string | null
          fsh?: number | null
          lh?: number | null
          amh?: number | null
          tsh?: number | null
          prl?: number | null
          homa_score?: number | null
          sfa_count?: number | null
          sfa_motility?: number | null
          sfa_morphology?: number | null
          sfa_viscosity?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          invoice_number: number
          appointment_id: string | null
          patient_id: string
          doctor_id: string
          amount_jod: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_number?: number
          appointment_id?: string | null
          patient_id: string
          doctor_id: string
          amount_jod?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_number?: number
          appointment_id?: string | null
          patient_id?: string
          doctor_id?: string
          amount_jod?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          amount_jod: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          amount_jod: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          amount_jod?: number
          created_at?: string
        }
        Relationships: []
      }
      lab_tests: {
        Row: {
          id: string
          patient_id: string
          medical_record_id: string | null
          test_type: string
          test_name: string
          result: string | null
          reference_values: string | null
          doctor_notes: string | null
          test_date: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          medical_record_id?: string | null
          test_type: string
          test_name: string
          result?: string | null
          reference_values?: string | null
          doctor_notes?: string | null
          test_date: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          medical_record_id?: string | null
          test_type?: string
          test_name?: string
          result?: string | null
          reference_values?: string | null
          doctor_notes?: string | null
          test_date?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          id: string
          patient_id: string | null
          operation_date: string
          hospital_name: string
          operation_type: string
          completion_type: string | null
          completion_amount: number | null
          is_completed: boolean | null
          completed_date: string | null
          notes: string | null
          doctor_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id?: string | null
          operation_date: string
          hospital_name: string
          operation_type: string
          completion_type?: string | null
          completion_amount?: number | null
          is_completed?: boolean | null
          completed_date?: string | null
          notes?: string | null
          doctor_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string | null
          operation_date?: string
          hospital_name?: string
          operation_type?: string
          completion_type?: string | null
          completion_amount?: number | null
          is_completed?: boolean | null
          completed_date?: string | null
          notes?: string | null
          doctor_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      external_costs: {
        Row: {
          id: string
          patient_id: string
          cost_date: string
          visit_type: string
          amount: number
          doctor_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          cost_date: string
          visit_type: string
          amount: number
          doctor_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          cost_date?: string
          visit_type?: string
          amount?: number
          doctor_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Patient = Database['public']['Tables']['patients']['Row']
export type DoctorSchedule = Database['public']['Tables']['doctor_schedule']['Row']
export type DoctorHoliday = Database['public']['Tables']['doctor_holidays']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type MedicalRecord = Database['public']['Tables']['medical_records']['Row']
export type Prescription = Database['public']['Tables']['prescriptions']['Row']
export type PatientFile = Database['public']['Tables']['patient_files']['Row']
export type Pregnancy = Database['public']['Tables']['pregnancies']['Row']
export type PregnancyMeasurement = Database['public']['Tables']['pregnancy_measurements']['Row']
export type InfertilityRecord = Database['public']['Tables']['infertility_records']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type LabTestRow = Database['public']['Tables']['lab_tests']['Row']
