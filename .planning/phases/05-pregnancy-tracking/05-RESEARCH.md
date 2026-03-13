# Phase 5: Pregnancy Tracking - Research

**Researched:** 2026-02-15
**Domain:** Pregnancy tracking, gestational age calculations, measurement recording, dashboard alerts
**Confidence:** HIGH

## Summary

Phase 5 adds pregnancy tracking as a doctor-only clinical feature on top of the already-existing database schema (`pregnancies` and `pregnancy_measurements` tables, RLS policies, and TypeScript types from Phase 1). No schema migration is required — the database is fully ready. The work is purely application layer: server actions, UI components, page routes, and i18n translations.

The core technical challenges are: (1) gestational age calculation (pure JavaScript arithmetic from LMP date — no library needed), (2) integrating pregnancy management into the existing doctor patient profile page (add a "Pregnancy" tab alongside the existing info/visits/prescriptions/files tabs), (3) building a patient-facing pregnancy timeline page as a new read-only portal page, and (4) building dashboard alerts for patients approaching their due date.

The project's established patterns apply completely: server actions with Zod validation, Server Components with inline Supabase queries, Client Components only for interactive forms, react-hook-form for complex forms, FormData for simple forms, shadcn/ui components, and next-intl for bilingual Arabic/English strings.

**Primary recommendation:** Build in this order: (1) server actions for pregnancies + measurements, (2) pregnancy components (pregnancy form, measurement form, pregnancy card, timeline), (3) integrate pregnancy tab into doctor's patient profile page, (4) patient portal pregnancy timeline page, (5) dashboard due-date alerts, (6) i18n translations and nav link additions.

---

## Critical Schema Facts (Verified Against Actual Migration File)

These facts differ from what the additional_context stated. Use these authoritative values.

### Authoritative SQL (from `supabase/migrations/00001_initial_schema.sql`)

```sql
CREATE TABLE pregnancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  lmp_date DATE NOT NULL,
  expected_due_date DATE GENERATED ALWAYS AS (lmp_date + INTERVAL '280 days') STORED,
  status TEXT NOT NULL CHECK (status IN ('active', 'delivered', 'miscarriage', 'ectopic')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pregnancy_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregnancy_id UUID NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  gestational_week INT,
  weight_kg DECIMAL(5,2),
  blood_pressure TEXT,           -- single TEXT column, NOT separate systolic/diastolic
  fetal_heartbeat INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**IMPORTANT DISCREPANCIES vs. the phase requirements description:**
- `status` values are `'active' | 'delivered' | 'miscarriage' | 'ectopic'` — NOT `'active' | 'completed' | 'miscarriage' | 'terminated'`
- `blood_pressure` is a single `TEXT` column — NOT separate `blood_pressure_systolic INT` and `blood_pressure_diastolic INT`
- TypeScript types in `lib/types/database.ts` already correctly mirror the SQL (they have `blood_pressure: string | null`)

### TypeScript Types (already defined in `lib/types/database.ts`)

```typescript
export type PregnancyStatus = 'active' | 'delivered' | 'miscarriage' | 'ectopic'

// Pregnancy Row (what SELECT returns)
{
  id: string
  patient_id: string
  doctor_id: string
  lmp_date: string           // DATE as string
  expected_due_date: string  // GENERATED column, always present in Row
  status: PregnancyStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// Pregnancy Insert (expected_due_date is optional — it's generated)
{
  id?: string
  patient_id: string
  doctor_id: string
  lmp_date: string
  expected_due_date?: string  // optional because it's GENERATED ALWAYS
  status?: PregnancyStatus
  notes?: string | null
  ...
}

// PregnancyMeasurement Row
{
  id: string
  pregnancy_id: string
  measured_at: string
  gestational_week: number | null
  weight_kg: number | null
  blood_pressure: string | null   // TEXT, e.g. "120/80"
  fetal_heartbeat: number | null
  notes: string | null
  created_at: string
}
```

### RLS Policies (already in place, no migration needed)

```
pregnancies:
  - "Patients view own pregnancies": patient_id = auth.uid() — SELECT only
  - "Doctor manages all pregnancies": role = 'doctor' — ALL (full CRUD)
  - Secretary has NO access — any action from secretary returns empty set / permission denied

pregnancy_measurements:
  - "Patients view own pregnancy measurements":
      patient_id from parent pregnancies row = auth.uid() — SELECT only
  - "Doctor manages all pregnancy measurements": role = 'doctor' — ALL
```

---

## Standard Stack

No new dependencies needed. All libraries are already installed.

### Core (already installed)
| Library | Purpose | Notes |
|---------|---------|-------|
| Next.js 15 App Router | Pages and Server Components | Already in use |
| Supabase JS client | Database queries | `@/lib/supabase/server` pattern |
| TypeScript | Types | `Pregnancy` and `PregnancyMeasurement` already defined |
| shadcn/ui | UI components | All needed components already installed |
| react-hook-form + zod | Forms with validation | Use for pregnancy form (multi-field) |
| next-intl | Bilingual strings | Add `pregnancy` namespace to ar.json and en.json |
| date-fns | Date formatting | Already installed (used in records page) |

### No New Dependencies Required

All needed components (Card, Badge, Dialog, Select, Input, Textarea, Alert, Button, Tabs, Separator) are already installed in `components/ui/`.

---

## Architecture Patterns

### Pattern: Doctor-only tab on patient profile page

Pregnancy tracking integrates into the existing `app/[locale]/doctor/patients/[id]/page.tsx` as an additional tab. This page already has 4 tabs (info, visits, prescriptions, files). Add a 5th tab "pregnancy" using the same `<Tabs>` structure.

```typescript
// In doctor/patients/[id]/page.tsx — add pregnancy data fetch
const { data: pregnancyData } = await supabase
  .from('pregnancies')
  .select('*, pregnancy_measurements(*)')
  .eq('patient_id', id)
  .order('created_at', { ascending: false })

// Add tab trigger
<TabsTrigger value="pregnancy">{t('profile.tabs.pregnancy')}</TabsTrigger>

// Add tab content
<TabsContent value="pregnancy" className="mt-6">
  <PregnancyList
    pregnancies={pregnancies}
    patientId={id}
  />
</TabsContent>
```

### Pattern: Gestational age calculation (pure JS, no library)

Gestational age in weeks = days since LMP / 7. Since `expected_due_date` is stored in the DB, the remaining calculation is simple arithmetic:

```typescript
// Calculate current gestational week from LMP date
function getGestationalWeek(lmpDate: string): number {
  const lmp = new Date(lmpDate)
  const today = new Date()
  const daysDiff = Math.floor((today.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24))
  return Math.floor(daysDiff / 7)
}

// Calculate days until due date (for dashboard alert)
function getDaysUntilDue(expectedDueDate: string): number {
  const due = new Date(expectedDueDate)
  const today = new Date()
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Alert threshold: within 14 days
const isApproachingDueDate = getDaysUntilDue(pregnancy.expected_due_date) <= 14
  && getDaysUntilDue(pregnancy.expected_due_date) >= 0
  && pregnancy.status === 'active'
```

**IMPORTANT:** Gestational week in `pregnancy_measurements.gestational_week` is doctor-entered, not auto-calculated. The auto-calculation above is for display only (current week on timeline). The measurement form lets the doctor manually enter what gestational week the measurement was taken at (e.g., "Week 20 anatomy scan").

### Pattern: Server actions for pregnancies

Follow the exact same pattern as `lib/actions/medical-records.ts`:

```typescript
// lib/actions/pregnancies.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Role check: only doctor can manage pregnancies
// Role check in getDoctorId helper
// Zod schema for validation
// Insert with expected_due_date omitted (it's GENERATED)
// revalidatePath for doctor patient profile page

const createPregnancySchema = z.object({
  patient_id: z.string().uuid(),
  lmp_date: z.string().min(1, 'LMP date is required'),
  notes: z.string().optional(),
  // status defaults to 'active' — not in create form
})
```

### Pattern: Blood pressure as text

`blood_pressure` is stored as TEXT. Accept string input like "120/80" in the form. No need to split into two fields or validate the format strictly — this is a clinical tool and the doctor knows the format.

```typescript
// In measurement form
<Input
  name="blood_pressure"
  placeholder="120/80"
  // Just a text input — no special parsing
/>
```

### Pattern: Patient pregnancy timeline page

New page at `app/[locale]/patient/pregnancy/page.tsx` (Server Component). Follows the same pattern as `app/[locale]/patient/records/page.tsx` — fetch data server-side, render read-only cards. Add nav link "My Pregnancy" to patient layout nav.

```typescript
// Patient sees only ACTIVE pregnancies (most recent first)
// Patient can see: current gestational week, due date, measurement history
// Patient CANNOT see: doctor notes on the pregnancy itself (clinical context)
// Clarification needed: whether patient sees pregnancy notes field
```

### Pattern: Dashboard alert for approaching due dates

The doctor dashboard (`app/[locale]/doctor/dashboard/page.tsx`) currently shows a placeholder. Phase 5 adds real content: a list of patients with active pregnancies due within 14 days.

```typescript
// In doctor dashboard page.tsx
const twoWeeksFromNow = new Date()
twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)
const today = new Date().toISOString().split('T')[0]
const twoWeeksStr = twoWeeksFromNow.toISOString().split('T')[0]

const { data: upcomingDue } = await supabase
  .from('pregnancies')
  .select('*, patient:profiles!pregnancies_patient_id_fkey(full_name_ar, full_name_en)')
  .eq('status', 'active')
  .gte('expected_due_date', today)
  .lte('expected_due_date', twoWeeksStr)
  .order('expected_due_date', { ascending: true })
```

### Recommended Component Structure

```
components/pregnancy/
├── pregnancy-list.tsx          # List of pregnancies for a patient (doctor view)
├── pregnancy-card.tsx          # Single pregnancy with measurements (collapsible)
├── pregnancy-form.tsx          # Create/edit pregnancy (react-hook-form)
├── measurement-form.tsx        # Add measurement (react-hook-form)
├── measurement-list.tsx        # Read-only list of measurements per pregnancy
├── pregnancy-timeline.tsx      # Patient-facing timeline (read-only)
└── due-date-alert.tsx          # Dashboard alert card

app/[locale]/patient/pregnancy/
└── page.tsx                    # Patient pregnancy timeline page

app/[locale]/doctor/patients/[id]/
└── page.tsx                    # MODIFIED: add pregnancy tab
```

### Anti-Patterns to Avoid

- **Do NOT auto-calculate gestational_week when saving a measurement.** The field is doctor-entered (they know what week the scan was at). The calculated current week is display-only.
- **Do NOT include expected_due_date in INSERT.** It is `GENERATED ALWAYS` in SQL — Supabase will error if you try to insert it. The TypeScript Insert type marks it `optional` but inserting it causes a PostgreSQL error.
- **Do NOT allow secretary to create/edit pregnancies.** RLS blocks it at DB level, but also enforce at action level (role check = 'doctor' only, same pattern as other doctor-only features).
- **Do NOT assume multiple active pregnancies per patient is an error.** The requirements say "handle edge cases (multiple pregnancies per patient)." A patient can have multiple pregnancies in the system (different LMP dates). Display all of them, most recent first. The doctor sets status to 'delivered'/'miscarriage'/'ectopic' to close a pregnancy.
- **Do NOT use a separate page for pregnancy management.** Integrate into the existing patient profile tabs for doctor flow. Only patients get a dedicated `/patient/pregnancy` page.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic | Custom date library | Native JS Date + arithmetic | Gestational week = days/7 is trivial; date-fns for formatting only |
| Form validation | Custom validation | Zod + react-hook-form | Already established pattern in PrescriptionForm |
| UI components | Custom inputs | shadcn/ui Input, Select, Card, Badge | All already installed |
| Role enforcement | Custom middleware | Supabase RLS + action-level role check | Already established in all other actions |

---

## Common Pitfalls

### Pitfall 1: Inserting expected_due_date
**What goes wrong:** Server action sends `expected_due_date` in the INSERT payload, Supabase returns error "cannot insert into a generated column."
**Why it happens:** The TypeScript Insert type marks it `optional`, not impossible, so it compiles fine.
**How to avoid:** Omit `expected_due_date` from all INSERT and UPDATE operations. It is calculated by PostgreSQL automatically.
**Warning signs:** `error: column "expected_due_date" is a generated column`

### Pitfall 2: PregnancyStatus mismatch
**What goes wrong:** Code uses `'completed'` or `'terminated'` as status values, which fail the DB CHECK constraint.
**Why it happens:** The requirements description listed wrong status values (`'active', 'completed', 'miscarriage', 'terminated'`).
**How to avoid:** Use only `'active' | 'delivered' | 'miscarriage' | 'ectopic'` — verified from actual SQL migration. The TypeScript `PregnancyStatus` type is correct.
**Warning signs:** `error: new row for relation "pregnancies" violates check constraint`

### Pitfall 3: Secretary access assumption
**What goes wrong:** Secretary navigates to a patient profile and sees an empty pregnancy tab with no error, or an error message, because the RLS policy returns 0 rows (not an error).
**Why it happens:** Supabase RLS silently returns empty results when policy denies access.
**How to avoid:** The pregnancy tab should only appear in the doctor's patient profile page (under `app/[locale]/doctor/`), not the secretary's profile page (`app/[locale]/secretary/[id]/`). Secretary has no pregnancy tab at all. If a secretary somehow hits the endpoint directly, the server action role check prevents writes.

### Pitfall 4: Nav link for patient pregnancy page
**What goes wrong:** Patient portal has no link to `/patient/pregnancy` page, making it inaccessible.
**Why it happens:** The patient layout nav is hardcoded in `app/[locale]/patient/layout.tsx`.
**How to avoid:** Add nav link for pregnancy page to patient layout nav items, and add i18n key `nav.myPregnancy`. Only add the link — don't restructure the layout.

### Pitfall 5: Gestational week calculation edge cases
**What goes wrong:** Calculated gestational week is negative (LMP date in future) or > 42 (pregnancy ended), showing nonsense values.
**Why it happens:** Simple arithmetic on dates without bounds checks.
**How to avoid:** Cap display between 0-42 weeks, or show "N/A" for ended/past pregnancies. For the patient timeline, only show gestational week for `status === 'active'` pregnancies.

### Pitfall 6: Multiple active pregnancies per patient
**What goes wrong:** Dashboard alert shows duplicate patient names if they have 2 active pregnancies.
**Why it happens:** Query returns one row per pregnancy, not per patient.
**How to avoid:** In the dashboard alert, de-duplicate by patient (group by `patient_id`, show earliest due date).

---

## Code Examples

### Create pregnancy server action

```typescript
// lib/actions/pregnancies.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

async function getDoctorId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor')
    .single() as { data: { id: string } | null }
  return data?.id ?? null
}

const createPregnancySchema = z.object({
  patient_id: z.string().uuid(),
  lmp_date: z.string().min(1, 'LMP date is required'),
  notes: z.string().optional(),
})

export async function createPregnancy(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Doctor-only: role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (profile?.role !== 'doctor') {
    return { error: 'Only doctor can manage pregnancies' }
  }

  const raw = {
    patient_id: formData.get('patient_id') as string,
    lmp_date: formData.get('lmp_date') as string,
    notes: (formData.get('notes') as string) || undefined,
  }

  const validation = createPregnancySchema.safeParse(raw)
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors as unknown as string }
  }

  const doctorId = await getDoctorId(supabase)
  if (!doctorId) return { error: 'No doctor found in the system' }

  // NOTE: Do NOT include expected_due_date — it is GENERATED ALWAYS
  const { error: insertError } = await supabase
    .from('pregnancies')
    .insert({
      patient_id: validation.data.patient_id,
      doctor_id: doctorId,
      lmp_date: validation.data.lmp_date,
      notes: validation.data.notes ?? null,
      // status defaults to 'active' in DB
    })

  if (insertError) return { error: insertError.message }

  revalidatePath(`/doctor/patients/${validation.data.patient_id}`)
  return { success: true }
}
```

### Add measurement server action

```typescript
const addMeasurementSchema = z.object({
  pregnancy_id: z.string().uuid(),
  measured_at: z.string().min(1),
  gestational_week: z.coerce.number().int().min(1).max(42).optional(),
  weight_kg: z.coerce.number().positive().optional(),
  blood_pressure: z.string().optional(),   // e.g. "120/80"
  fetal_heartbeat: z.coerce.number().int().min(60).max(200).optional(),
  notes: z.string().optional(),
})

export async function addMeasurement(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  // ... same role check pattern ...
  // Insert into pregnancy_measurements
  // revalidatePath for the patient profile page
}
```

### Gestational age display utility

```typescript
// lib/utils/pregnancy.ts

/**
 * Calculate current gestational week from LMP date.
 * Returns null if pregnancy is not active or LMP is in the future.
 */
export function getGestationalWeek(lmpDate: string): number | null {
  const lmp = new Date(lmpDate)
  const today = new Date()
  const daysDiff = Math.floor((today.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24))
  const week = Math.floor(daysDiff / 7)
  if (week < 0 || week > 42) return null
  return week
}

/**
 * Calculate days until due date.
 * Returns negative number if overdue.
 */
export function getDaysUntilDue(expectedDueDateStr: string): number {
  const due = new Date(expectedDueDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Whether a pregnancy should trigger a dashboard alert.
 * Alert condition: active + due within 14 days (not yet overdue).
 */
export function isApproachingDueDate(pregnancy: { status: string; expected_due_date: string }): boolean {
  if (pregnancy.status !== 'active') return false
  const daysUntil = getDaysUntilDue(pregnancy.expected_due_date)
  return daysUntil >= 0 && daysUntil <= 14
}
```

### Dashboard due-date alert query

```typescript
// In app/[locale]/doctor/dashboard/page.tsx
// Fetch active pregnancies due within 14 days

const today = new Date()
today.setHours(0, 0, 0, 0)
const twoWeeksFromNow = new Date(today)
twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

const { data: approachingDue } = await supabase
  .from('pregnancies')
  .select(`
    id,
    patient_id,
    expected_due_date,
    lmp_date,
    patient:profiles!pregnancies_patient_id_fkey(full_name_ar, full_name_en)
  `)
  .eq('status', 'active')
  .gte('expected_due_date', today.toISOString().split('T')[0])
  .lte('expected_due_date', twoWeeksFromNow.toISOString().split('T')[0])
  .order('expected_due_date', { ascending: true })
```

### i18n translation namespace structure

```json
// messages/ar.json — add "pregnancy" namespace
"pregnancy": {
  "title": "متابعة الحمل",
  "addPregnancy": "إضافة حمل جديد",
  "editPregnancy": "تعديل بيانات الحمل",
  "noPregnancies": "لا توجد سجلات حمل لهذه المريضة",
  "form": {
    "lmpDate": "تاريخ آخر دورة شهرية (LMP)",
    "expectedDueDate": "تاريخ الولادة المتوقع",
    "gestationalWeek": "الأسبوع الحالي",
    "status": "حالة الحمل",
    "notes": "ملاحظات"
  },
  "status": {
    "active": "نشط",
    "delivered": "ولادة",
    "miscarriage": "إجهاض",
    "ectopic": "حمل خارج الرحم"
  },
  "measurements": {
    "title": "قياسات الزيارات",
    "add": "إضافة قياسات",
    "measuredAt": "تاريخ القياس",
    "gestationalWeek": "الأسبوع",
    "weightKg": "الوزن (كغ)",
    "bloodPressure": "ضغط الدم",
    "bloodPressurePlaceholder": "120/80",
    "fetalHeartbeat": "نبض القلب الجنيني (bpm)",
    "notes": "ملاحظات",
    "empty": "لا توجد قياسات مسجلة"
  },
  "timeline": {
    "title": "متابعة الحمل",
    "currentWeek": "الأسبوع الحالي",
    "dueDate": "موعد الولادة المتوقع",
    "lmpDate": "تاريخ آخر دورة",
    "weeksLabel": "أسبوع",
    "daysUntilDue": "يوم حتى الولادة",
    "noActivePregnancy": "لا يوجد حمل نشط حالياً",
    "measurementHistory": "سجل القياسات"
  },
  "dashboard": {
    "alertTitle": "مواعيد ولادة قريبة",
    "daysRemaining": "يوم متبقٍ",
    "today": "اليوم",
    "overdue": "تجاوزت الموعد"
  },
  "actions": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "updateStatus": "تحديث الحالة",
    "delete": "حذف"
  }
}
```

---

## Integration Points

### Doctor patient profile page (`app/[locale]/doctor/patients/[id]/page.tsx`)

Currently has 4 tabs: `grid-cols-4`. Adding pregnancy tab requires:
1. Change `grid-cols-4` to `grid-cols-5`
2. Add pregnancy data fetch alongside existing queries
3. Add `TabsTrigger` and `TabsContent` for pregnancy
4. Import `PregnancyList` component

### Patient layout nav (`app/[locale]/patient/layout.tsx`)

Add one nav item:
```typescript
{ href: '/patient/pregnancy', label: t('myPregnancy') }
```
Add `nav.myPregnancy` key to both ar.json and en.json.

### Doctor dashboard (`app/[locale]/doctor/dashboard/page.tsx`)

Currently shows only "placeholder" text. Replace with real content:
- Due-date alerts section (from pregnancies query)
- Potentially today's appointment count (existing appointments table)

---

## Open Questions

1. **Should patient see the pregnancy `notes` field?**
   - What we know: `notes TEXT` exists on the `pregnancies` table. Doctor may write clinical context there.
   - What's unclear: Is this field appropriate for patient viewing? It may contain sensitive clinical notes.
   - Recommendation: Default to NOT showing pregnancy notes to patient on the timeline (only show measurements, gestational week, due date). If needed, can be added later.

2. **Can the doctor delete a pregnancy record entirely?**
   - What we know: RLS allows it. Requirements don't mention delete.
   - What's unclear: Is this needed, or is changing status to miscarriage/ectopic sufficient?
   - Recommendation: Implement status update (active -> delivered/miscarriage/ectopic) instead of delete. Avoid data loss.

3. **Does the secretary see a pregnancy tab on patient profiles?**
   - What we know: Secretary has a patient profile page at `app/[locale]/secretary/patients/[id]/page.tsx`. RLS blocks pregnancy data for secretary.
   - What's unclear: Should we actively hide the tab or just let it show empty?
   - Recommendation: Do NOT add pregnancy tab to secretary's patient profile page. Secretary has no access and pregnancy is a doctor-only clinical concern.

---

## Sources

### Primary (HIGH confidence)

- `supabase/migrations/00001_initial_schema.sql` - Authoritative schema for pregnancies and pregnancy_measurements tables, RLS policies, status CHECK constraint, indexes
- `lib/types/database.ts` - TypeScript types for Pregnancy and PregnancyMeasurement (verified match with SQL)
- `lib/actions/medical-records.ts` - Server action pattern to follow exactly
- `lib/actions/appointments.ts` - getDoctorId helper pattern
- `components/prescriptions/prescription-form.tsx` - react-hook-form pattern to follow
- `components/medical-records/visit-form.tsx` - FormData pattern for simpler forms
- `app/[locale]/doctor/patients/[id]/page.tsx` - Tab page pattern to extend
- `app/[locale]/patient/records/page.tsx` - Patient read-only page pattern to follow
- `app/[locale]/patient/layout.tsx` - Nav items array to extend
- `messages/ar.json` - Existing i18n structure to follow

### Secondary (MEDIUM confidence)

- Standard obstetric calculation: gestational age = (today - LMP) / 7 weeks; EDD = LMP + 280 days. This is the universally used Naegele's rule, verified against the database schema which uses `lmp_date + INTERVAL '280 days'`.

---

## Metadata

**Confidence breakdown:**
- Schema facts: HIGH - read directly from migration SQL file
- TypeScript types: HIGH - read directly from lib/types/database.ts
- RLS policies: HIGH - read directly from migration SQL file
- Existing patterns (server actions, pages, components): HIGH - read from multiple existing files
- Gestational calculation math: HIGH - standard obstetrics formula, also verified by DB schema using same formula
- i18n translation content: MEDIUM - Arabic medical terminology, followed existing patterns

**Research date:** 2026-02-15
**Valid until:** Stable codebase — valid until schema changes
