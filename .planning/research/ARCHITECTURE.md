# Architecture Research

**Domain:** Clinic Management System (OB/GYN)
**Researched:** 2026-02-06
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │   Patient   │  │  Secretary  │  │  Doctor Portal   │    │
│  │   Portal    │  │   Portal    │  │                  │    │
│  └─────────────┘  └─────────────┘  └──────────────────┘    │
│         Next.js App Router (SSR + Client Components)        │
│              RTL Support (Arabic/English i18n)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ Auth Service     │  │ Business Logic Services      │    │
│  │ - Supabase Auth  │  │ - Appointment Management     │    │
│  │ - RBAC           │  │ - Medical Records            │    │
│  │ - Session Mgmt   │  │ - Prescription Generation    │    │
│  └──────────────────┘  │ - Pregnancy Tracking         │    │
│                        │ - Notification Service       │    │
│                        └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ Supabase         │  │ Supabase Storage             │    │
│  │ PostgreSQL       │  │ - Medical Images             │    │
│  │ - Tables + RLS   │  │ - Prescription PDFs          │    │
│  │ - Realtime       │  │ - Patient Documents          │    │
│  │ - Edge Functions │  └──────────────────────────────┘    │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                           │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ Email Provider   │  │ Optional Integrations        │    │
│  │ - Resend/SendGrid│  │ - SMS Gateway                │    │
│  │ - Supabase Email │  │ - Lab Results API            │    │
│  └──────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Authentication & Authorization** | User identity, role management, session handling | Supabase Auth + RLS policies |
| **Appointment Management** | Scheduling, availability, cancellations, reminders | Next.js Server Actions + Supabase |
| **Patient Registry** | Patient demographics, contact info, medical history | Supabase tables with RLS |
| **Medical Records** | Visit notes, diagnoses, treatment plans | Supabase tables + Storage |
| **Prescription Management** | Prescription creation, history, PDF generation | Server-side PDF generation + Storage |
| **Pregnancy Tracking** | Prenatal visits, ultrasounds, delivery planning | Specialized tables with timeline |
| **File Management** | Upload/download medical images, documents | Supabase Storage with signed URLs |
| **Notification System** | Email/SMS for appointments, reminders | Supabase Edge Functions + Email API |
| **Reporting & Analytics** | Patient statistics, appointment metrics | PostgreSQL views + charts |
| **Audit Logging** | Track changes to sensitive medical data | Supabase triggers + audit table |

## Database Schema (Supabase)

### Core Tables

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'secretary', 'doctor')),
  full_name_ar TEXT NOT NULL,
  full_name_en TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients (extended profile for medical info)
CREATE TABLE patients (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  date_of_birth DATE NOT NULL,
  blood_type TEXT,
  allergies TEXT[],
  chronic_conditions TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  national_id TEXT,
  address TEXT,
  medical_history_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')),
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('consultation', 'follow_up', 'prenatal', 'ultrasound', 'emergency')),
  notes TEXT,
  cancellation_reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_overlap EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(scheduled_start, scheduled_end) WITH &&
  ) WHERE (status != 'cancelled')
);

-- Medical Records (Visit notes)
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  vital_signs JSONB, -- {bp: "120/80", temp: "37", weight: "65", height: "165"}
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id),
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  medications JSONB NOT NULL, -- [{name: "...", dosage: "...", frequency: "...", duration: "..."}]
  instructions TEXT,
  pdf_url TEXT, -- Supabase Storage URL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pregnancy Tracking
CREATE TABLE pregnancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  lmp_date DATE NOT NULL, -- Last Menstrual Period
  edd_date DATE NOT NULL, -- Estimated Delivery Date
  gravida INTEGER, -- Number of pregnancies
  para INTEGER, -- Number of births
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'terminated')),
  delivery_date DATE,
  delivery_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prenatal Visits (specialized for pregnancy tracking)
CREATE TABLE prenatal_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregnancy_id UUID NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id),
  visit_date DATE NOT NULL,
  gestational_age_weeks INTEGER,
  weight_kg DECIMAL(5,2),
  blood_pressure TEXT,
  fundal_height_cm DECIMAL(4,1),
  fetal_heart_rate INTEGER,
  ultrasound_notes TEXT,
  ultrasound_images TEXT[], -- Supabase Storage URLs
  concerns TEXT,
  next_visit_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical Files (images, documents)
CREATE TABLE medical_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id),
  pregnancy_id UUID REFERENCES pregnancies(id),
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf', 'lab_result', 'ultrasound', 'other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_size_bytes INTEGER,
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Queue
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('appointment_reminder', 'appointment_confirmation', 'appointment_cancellation', 'test_result', 'general')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
  subject TEXT,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  metadata JSONB, -- {appointment_id: "...", error: "..."}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES profiles(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor Availability (for appointment scheduling)
CREATE TABLE doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinic Settings
CREATE TABLE clinic_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);
```

### Relationships Diagram

```
profiles (1) ──< (N) patients
    │
    ├──< appointments (doctor_id)
    ├──< medical_records (doctor_id)
    ├──< prescriptions (doctor_id)
    └──< notifications

patients (1) ──< (N) appointments
    │
    ├──< medical_records
    ├──< prescriptions
    ├──< pregnancies
    └──< medical_files

appointments (1) ──o (0..1) medical_records

pregnancies (1) ──< (N) prenatal_visits
    │
    └──< medical_files

medical_records (1) ──< (N) prescriptions
    │
    ├──o (0..1) prenatal_visits
    └──< medical_files
```

### RLS (Row Level Security) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pregnancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prenatal_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Example RLS Policies for appointments table
-- Doctor: Full access
CREATE POLICY "Doctors can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Secretary: Full access to manage appointments
CREATE POLICY "Secretaries can manage all appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('secretary', 'doctor')
    )
  );

-- Patient: View only their own appointments
CREATE POLICY "Patients can view their own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Example RLS for medical_records (highly sensitive)
-- Patient: Read-only access to their own records
CREATE POLICY "Patients can view their own medical records"
  ON medical_records FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Doctor: Full access
CREATE POLICY "Doctors can manage all medical records"
  ON medical_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Secretary: No access to medical records (privacy)
-- No policy created = no access

-- Storage Bucket Policies
-- medical_files bucket: authenticated users only, validate file type
```

## Recommended Project Structure

```
clinic-management/
├── src/
│   ├── app/                          # Next.js 14+ App Router
│   │   ├── [locale]/                 # i18n routing (ar, en)
│   │   │   ├── (auth)/               # Auth routes (login, signup)
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (patient)/            # Patient portal routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── appointments/
│   │   │   │   ├── medical-history/
│   │   │   │   └── prescriptions/
│   │   │   ├── (secretary)/          # Secretary portal routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── appointments/
│   │   │   │   ├── patients/
│   │   │   │   └── schedule/
│   │   │   ├── (doctor)/             # Doctor portal routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── appointments/
│   │   │   │   ├── patients/
│   │   │   │   ├── medical-records/
│   │   │   │   ├── prescriptions/
│   │   │   │   ├── pregnancy-tracking/
│   │   │   │   └── settings/
│   │   │   ├── api/                  # API routes (if needed)
│   │   │   │   └── webhooks/
│   │   │   └── layout.tsx
│   │   └── globals.css
│   ├── components/                   # React components
│   │   ├── ui/                       # Shadcn/ui components
│   │   ├── appointments/
│   │   ├── patients/
│   │   ├── medical-records/
│   │   ├── prescriptions/
│   │   ├── pregnancy/
│   │   ├── auth/
│   │   └── shared/
│   ├── lib/                          # Utilities and configurations
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase client (browser)
│   │   │   ├── server.ts             # Supabase server client
│   │   │   ├── middleware.ts         # Auth middleware
│   │   │   └── migrations/           # SQL migration files
│   │   ├── utils/
│   │   │   ├── date.ts               # Date formatting
│   │   │   ├── validators.ts         # Input validation
│   │   │   └── formatters.ts         # Data formatting
│   │   ├── constants/
│   │   └── types/                    # TypeScript types
│   ├── actions/                      # Next.js Server Actions
│   │   ├── appointments.ts
│   │   ├── patients.ts
│   │   ├── medical-records.ts
│   │   ├── prescriptions.ts
│   │   └── auth.ts
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useAppointments.ts
│   │   ├── usePatients.ts
│   │   └── useRealtime.ts
│   ├── services/                     # Business logic layer
│   │   ├── appointment-service.ts
│   │   ├── notification-service.ts
│   │   ├── pdf-service.ts
│   │   └── file-service.ts
│   ├── middleware.ts                 # Next.js middleware (auth)
│   └── i18n/                         # Internationalization
│       ├── locales/
│       │   ├── ar.json
│       │   └── en.json
│       └── config.ts
├── supabase/
│   ├── functions/                    # Edge Functions
│   │   ├── send-email/
│   │   ├── generate-prescription-pdf/
│   │   └── appointment-reminder/
│   ├── migrations/                   # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_triggers.sql
│   └── config.toml
├── public/
│   ├── locales/
│   └── assets/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Architectural Patterns

### 1. Server-Side Rendering (SSR) with Next.js App Router

**Pattern:** Use React Server Components by default, client components only when needed.

**Benefits:**
- Better SEO for patient-facing pages
- Reduced JavaScript bundle size
- Direct database access from server components
- Automatic code splitting

**Implementation:**
```typescript
// app/(doctor)/patients/[id]/page.tsx (Server Component)
import { createServerClient } from '@/lib/supabase/server';

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();

  const { data: patient } = await supabase
    .from('patients')
    .select('*, medical_records(*), prescriptions(*)')
    .eq('id', params.id)
    .single();

  return <PatientDetail patient={patient} />;
}
```

### 2. Row Level Security (RLS) First Approach

**Pattern:** Enforce security at database layer, not application layer.

**Benefits:**
- Security cannot be bypassed
- Consistent access control across all clients
- Simplified application logic
- Audit trail at database level

**Implementation:**
```sql
-- Security enforced at database level
-- Even if application has bugs, data remains protected
CREATE POLICY "patients_own_data"
  ON medical_records FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'secretary')
    )
  );
```

### 3. Server Actions for Mutations

**Pattern:** Use Next.js Server Actions for all data mutations.

**Benefits:**
- Type-safe API calls
- No need for API routes
- Automatic revalidation
- Progressive enhancement

**Implementation:**
```typescript
// actions/appointments.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';

export async function createAppointment(formData: FormData) {
  const supabase = createServerClient();

  const appointment = {
    patient_id: formData.get('patient_id'),
    scheduled_start: formData.get('scheduled_start'),
    scheduled_end: formData.get('scheduled_end'),
    appointment_type: formData.get('appointment_type'),
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/appointments');
  return { success: true, data };
}
```

### 4. Optimistic Updates with Realtime

**Pattern:** Update UI immediately, sync with Realtime subscriptions.

**Benefits:**
- Instant feedback to users
- Collaborative features (multiple secretaries)
- Automatic conflict resolution

**Implementation:**
```typescript
// hooks/useAppointments.ts
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export function useAppointments(date: Date) {
  const [appointments, setAppointments] = useState([]);
  const supabase = createBrowserClient();

  useEffect(() => {
    // Initial fetch
    fetchAppointments();

    // Subscribe to changes
    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          // Update local state based on change
          handleRealtimeChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date]);

  return { appointments };
}
```

### 5. File Upload with Signed URLs

**Pattern:** Generate short-lived signed URLs for secure file access.

**Benefits:**
- No public file access
- Temporary URLs expire
- Audit file access
- Works with RLS

**Implementation:**
```typescript
// services/file-service.ts
export async function uploadMedicalFile(file: File, patientId: string) {
  const supabase = createBrowserClient();

  // Upload to Supabase Storage
  const fileName = `${patientId}/${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('medical_files')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Save metadata to database
  const { data: fileRecord } = await supabase
    .from('medical_files')
    .insert({
      patient_id: patientId,
      file_name: file.name,
      file_url: uploadData.path,
      file_type: getFileType(file.type),
      file_size_bytes: file.size,
    })
    .select()
    .single();

  return fileRecord;
}

export async function getSignedUrl(filePath: string) {
  const supabase = createBrowserClient();

  const { data } = await supabase.storage
    .from('medical_files')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  return data.signedUrl;
}
```

### 6. Edge Functions for Background Jobs

**Pattern:** Use Supabase Edge Functions for async tasks (emails, PDF generation).

**Benefits:**
- Serverless execution
- No server management
- Automatic scaling
- Global distribution

**Implementation:**
```typescript
// supabase/functions/send-appointment-reminder/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get appointments for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, patients(*)')
    .gte('scheduled_start', tomorrow.toISOString())
    .lt('scheduled_start', new Date(tomorrow.getTime() + 86400000).toISOString())
    .eq('status', 'scheduled');

  // Send reminders
  for (const appointment of appointments) {
    await sendEmail({
      to: appointment.patients.email,
      subject: 'Appointment Reminder',
      body: `You have an appointment tomorrow at ${appointment.scheduled_start}`,
    });
  }

  return new Response('OK');
});
```

## Data Flow

### 1. Authentication Flow

```
User Login Request
    │
    ├─> Next.js Middleware (auth check)
    │       │
    │       ├─> No Session → Redirect to /login
    │       └─> Has Session → Continue
    │
    ├─> Supabase Auth (verify credentials)
    │       │
    │       ├─> Success → Create session
    │       └─> Failure → Return error
    │
    └─> Fetch Profile (with role)
            │
            ├─> Doctor → Redirect to /doctor/dashboard
            ├─> Secretary → Redirect to /secretary/dashboard
            └─> Patient → Redirect to /patient/dashboard
```

### 2. Appointment Creation Flow

```
Secretary fills form
    │
    ├─> Client-side validation
    │       │
    │       └─> Check conflicts (optimistic)
    │
    ├─> Server Action: createAppointment()
    │       │
    │       ├─> Supabase Insert
    │       │       │
    │       │       ├─> RLS Check (secretary role)
    │       │       ├─> Constraint Check (no overlap)
    │       │       └─> Success
    │       │
    │       └─> Trigger: appointment_created
    │               │
    │               └─> Edge Function: send_confirmation_email
    │
    ├─> Revalidate Path (/appointments)
    │
    └─> Realtime Broadcast
            │
            └─> Update all connected clients
```

### 3. Medical Record Creation Flow

```
Doctor completes visit
    │
    ├─> Server Component: MedicalRecordForm
    │
    ├─> Server Action: createMedicalRecord()
    │       │
    │       ├─> Supabase Transaction:
    │       │   ├─> Insert medical_record
    │       │   ├─> Insert prescription (if any)
    │       │   ├─> Update appointment.status = 'completed'
    │       │   └─> Insert audit_log entry
    │       │
    │       └─> Upload files (if any)
    │               │
    │               └─> Supabase Storage + medical_files table
    │
    ├─> Generate Prescription PDF (if needed)
    │       │
    │       └─> Edge Function: generate_prescription_pdf
    │
    └─> Patient can view immediately (RLS permits)
```

### 4. File Access Flow

```
User requests medical file
    │
    ├─> Server Component: fetch file metadata
    │       │
    │       └─> Supabase Query (RLS applied)
    │
    ├─> RLS Check:
    │   ├─> Patient: own files only
    │   ├─> Doctor/Secretary: all files
    │   └─> Fail → 403 Error
    │
    ├─> Generate signed URL (1 hour expiry)
    │       │
    │       └─> Supabase Storage.createSignedUrl()
    │
    └─> Return URL to client
            │
            └─> Browser fetches file directly from Storage
```

### 5. Realtime Updates Flow

```
Secretary creates appointment
    │
    ├─> Database INSERT
    │
    ├─> PostgreSQL Trigger: notify_changes
    │
    ├─> Supabase Realtime broadcasts change
    │
    └─> All subscribed clients receive update
            │
            ├─> Doctor dashboard (updates schedule)
            ├─> Secretary dashboard (refreshes list)
            └─> Patient portal (shows new appointment)
```

## Scaling Considerations

| Concern | Solution | Implementation |
|---------|----------|----------------|
| **Database Performance** | Indexed queries, materialized views | Index on (patient_id, scheduled_start), view for dashboard stats |
| **File Storage** | CDN, image optimization | Supabase Storage has built-in CDN, use Next.js Image component |
| **Concurrent Appointments** | Database constraints, optimistic locking | EXCLUDE constraint on appointments, version column for optimistic locking |
| **Large Medical History** | Pagination, lazy loading | Cursor-based pagination, infinite scroll for medical records |
| **Multi-clinic Support** | Tenant isolation (future) | Add clinic_id to all tables, RLS policies per clinic |
| **Realtime Connections** | Channel-per-resource pattern | One channel per appointment day, not per appointment |
| **Email Queue** | Background jobs, rate limiting | Edge Functions with cron, queue table for retries |
| **Search Performance** | Full-text search, trigram indexes | PostgreSQL FTS on patient names, GIN index |
| **Report Generation** | Cached queries, background jobs | Materialized views refreshed nightly, async PDF generation |
| **API Rate Limits** | Connection pooling, caching | Supabase connection pooler (Supavisor), Redis for session cache |

### Performance Optimization Strategy

```typescript
// 1. Use React Server Components for data fetching (no waterfall)
async function PatientDashboard({ patientId }: Props) {
  const [patient, appointments, medicalRecords] = await Promise.all([
    getPatient(patientId),
    getAppointments(patientId),
    getMedicalRecords(patientId, { limit: 10 }),
  ]);

  return (
    <div>
      <PatientInfo patient={patient} />
      <AppointmentsList appointments={appointments} />
      <MedicalHistory records={medicalRecords} />
    </div>
  );
}

// 2. Implement cursor-based pagination for large datasets
export async function getMedicalRecords(
  patientId: string,
  { limit = 20, cursor }: { limit?: number; cursor?: string }
) {
  const supabase = createServerClient();

  let query = supabase
    .from('medical_records')
    .select('*')
    .eq('patient_id', patientId)
    .order('visit_date', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  return await query;
}

// 3. Cache expensive queries
import { unstable_cache } from 'next/cache';

export const getClinicStats = unstable_cache(
  async () => {
    const supabase = createServerClient();
    // Expensive aggregation query
    return await supabase.rpc('get_clinic_statistics');
  },
  ['clinic-stats'],
  { revalidate: 3600 } // Cache for 1 hour
);
```

## Anti-Patterns

### Anti-Pattern 1: Client-Side Security

**DON'T:**
```typescript
// Client component checking role (can be bypassed)
'use client';

export function MedicalRecord({ record }) {
  const { user } = useAuth();

  if (user.role !== 'doctor') {
    return <div>Access Denied</div>; // Security theater!
  }

  return <div>{record.diagnosis}</div>;
}
```

**DO:**
```typescript
// Server component with RLS enforcing security
export async function MedicalRecord({ recordId }) {
  const supabase = createServerClient();

  // RLS ensures user can only fetch authorized records
  const { data: record } = await supabase
    .from('medical_records')
    .select('*')
    .eq('id', recordId)
    .single();

  if (!record) {
    return <div>Record not found or unauthorized</div>;
  }

  return <div>{record.diagnosis}</div>;
}
```

### Anti-Pattern 2: Storing Files as Base64 in Database

**DON'T:**
```typescript
// Storing image as base64 text in PostgreSQL
const imageBase64 = await fileToBase64(file);
await supabase.from('medical_files').insert({
  patient_id: patientId,
  image_data: imageBase64, // Bad: bloats database, slow queries
});
```

**DO:**
```typescript
// Store in Supabase Storage, reference URL in database
const { data } = await supabase.storage
  .from('medical_files')
  .upload(`${patientId}/${file.name}`, file);

await supabase.from('medical_files').insert({
  patient_id: patientId,
  file_url: data.path, // Good: efficient, scalable
});
```

### Anti-Pattern 3: N+1 Queries

**DON'T:**
```typescript
// Fetching appointments, then patient for each (N+1)
const { data: appointments } = await supabase
  .from('appointments')
  .select('*');

for (const apt of appointments) {
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', apt.patient_id)
    .single();
  // Process...
}
```

**DO:**
```typescript
// Single query with join
const { data: appointments } = await supabase
  .from('appointments')
  .select(`
    *,
    patients (
      id,
      full_name_ar,
      full_name_en,
      phone
    )
  `);
```

### Anti-Pattern 4: Missing Transaction Boundaries

**DON'T:**
```typescript
// Separate operations (can leave inconsistent state)
await supabase.from('appointments').update({ status: 'completed' }).eq('id', aptId);
await supabase.from('medical_records').insert({ appointment_id: aptId, ... });
// If second fails, appointment marked complete but no record!
```

**DO:**
```typescript
// Use Supabase RPC for transactions
// supabase/migrations/003_complete_appointment.sql
CREATE OR REPLACE FUNCTION complete_appointment(
  apt_id UUID,
  record_data JSONB
)
RETURNS medical_records AS $$
DECLARE
  new_record medical_records;
BEGIN
  -- Update appointment
  UPDATE appointments
  SET status = 'completed'
  WHERE id = apt_id;

  -- Insert medical record
  INSERT INTO medical_records (appointment_id, patient_id, ...)
  VALUES (apt_id, ...)
  RETURNING * INTO new_record;

  RETURN new_record;
END;
$$ LANGUAGE plpgsql;

// Client code
const { data } = await supabase.rpc('complete_appointment', {
  apt_id: appointmentId,
  record_data: recordData,
});
```

### Anti-Pattern 5: Ignoring Timezones

**DON'T:**
```typescript
// Using local time without timezone awareness
const appointmentTime = new Date('2026-02-06 14:00'); // Ambiguous!
```

**DO:**
```typescript
// Always use UTC, convert for display
import { zonedTimeToUtc, format } from 'date-fns-tz';

// Store in UTC
const utcTime = zonedTimeToUtc('2026-02-06 14:00', 'Asia/Riyadh');
await supabase.from('appointments').insert({
  scheduled_start: utcTime.toISOString(),
});

// Display in local time
const localTime = format(utcTime, 'PPpp', { timeZone: 'Asia/Riyadh' });
```

## Integration Points

### External Services

| Service | Purpose | Integration Method | Configuration |
|---------|---------|-------------------|---------------|
| **Supabase Auth** | User authentication | Native integration | Configured in Supabase dashboard |
| **Supabase Storage** | File uploads | Native SDK | Buckets: medical_files, prescriptions |
| **Supabase Realtime** | Live updates | WebSocket subscriptions | Channel per resource type |
| **Email Service** | Notifications | Edge Functions + Resend/SendGrid | API key in environment variables |
| **SMS Gateway** (Optional) | Appointment reminders | Edge Functions + Twilio | API credentials in Supabase secrets |
| **PDF Generator** | Prescription PDFs | Edge Function + Deno PDF library | Server-side rendering |
| **Analytics** (Optional) | Usage tracking | Vercel Analytics / Plausible | Privacy-focused, GDPR compliant |

### Internal Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Patient    │  │  Secretary   │  │   Doctor     │  │
│  │   Routes     │  │   Routes     │  │   Routes     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            ▼                             │
├─────────────────────────────────────────────────────────┤
│                    Application Layer                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Server Actions (mutations)            │    │
│  │  - createAppointment, updateMedicalRecord, etc   │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Business Logic Services                  │    │
│  │  - AppointmentService, NotificationService       │    │
│  └─────────────────────────────────────────────────┘    │
│                            ▼                             │
├─────────────────────────────────────────────────────────┤
│                      Data Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Supabase   │  │   Supabase   │  │     Edge     │  │
│  │   Client     │  │   Storage    │  │   Functions  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### API Boundaries

```typescript
// Clear separation: Server Components fetch data, Server Actions mutate

// Server Component (read)
async function AppointmentList() {
  const supabase = createServerClient();
  const { data } = await supabase.from('appointments').select('*');
  return <List items={data} />;
}

// Server Action (write)
'use server';
async function createAppointment(formData: FormData) {
  const supabase = createServerClient();
  return await supabase.from('appointments').insert(...);
}

// Edge Function (background job)
// Triggered by database trigger or cron
async function sendReminders() {
  // Runs on Supabase Edge runtime
}
```

## Build Order (Dependency Graph)

### Phase 1: Foundation (Week 1-2)
1. **Database Schema** - Create all tables, relationships, RLS policies
2. **Authentication** - Supabase Auth setup, role-based middleware
3. **Project Structure** - Next.js app router, i18n, basic layout
4. **UI Components** - Design system (Shadcn/ui), RTL support

**Dependencies:** None
**Validates:** Can create users, log in, see role-specific dashboards

### Phase 2: Core Entities (Week 3-4)
5. **Patient Management** - CRUD for patients (secretary/doctor)
6. **Appointment Scheduling** - Calendar UI, conflict detection, CRUD
7. **Doctor Availability** - Set working hours, manage schedule

**Dependencies:** Phase 1
**Validates:** Secretary can register patients, schedule appointments

### Phase 3: Medical Features (Week 5-6)
8. **Medical Records** - Visit notes, diagnosis, treatment plans
9. **Prescriptions** - Medication management, PDF generation
10. **File Uploads** - Medical images, lab results (Supabase Storage)

**Dependencies:** Phase 2 (needs patients & appointments)
**Validates:** Doctor can complete visit, generate prescription

### Phase 4: Specialized Features (Week 7)
11. **Pregnancy Tracking** - Prenatal visits, ultrasounds, timelines
12. **Notifications** - Email reminders, appointment confirmations

**Dependencies:** Phase 3 (builds on medical records)
**Validates:** Track pregnancies, automated reminders work

### Phase 5: Polish & Analytics (Week 8)
13. **Dashboard Analytics** - Statistics, charts for doctor
14. **Audit Logging** - Track all changes to sensitive data
15. **Search & Filters** - Find patients, filter appointments

**Dependencies:** All previous phases
**Validates:** Full system operational, production-ready

## Key Architectural Decisions

### 1. Why Next.js App Router?
- **Server Components:** Fetch data directly in components (no API routes needed)
- **Server Actions:** Type-safe mutations without REST/GraphQL boilerplate
- **Streaming:** Progressive loading for better UX
- **i18n:** Native support for Arabic/English routing

### 2. Why Supabase over custom backend?
- **RLS:** Database-level security (cannot be bypassed)
- **Realtime:** Built-in WebSocket subscriptions
- **Storage:** File uploads with CDN
- **Auth:** OAuth, magic links, social providers
- **Edge Functions:** Serverless background jobs
- **Type Generation:** Auto-generate TypeScript types from schema

### 3. Why avoid API routes?
- **Server Actions** provide type-safe mutations
- **Server Components** fetch data directly from database
- **Less boilerplate:** No need for REST/GraphQL layer
- **Better performance:** Fewer network roundtrips
- **Exception:** Webhooks (external services) still use API routes

### 4. Why optimistic updates with Realtime?
- **Instant feedback:** UI updates before server confirms
- **Collaborative:** Multiple users see changes immediately
- **Conflict resolution:** Realtime broadcast overwrites optimistic state if conflict
- **Better UX:** Feels native, not web-like

### 5. Database schema design philosophy
- **Normalization:** Separate tables for concerns (patients, medical_records, prescriptions)
- **Audit trail:** created_at, updated_at, audit_logs table
- **Soft deletes:** For sensitive medical data (add deleted_at column if needed)
- **JSONB for flexibility:** vital_signs, medications (semi-structured data)
- **Constraints:** Database enforces business rules (no_overlap for appointments)

## Security Layers

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Next.js Middleware                         │
│ - Check authentication status                       │
│ - Redirect unauthenticated users                    │
│ - Route protection (role-based)                     │
└─────────────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│ Layer 2: Server Components / Server Actions        │
│ - Validate inputs (Zod schemas)                     │
│ - Business logic checks                             │
│ - Rate limiting (if needed)                         │
└─────────────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│ Layer 3: Supabase RLS (Row Level Security)         │
│ - Enforce data access at database level            │
│ - Cannot be bypassed by application bugs           │
│ - Granular per-table, per-operation policies       │
└─────────────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│ Layer 4: Database Constraints                       │
│ - Foreign keys, unique constraints                  │
│ - Check constraints (valid enum values)             │
│ - Exclusion constraints (no overlapping appts)      │
└─────────────────────────────────────────────────────┘
```

## Testing Strategy

| Layer | Testing Approach | Tools |
|-------|-----------------|-------|
| **Database** | Migration tests, RLS policy tests | Supabase CLI, pgTAP |
| **Server Actions** | Unit tests with mock Supabase client | Vitest, MSW |
| **Components** | Component tests (isolated) | React Testing Library |
| **Integration** | E2E tests (user flows) | Playwright |
| **Performance** | Lighthouse CI, load testing | Lighthouse, k6 |

---
*Architecture research for: OB/GYN Clinic Management System*
*Researched: 2026-02-06*
*Tech Stack: Next.js 14+ (App Router), Supabase (PostgreSQL + Auth + Storage + Realtime), TypeScript*