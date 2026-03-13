# Phase 4: Medical Records & Prescriptions - Research

**Researched:** 2026-02-11
**Domain:** Medical records (visit notes), prescriptions (printable), file uploads (Supabase Storage), patient profiles, patient search
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Visit record structure
- Notes only: single free-text area for doctor to write clinical notes -- maximum flexibility, no structured fields
- Visit optionally links to an appointment (supports walk-ins and phone consultations)
- Both doctor and secretary can create visit records
- Visit records are always editable (no time lock)

#### Prescription print layout
- Paper size: A4 (full page)
- Header includes clinic logo (if available), clinic name, doctor name, specialty, phone, address
- Patient info on prescription: patient name + prescription date only (no age)
- Medications displayed as a structured table: medication name | dosage | duration | instructions
- Arabic RTL formatting for print

#### File management
- Files displayed as a file list (name, upload date, type) -- not gallery view
- Files are linked to a specific visit (not patient-level uploads)
- No file categories/labels -- filename and date are sufficient
- Both doctor and secretary can delete uploaded files

#### Patient search and list
- Patient list displayed as cards (not table)
- Patient profile page uses tabs: info | visits | prescriptions | files
- Both doctor and secretary can edit patient personal information after account creation
- Default sort: alphabetical by patient name
- Search by name, phone number, or date

### Claude's Discretion
- Search implementation details (debounce, server-side vs client-side)
- Patient card information density and layout
- File upload UI interaction pattern
- Visit record form layout
- Prescription print CSS / print media query approach
- Empty state messages and illustrations
- Pagination or infinite scroll for patient list

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Summary

This phase implements the core clinical workflow: visit records, prescriptions, file uploads, patient profiles, and patient search. The existing database schema (medical_records, prescriptions, patient_files tables) provides the foundation, but there are critical RLS policy mismatches that need migration updates before building the UI.

The main technical challenges are: (1) a schema migration to align RLS policies with user decisions (secretary needs access to medical records; secretary needs DELETE on files; patient_files needs a medical_record_id column for visit-linked uploads), (2) Supabase Storage integration for file uploads with proper bucket RLS policies, (3) CSS print media queries for Arabic RTL A4 prescription printing, and (4) server-side patient search with URL-based search params and debouncing.

The project's established patterns (server actions with Zod validation, Server Components with Supabase queries, shadcn/ui components, react-hook-form) apply directly. All needed shadcn components are already installed. The only new dependency is `use-debounce` for the search input.

**Primary recommendation:** Start with a database migration to fix RLS policies and add `medical_record_id` to `patient_files`, then build server actions (visits, prescriptions, files, patient search), then build the UI layer (patient list/search, patient profile tabs, visit form, prescription form/print, file upload).

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/ssr | 0.8.0 | Server/browser Supabase clients | Established three-pattern architecture |
| @supabase/supabase-js | 2.95.3 | Supabase client including Storage API | Storage upload/download/signed URLs |
| react-hook-form | 7.71.1 | Visit record and prescription forms | Already used in booking forms |
| zod | 4.3.6 | Server action input validation | Established pattern in accounts.ts, appointments.ts |
| next-intl | 4.8.2 | Bilingual labels (Arabic/English) | Already configured project-wide |
| lucide-react | 0.563.0 | Icons (FileText, Upload, Printer, Search, etc.) | Already installed, tree-shakeable |
| date-fns | 4.1.0 | Date formatting for visit dates, file dates | Already installed |

### Supporting (New Dependency)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| use-debounce | latest | Debounce search input to avoid excessive server requests | Patient search input component |

### shadcn/ui Components (Already Installed)
| Component | Purpose in This Phase |
|-----------|----------------------|
| Card | Patient list cards, visit record display |
| Tabs | Patient profile tabs (info, visits, prescriptions, files) |
| Table | Prescription medications table, file list table |
| Dialog | Delete confirmation dialogs |
| Input | Search input, patient info fields |
| Textarea | Visit clinical notes (free-text area) |
| Button | Form actions, print button |
| Label | Form field labels |
| Select | Appointment linking (optional) |
| Badge | File type badges (image/pdf) |
| Separator | Section dividers in patient profile |
| Alert | Success/error feedback messages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| use-debounce | Custom setTimeout debounce | use-debounce is tiny (1KB), well-tested, used by Next.js official tutorial |
| CSS @media print for prescriptions | react-to-print or react-pdf | CSS print is simpler, no extra dependency, works natively with window.print() |
| URL search params for search state | Client-side useState filtering | URL params enable bookmarkable searches, work with SSR, and follow Next.js best practices |
| Server-side pagination | Client-side infinite scroll | Server-side pagination with URL params is more predictable for a patient list; implement as offset/limit with page param |

**Installation:**
```bash
pnpm add use-debounce
```

## Architecture Patterns

### Recommended Project Structure
```
app/
  [locale]/
    doctor/
      patients/
        page.tsx                  # Patient list with search (shared with secretary)
        [id]/
          page.tsx                # Patient profile with tabs
      medical-records/
        page.tsx                  # Redirect to patients (records are per-patient)
      prescriptions/
        page.tsx                  # Redirect to patients (prescriptions are per-patient)
    secretary/
      patients/
        page.tsx                  # Patient list with search (same UI as doctor)
        [id]/
          page.tsx                # Patient profile with tabs (limited: info + files only)
    patient/
      records/
        page.tsx                  # Patient's own visit history, prescriptions, files
lib/
  actions/
    medical-records.ts            # Server actions: create/update visit record
    prescriptions.ts              # Server actions: create/update/delete prescription
    files.ts                      # Server actions: upload file, delete file
    patients.ts                   # Server actions: search patients, update patient info
  utils/
    search.ts                     # Search query helpers (sanitize, format)
components/
  patients/
    patient-search.tsx            # Search input with debounce (client component)
    patient-card.tsx              # Patient list card
    patient-list.tsx              # Grid of patient cards with pagination
    patient-info-form.tsx         # Edit patient demographics
  medical-records/
    visit-form.tsx                # Create/edit visit record form
    visit-card.tsx                # Visit record display card
    visit-list.tsx                # List of visit records
  prescriptions/
    prescription-form.tsx         # Create prescription (medication table form)
    prescription-card.tsx         # Prescription display card
    prescription-print.tsx        # Printable prescription layout
    prescription-list.tsx         # List of prescriptions
  files/
    file-upload.tsx               # File upload component
    file-list.tsx                 # File list display with delete action
messages/
  ar.json                        # Add patients.*, visits.*, prescriptions.*, files.* namespaces
  en.json                        # Add patients.*, visits.*, prescriptions.*, files.* namespaces
supabase/
  migrations/
    00002_phase4_updates.sql      # RLS policy updates + schema changes
```

### Pattern 1: Server-Side Search with URL Params
**What:** Patient search uses URL search params as source of truth. Client-side input debounces, then updates URL. Server Component reads searchParams and queries Supabase.
**When to use:** Patient list page with search by name, phone, or date.
**Example:**
```typescript
// app/[locale]/doctor/patients/page.tsx (Server Component)
export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string }>
}) {
  const params = await searchParams
  const query = params.query || ''
  const page = Number(params.page) || 1
  const perPage = 12 // cards per page

  const supabase = await createClient()

  // Build search query
  let dbQuery = supabase
    .from('profiles')
    .select(`
      id, full_name_ar, full_name_en, phone, email, created_at,
      patients!inner(date_of_birth, blood_type)
    `, { count: 'exact' })
    .eq('role', 'patient')
    .order('full_name_ar', { ascending: true })
    .range((page - 1) * perPage, page * perPage - 1)

  if (query) {
    // Search by name (Arabic or English) or phone
    dbQuery = dbQuery.or(
      `full_name_ar.ilike.%${query}%,full_name_en.ilike.%${query}%,phone.ilike.%${query}%`
    )
  }

  const { data: patients, count } = await dbQuery
  // ... render patient cards
}
```

```typescript
// components/patients/patient-search.tsx (Client Component)
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function PatientSearch({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams()
  const { replace } = useRouter()
  const pathname = usePathname()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')
    if (term) {
      params.set('query', term)
    } else {
      params.delete('query')
    }
    replace(`${pathname}?${params.toString()}`)
  }, 300)

  return (
    <div className="relative">
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('query')?.toString()}
        className="ps-10"
      />
    </div>
  )
}
```

### Pattern 2: File Upload via Server Action with Supabase Storage
**What:** Files are uploaded through a server action that receives FormData, validates, uploads to Supabase Storage, and inserts a record into patient_files.
**When to use:** When doctor/secretary uploads images or PDFs for a patient visit.
**Important:** Next.js server actions have a 1MB body size limit by default. This MUST be increased in next.config.ts for medical file uploads.
**Example:**
```typescript
// next.config.ts - REQUIRED CHANGE
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow medical images up to 10MB
    },
  },
}

// lib/actions/files.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadFile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const file = formData.get('file') as File
  const patientId = formData.get('patient_id') as string
  const medicalRecordId = formData.get('medical_record_id') as string

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only images (JPEG, PNG, WebP) and PDFs are allowed' }
  }

  // Upload to Supabase Storage
  const filePath = `${patientId}/${medicalRecordId}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('patient-files')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) return { error: uploadError.message }

  // Insert record into patient_files table
  const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'
  const { error: dbError } = await supabase
    .from('patient_files')
    .insert({
      patient_id: patientId,
      medical_record_id: medicalRecordId,
      uploaded_by: user.id,
      file_name: file.name,
      file_type: fileType,
      file_path: filePath,
    })

  if (dbError) {
    // Rollback: delete uploaded file
    await supabase.storage.from('patient-files').remove([filePath])
    return { error: 'Failed to save file record' }
  }

  revalidatePath(`/doctor/patients/${patientId}`)
  return { success: true }
}
```

### Pattern 3: CSS Print Media Queries for Prescription
**What:** Use native CSS `@media print` and `@page` rules for A4 prescription printing with Arabic RTL layout. Triggered via `window.print()`.
**When to use:** Prescription print button clicks.
**Example:**
```typescript
// components/prescriptions/prescription-print.tsx
'use client'

export function PrescriptionPrintButton() {
  return (
    <button onClick={() => window.print()}>
      Print Prescription
    </button>
  )
}
```

```css
/* Print-specific styles (in global CSS or component CSS module) */
@media print {
  /* Hide everything except the prescription */
  body * {
    visibility: hidden;
  }

  .prescription-print,
  .prescription-print * {
    visibility: visible;
  }

  .prescription-print {
    position: absolute;
    inset-inline-start: 0;
    top: 0;
    width: 100%;
  }

  /* Hide non-print elements */
  .no-print {
    display: none !important;
  }

  @page {
    size: A4 portrait;
    margin: 15mm 20mm;
  }
}
```

```typescript
// Prescription print layout component (server or client)
// The prescription content must use dir="rtl" and Arabic font
<div className="prescription-print" dir="rtl" lang="ar">
  {/* Header: clinic logo, doctor name, specialty, phone, address */}
  <div className="flex items-center justify-between border-b pb-4 mb-6">
    <div>
      {clinicLogo && <img src={clinicLogo} alt="" className="h-16" />}
      <h1 className="text-xl font-bold">{clinicName}</h1>
    </div>
    <div className="text-sm text-end">
      <p>{doctorName}</p>
      <p>{specialty}</p>
      <p dir="ltr">{phone}</p>
      <p>{address}</p>
    </div>
  </div>

  {/* Patient info: name + date only */}
  <div className="mb-6">
    <p>Patient: {patientName}</p>
    <p>Date: {prescriptionDate}</p>
  </div>

  {/* Medications table */}
  <table className="w-full border-collapse">
    <thead>
      <tr>
        <th className="border p-2 text-start">Medication</th>
        <th className="border p-2 text-start">Dosage</th>
        <th className="border p-2 text-start">Duration</th>
        <th className="border p-2 text-start">Instructions</th>
      </tr>
    </thead>
    <tbody>
      {medications.map(med => (
        <tr key={med.id}>
          <td className="border p-2">{med.medication_name}</td>
          <td className="border p-2">{med.dosage}</td>
          <td className="border p-2">{med.duration}</td>
          <td className="border p-2">{med.instructions}</td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* Doctor signature area */}
  <div className="mt-12 text-end">
    <p>Doctor's Signature</p>
    <div className="mt-8 border-b w-48 ms-auto" />
  </div>
</div>
```

### Pattern 4: Patient Profile with Tabs (Server Component)
**What:** Patient profile page uses shadcn/ui Tabs with info | visits | prescriptions | files tabs. Data loaded in Server Component, passed as props.
**When to use:** `/doctor/patients/[id]` and `/secretary/patients/[id]` pages.
**Example:**
```typescript
// app/[locale]/doctor/patients/[id]/page.tsx
export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch patient profile + patient details
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, patients(*)')
    .eq('id', id)
    .single()

  // Fetch visit records
  const { data: visits } = await supabase
    .from('medical_records')
    .select('*, prescriptions(*)')
    .eq('patient_id', id)
    .order('visit_date', { ascending: false })

  // Fetch files
  const { data: files } = await supabase
    .from('patient_files')
    .select('*')
    .eq('patient_id', id)
    .order('created_at', { ascending: false })

  return (
    <Tabs defaultValue="info">
      <TabsList>
        <TabsTrigger value="info">Info</TabsTrigger>
        <TabsTrigger value="visits">Visits</TabsTrigger>
        <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
      </TabsList>
      {/* Tab contents */}
    </Tabs>
  )
}
```

### Anti-Patterns to Avoid
- **Client-side file validation only:** Always validate file type and size server-side in the server action. Client-side validation is a UX convenience, not security.
- **Storing files in the database:** Use Supabase Storage for binary files. The database stores metadata only (file_name, file_type, file_path).
- **Building a custom print system:** Use native CSS `@media print` + `window.print()`. Do not use PDF generation libraries unless there is a need to email or download PDFs (not in scope for this phase).
- **Client-side search filtering:** Do not load all patients and filter client-side. Use Supabase `.ilike` for server-side search with URL params.
- **Inline visit record editing without server action:** All data mutations must go through server actions with Zod validation, following the established project pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search debouncing | Custom setTimeout/clearTimeout | `use-debounce` library | Tiny (1KB), handles edge cases, recommended by Next.js tutorial |
| File upload to cloud storage | Custom file server or local disk storage | Supabase Storage | Already in the stack, handles CDN, signed URLs, RLS |
| Print layout engine | PDF generation library (jsPDF, puppeteer) | CSS `@media print` + `@page` | Native, zero dependencies, sufficient for single-page prescription |
| Patient search UI | Custom search dropdown | URL searchParams + debounce + Server Component | SSR-compatible, bookmarkable, established Next.js pattern |
| Form state for multi-medication input | Custom state management | react-hook-form `useFieldArray` | Already installed, handles dynamic array fields natively |
| File type detection | Manual MIME sniffing | `File.type` from browser + server-side validation | Browser File API provides MIME type; validate again server-side |
| Pagination | Custom pagination logic | Supabase `.range()` + URL page param | Supabase handles offset/limit natively |

**Key insight:** The hardest problem in this phase is the print layout for prescriptions -- but CSS `@media print` handles it well for A4 Arabic RTL. The second hardest is file upload security, which Supabase Storage with bucket RLS policies handles. Do not over-engineer either.

## Common Pitfalls

### Pitfall 1: RLS Policy Mismatch -- Secretary Cannot Create Visit Records
**What goes wrong:** The current database schema has `medical_records` with a policy: "Doctor manages all medical records" using `FOR ALL` with `role = 'doctor'`. Secretary has NO access. But the user decided "Both doctor and secretary can create visit records."
**Why it happens:** The initial schema was designed with medical record privacy in mind (secretary shouldn't see clinical notes). The user has now explicitly decided otherwise.
**How to avoid:** Create a new migration (00002) that adds SELECT and INSERT policies for secretary on medical_records. Consider whether secretary should also UPDATE. The user decision says "Both doctor and secretary can create visit records" and "Visit records are always editable" -- this implies both should be able to edit.
**Warning signs:** Secretary gets "permission denied" when trying to create a visit record.

### Pitfall 2: RLS Policy Mismatch -- Secretary Cannot Delete Files
**What goes wrong:** The current `patient_files` DELETE policy only allows doctor. But the user decided "Both doctor and secretary can delete uploaded files."
**Why it happens:** Initial schema was conservative about file deletion.
**How to avoid:** Migration: update or add DELETE policy on `patient_files` to include secretary role.
**Warning signs:** Secretary gets permission error when trying to delete a file.

### Pitfall 3: patient_files Has No medical_record_id Column
**What goes wrong:** The user decided "Files are linked to a specific visit (not patient-level uploads)." But the `patient_files` table only has `patient_id`, not `medical_record_id`. There is no way to link files to specific visits without a schema change.
**Why it happens:** The initial schema designed files at the patient level, not the visit level.
**How to avoid:** Migration: add `medical_record_id UUID REFERENCES medical_records(id)` column to `patient_files`. Make it nullable initially to avoid breaking existing data (if any). The UI should require selecting a visit when uploading, but the column is nullable for flexibility.
**Warning signs:** Files appear under all visits instead of specific visits, or no visit-file relationship exists.

### Pitfall 4: Server Action Body Size Limit for File Uploads
**What goes wrong:** Uploading medical images (X-rays, ultrasound images) larger than 1MB fails with "Body exceeded 1mb limit" error.
**Why it happens:** Next.js server actions have a default 1MB body size limit. Medical images often exceed this.
**How to avoid:** Add `experimental.serverActions.bodySizeLimit: '10mb'` to `next.config.ts`. This is a one-line config change.
**Warning signs:** File upload fails immediately on submission with a generic error.

### Pitfall 5: Missing Supabase Storage Bucket Configuration
**What goes wrong:** File upload fails with "Bucket not found" or RLS policy violation because the storage bucket hasn't been created or configured.
**Why it happens:** Supabase Storage buckets need to be created separately from database tables. They also need their own RLS policies on `storage.objects`.
**How to avoid:** Create a private bucket named `patient-files`. Set up RLS policies: (1) INSERT for doctor/secretary authenticated users, (2) SELECT for doctor/secretary (all files) and patients (own files via folder path matching), (3) DELETE for doctor/secretary.
**Warning signs:** "Bucket not found" or 403 errors on file upload/download.

### Pitfall 6: Print Layout Breaks in RTL
**What goes wrong:** Prescription prints with wrong alignment, phone numbers reversed, or table columns misaligned in Arabic RTL mode.
**Why it happens:** Print stylesheets may not inherit the page's `dir="rtl"` setting, or phone numbers (LTR content) are not wrapped in `dir="ltr"`.
**How to avoid:** (1) Set `dir="rtl"` explicitly on the print container div. (2) Wrap phone numbers in `<span dir="ltr">`. (3) Use logical CSS properties (start/end, ms/me) instead of left/right. (4) Test print preview in the browser before implementation is complete.
**Warning signs:** Numbers displaying backward, text alignment issues in print preview.

### Pitfall 7: Medical Records Schema Has Unused Structured Fields
**What goes wrong:** The database schema has `chief_complaint`, `diagnosis`, `treatment_plan`, `vital_signs` columns on `medical_records`, but the user decided "Notes only: single free-text area." Developers might build form fields for all columns.
**Why it happens:** The schema was designed generically before the user decided on a simpler approach.
**How to avoid:** Only use the `notes` field for clinical notes. The other columns (chief_complaint, diagnosis, treatment_plan, vital_signs) exist in the schema but should NOT have form fields in the UI. They can remain nullable in the database for potential future use. The visit form should only have: (1) visit date picker, (2) optional appointment link, (3) free-text notes area.
**Warning signs:** Overly complex visit form with fields the doctor doesn't want to fill in.

### Pitfall 8: Prescriptions Are Per-Medication, Not Per-Prescription
**What goes wrong:** The database stores one row per medication in the `prescriptions` table (each row has `medication_name`, `dosage`, `duration`, `instructions`). A single prescription with 3 medications creates 3 rows. The UI must handle this correctly -- grouping by `medical_record_id` + `created_at` to show prescriptions as logical groups.
**Why it happens:** The schema normalizes medications as individual rows rather than using a JSONB array.
**How to avoid:** When creating a prescription, insert all medications in a single server action. When displaying, group prescriptions by `medical_record_id` (since each visit has one prescription batch). For printing, query all prescription rows for a given medical_record_id.
**Warning signs:** Each medication showing as a separate "prescription" instead of grouped together.

## Code Examples

### Visit Record Server Action
```typescript
// lib/actions/medical-records.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createVisitSchema = z.object({
  patient_id: z.string().uuid(),
  appointment_id: z.string().uuid().optional(),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
})

export async function createVisitRecord(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify role (doctor or secretary)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can create visit records' }
  }

  const validation = createVisitSchema.safeParse({
    patient_id: formData.get('patient_id'),
    appointment_id: formData.get('appointment_id') || undefined,
    visit_date: formData.get('visit_date'),
    notes: formData.get('notes'),
  })

  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors }
  }

  // Get doctor_id (single-doctor clinic)
  const { data: doctor } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor')
    .single() as { data: { id: string } | null }

  if (!doctor) return { error: 'No doctor found' }

  const { data: record, error } = await supabase
    .from('medical_records')
    .insert({
      patient_id: validation.data.patient_id,
      appointment_id: validation.data.appointment_id ?? null,
      doctor_id: doctor.id,
      visit_date: validation.data.visit_date,
      notes: validation.data.notes ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/doctor/patients/${validation.data.patient_id}`)
  revalidatePath(`/secretary/patients/${validation.data.patient_id}`)
  revalidatePath('/patient/records')

  return { success: true, record }
}
```

### Prescription Creation with Multiple Medications
```typescript
// lib/actions/prescriptions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const medicationSchema = z.object({
  medication_name: z.string().min(1),
  dosage: z.string().min(1),
  duration: z.string().min(1),
  instructions: z.string().optional(),
})

const createPrescriptionSchema = z.object({
  medical_record_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  medications: z.array(medicationSchema).min(1, 'At least one medication required'),
})

export async function createPrescription(data: z.infer<typeof createPrescriptionSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Only doctor can create prescriptions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can create prescriptions' }
  }

  const validation = createPrescriptionSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors }
  }

  const { medical_record_id, patient_id, medications } = validation.data

  // Get doctor_id
  const { data: doctor } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor')
    .single() as { data: { id: string } | null }

  if (!doctor) return { error: 'No doctor found' }

  // Insert all medications as prescription rows
  const prescriptionRows = medications.map(med => ({
    medical_record_id,
    patient_id,
    doctor_id: doctor.id,
    medication_name: med.medication_name,
    dosage: med.dosage,
    duration: med.duration,
    instructions: med.instructions ?? null,
  }))

  const { error } = await supabase
    .from('prescriptions')
    .insert(prescriptionRows)

  if (error) return { error: error.message }

  revalidatePath(`/doctor/patients/${patient_id}`)
  revalidatePath('/patient/records')

  return { success: true }
}
```

### React Hook Form useFieldArray for Dynamic Medications
```typescript
// components/prescriptions/prescription-form.tsx
'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'

const formSchema = z.object({
  medications: z.array(z.object({
    medication_name: z.string().min(1, 'Required'),
    dosage: z.string().min(1, 'Required'),
    duration: z.string().min(1, 'Required'),
    instructions: z.string().optional(),
  })).min(1),
})

type FormValues = z.infer<typeof formSchema>

export function PrescriptionForm({
  medicalRecordId,
  patientId,
  onSubmit,
}: {
  medicalRecordId: string
  patientId: string
  onSubmit: (data: FormValues) => Promise<void>
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medications: [{ medication_name: '', dosage: '', duration: '', instructions: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'medications',
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-start mb-3">
          <Input {...form.register(`medications.${index}.medication_name`)} placeholder="Medication" />
          <Input {...form.register(`medications.${index}.dosage`)} placeholder="Dosage" />
          <Input {...form.register(`medications.${index}.duration`)} placeholder="Duration" />
          <Input {...form.register(`medications.${index}.instructions`)} placeholder="Instructions" />
          {fields.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => append({ medication_name: '', dosage: '', duration: '', instructions: '' })}>
        <Plus className="h-4 w-4 me-2" /> Add Medication
      </Button>
    </form>
  )
}
```

### Supabase Storage Bucket RLS Policies
```sql
-- Migration: 00002_phase4_updates.sql

-- ============================================================
-- 1. Add medical_record_id to patient_files (visit-linked files)
-- ============================================================
ALTER TABLE patient_files
  ADD COLUMN medical_record_id UUID REFERENCES medical_records(id);

CREATE INDEX idx_patient_files_medical_record_id
  ON patient_files(medical_record_id);

-- ============================================================
-- 2. Fix RLS: Secretary can manage medical records
-- ============================================================
-- Add SELECT policy for secretary
CREATE POLICY "Secretary views all medical records"
  ON medical_records FOR SELECT
  TO authenticated
  USING ((SELECT get_user_role()) = 'secretary');

-- Add INSERT policy for secretary
CREATE POLICY "Secretary creates medical records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT get_user_role()) = 'secretary');

-- Add UPDATE policy for secretary
CREATE POLICY "Secretary updates medical records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING ((SELECT get_user_role()) = 'secretary');

-- ============================================================
-- 3. Fix RLS: Secretary can delete files
-- ============================================================
-- Drop existing doctor-only delete policy
DROP POLICY "Doctor deletes files" ON patient_files;

-- Create new policy allowing both doctor and secretary
CREATE POLICY "Doctor and secretary delete files"
  ON patient_files FOR DELETE
  TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor', 'secretary'));

-- ============================================================
-- 4. Supabase Storage bucket policies
-- ============================================================
-- NOTE: Storage bucket creation is done via Supabase Dashboard or API.
-- Create a private bucket named 'patient-files' via the dashboard.
--
-- Storage RLS policies on storage.objects:
--
-- INSERT: Doctor and secretary can upload
-- CREATE POLICY "Doctor and secretary upload patient files"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'patient-files'
--     AND (SELECT get_user_role()) IN ('doctor', 'secretary')
--   );
--
-- SELECT: Doctor and secretary see all; patient sees own folder
-- CREATE POLICY "Doctor and secretary view all patient files"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (
--     bucket_id = 'patient-files'
--     AND (SELECT get_user_role()) IN ('doctor', 'secretary')
--   );
--
-- CREATE POLICY "Patient views own files"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (
--     bucket_id = 'patient-files'
--     AND (storage.foldername(name))[1] = (select auth.uid()::text)
--   );
--
-- DELETE: Doctor and secretary can delete
-- CREATE POLICY "Doctor and secretary delete patient files"
--   ON storage.objects FOR DELETE
--   TO authenticated
--   USING (
--     bucket_id = 'patient-files'
--     AND (SELECT get_user_role()) IN ('doctor', 'secretary')
--   );
```

### File Download with Signed URLs
```typescript
// lib/actions/files.ts (additional helper)
export async function getFileUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from('patient-files')
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error) return null
  return data.signedUrl
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API routes for file upload | Server actions with bodySizeLimit config | Next.js 14-15 | Server actions work for files up to configured limit |
| Client-side patient filtering | Server-side search with URL params | Next.js 14+ App Router pattern | SSR-compatible, bookmarkable, no full data load |
| PDF generation for prescriptions | CSS @media print + @page | Ongoing best practice | Zero dependencies, native browser support |
| Custom debounce hooks | `use-debounce` library | Widely adopted | Well-tested, tiny, recommended in official Next.js tutorial |
| Local file storage | Supabase Storage with bucket RLS | Supabase built-in | CDN, signed URLs, RLS policies, integrated with auth |

**Deprecated/outdated:**
- **react-to-print:** Not needed when CSS @media print suffices. Only needed for complex multi-page PDF scenarios.
- **Manual fetch to API routes for uploads:** Server actions can handle file uploads directly with proper bodySizeLimit config. No API route needed unless files exceed 10MB regularly.

## Open Questions

1. **Supabase Storage Bucket Creation Method**
   - What we know: Buckets can be created via Dashboard, API, or SQL migration
   - What's unclear: Whether this project uses Supabase CLI migrations for storage or manual Dashboard setup
   - Recommendation: Document bucket creation as a manual step in the plan (Dashboard: create private bucket "patient-files"). Include the storage.objects RLS policies in the SQL migration file.

2. **Secretary Access to Medical Records -- Scope of Access**
   - What we know: User decided "Both doctor and secretary can create visit records." Current RLS blocks secretary entirely.
   - What's unclear: Should secretary be able to see/edit ALL visit data including clinical notes? The original schema note says "Secretary has NO access to medical records" suggesting this was an intentional privacy design.
   - Recommendation: Honor the user's explicit decision. Add SELECT + INSERT + UPDATE for secretary. The user has chosen maximum flexibility over privacy restrictions.

3. **Clinic Logo Storage**
   - What we know: Prescription header includes "clinic logo (if available)." The logo needs to be stored somewhere accessible.
   - What's unclear: Where is the clinic logo stored? Is it a static asset in the project, or should it be configurable?
   - Recommendation: For v1, use a static logo image in the `public/` directory (e.g., `public/clinic-logo.png`). If the logo needs to be configurable, that can be a future enhancement.

4. **Patient Records Patient Portal Path**
   - What we know: Patient layout already has nav item pointing to `/patient/records`. This phase needs to build that page.
   - What's unclear: Should patient records show visits + prescriptions + files all on one page, or use tabs like the doctor view?
   - Recommendation: Since the patient only sees their own data, a single-page chronological view (visit cards with embedded prescriptions and files) is simpler than tabs. But the planner can decide based on complexity.

## Sources

### Primary (HIGH confidence)
- Project SQL migration: `supabase/migrations/00001_initial_schema.sql` - Verified schema, RLS policies, indexes
- Project `lib/types/database.ts` - Verified TypeScript types match schema
- Project `lib/actions/appointments.ts` - Established server action pattern
- Project `lib/actions/accounts.ts` - Established Zod validation + admin client pattern
- Project `package.json` - Verified installed library versions
- [Supabase Storage Quickstart](https://supabase.com/docs/guides/storage/quickstart) - Bucket creation, upload API
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) - RLS policies on storage.objects
- [Supabase Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions) - storage.foldername(), storage.filename(), storage.extension()
- [Supabase Storage Downloads](https://supabase.com/docs/guides/storage/serving/downloads) - createSignedUrl, getPublicUrl
- [Next.js Server Actions bodySizeLimit](https://nextjs.org/docs/app/api-reference/next-config-js/serverActions) - 1MB default, configurable via next.config
- [Next.js Adding Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - URL searchParams + debounce pattern
- [MDN CSS Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing) - @media print, @page rules

### Secondary (MEDIUM confidence)
- [Next.js Server Action file upload discussions](https://github.com/vercel/next.js/discussions/57973) - Body size limit workarounds
- [CSS Print Media Queries Guide](https://codelucky.com/css-print-media-queries/) - @page A4, print-specific styling
- [RTL Styling Guide](https://rtlstyling.com/posts/rtl-styling/) - Arabic RTL layout best practices

### Tertiary (LOW confidence)
- [Signed URL file uploads with Next.js and Supabase](https://medium.com/@olliedoesdev/signed-url-file-uploads-with-nextjs-and-supabase-74ba91b65fe0) - Alternative upload pattern (not needed given bodySizeLimit approach)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed except use-debounce; versions verified
- Architecture: HIGH - Follows established project patterns exactly
- Database schema: HIGH - Verified from actual SQL migration; RLS mismatches identified
- File upload: HIGH - Supabase Storage docs verified, server action bodySizeLimit verified from Next.js docs
- Print layout: MEDIUM - CSS @media print is standard, but Arabic RTL print specifics need testing
- Search pattern: HIGH - Follows official Next.js tutorial pattern exactly
- Pitfalls: HIGH - RLS mismatches verified by reading actual SQL policies vs user decisions

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days - stable technologies, known schema)
