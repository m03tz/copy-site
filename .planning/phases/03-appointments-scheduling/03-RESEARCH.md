# Phase 3: Appointments & Scheduling - Research

**Researched:** 2026-02-10
**Domain:** Appointment scheduling, time slot generation, calendar UI, timezone handling, server actions CRUD
**Confidence:** HIGH

## Summary

Research focused on implementing a full appointment scheduling system for a medical clinic using the existing Next.js 15 + Supabase + shadcn/ui stack. The database schema (doctor_schedule, doctor_holidays, appointments) already exists with RLS policies, indexes, and a GiST exclusion constraint for double-booking prevention. The core engineering challenges are: (1) generating available time slots server-side from the doctor's schedule while excluding booked slots and holidays, (2) building calendar-based UI for booking and viewing appointments, and (3) enforcing the 24-hour cancellation policy.

The standard approach uses server actions in `lib/actions/` for all mutations (CRUD on schedule, holidays, appointments), Supabase queries for data fetching in Server Components, and shadcn/ui Calendar + Popover + Select + Dialog + Table components for the UI. The `date-fns` library (already available via react-day-picker dependency) handles date arithmetic, and `date-fns-tz` (already installed) handles timezone conversion to Asia/Amman (UTC+3, no DST).

A critical finding is that the TypeScript types in `lib/types/database.ts` are outdated and do not match the actual SQL migration schema. The types reference fields like `scheduled_at`, `duration_minutes`, `profile_id`, etc. that don't exist in the real tables, while missing fields that do exist (e.g., `scheduled_start`, `scheduled_end`, `doctor_id`, `slot_duration_minutes`). This MUST be fixed before any Phase 3 work begins.

**Primary recommendation:** Update database types first, then build server-side time slot generation as a pure TypeScript function (not a Postgres RPC), use shadcn/ui Calendar for date picking and a slot grid for time selection, and implement all business logic in server actions with `revalidatePath` for cache invalidation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/ssr | 0.8.0 | Server/browser Supabase clients | Already installed, three-pattern architecture established |
| react-hook-form | 7.71.1 | Form state management for booking/schedule forms | Already installed, integrates with Zod validation |
| zod | 4.3.6 | Server action input validation | Already installed, used in accounts.ts pattern |
| date-fns-tz | 3.2.0 | Timezone conversion (Asia/Amman UTC+3) | Already installed, toZonedTime/fromZonedTime for slot generation |
| lucide-react | 0.563.0 | Icons (Calendar, Clock, Plus, X, Check) | Already installed, tree-shakeable |
| next-intl | 4.8.2 | Bilingual labels for schedule/appointment UI | Already configured with Arabic/English |

### Supporting (shadcn/ui components to install)
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Calendar | Date picker for appointment booking | Date selection in booking flow |
| Popover | Calendar dropdown container | Wraps Calendar in date picker pattern |
| Select | Time slot selection, appointment type, day-of-week | Dropdowns in forms |
| Dialog | Booking confirmation, cancellation confirmation | Modal confirmations |
| Table | Appointment lists, schedule management | Data display tables |
| Badge | Appointment status indicators | Color-coded status chips |
| Tabs | Upcoming/past appointment views, calendar/list toggle | View switching |
| Separator | Visual dividers in forms | Form section separation |
| Textarea | Cancellation reason, appointment notes | Multi-line text input |
| Alert | Cancellation policy warning, success/error messages | User feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side slot generation (TS) | PostgreSQL RPC with generate_series | TS is simpler to test/debug, Postgres RPC is faster for large datasets but adds migration complexity |
| shadcn/ui Calendar + custom slot grid | FullCalendar or Mina Scheduler | Full calendar libs are feature-rich but heavyweight; shadcn Calendar + custom grid is lighter and matches existing UI |
| Individual server actions | API routes | Server actions are the established project pattern (auth.ts, accounts.ts), no reason to switch |

**Installation:**
```bash
pnpm dlx shadcn@latest add calendar popover select dialog table badge tabs separator textarea alert
```

## Architecture Patterns

### Recommended Project Structure
```
app/
  [locale]/
    doctor/
      schedule/
        page.tsx           # Doctor's working hours + holidays management
      appointments/
        page.tsx           # All appointments calendar/list view
    secretary/
      appointments/
        page.tsx           # All appointments calendar/list view + booking
        book/
          page.tsx         # Booking form (select patient, date, time slot)
    patient/
      appointments/
        page.tsx           # Patient's own upcoming + past appointments
lib/
  actions/
    schedule.ts            # Server actions: CRUD doctor_schedule, doctor_holidays
    appointments.ts        # Server actions: book, cancel, complete, list appointments
  utils/
    slots.ts               # Pure function: generate available time slots for a date
    date.ts                # Date formatting helpers with timezone support
components/
  appointments/
    calendar-view.tsx      # Calendar with appointment dots/markers
    slot-picker.tsx        # Grid of available time slots for a date
    appointment-card.tsx   # Single appointment display card
    booking-form.tsx       # Complete booking form (patient, date, slot, type)
    status-badge.tsx       # Color-coded appointment status badge
    cancel-dialog.tsx      # Cancellation confirmation with reason
  schedule/
    schedule-form.tsx      # Doctor schedule editing form
    holiday-form.tsx       # Holiday add/edit form
    weekly-schedule.tsx    # Weekly schedule display grid
messages/
  ar.json                  # Add schedule.*, appointments.* translation namespaces
  en.json                  # Add schedule.*, appointments.* translation namespaces
```

### Pattern 1: Server-Side Time Slot Generation
**What:** Generate available time slots for a given date by combining doctor_schedule + doctor_holidays + existing appointments data, all computed server-side.
**When to use:** Every time the booking UI needs to show available slots for a date.
**Example:**
```typescript
// lib/utils/slots.ts
import { toZonedTime } from 'date-fns-tz'
import { addMinutes, format, isBefore, isEqual, parseISO } from 'date-fns'

const TIMEZONE = 'Asia/Amman'

interface TimeSlot {
  start: string  // ISO string
  end: string    // ISO string
  startDisplay: string  // "10:00 AM"
  endDisplay: string    // "10:30 AM"
}

export function generateAvailableSlots(
  date: Date,
  schedule: { start_time: string; end_time: string; slot_duration_minutes: number } | null,
  existingAppointments: { scheduled_start: string; scheduled_end: string; status: string }[],
  holidays: { holiday_date: string }[]
): TimeSlot[] {
  // 1. Check if date falls on a holiday
  const dateStr = format(date, 'yyyy-MM-dd')
  if (holidays.some(h => h.holiday_date === dateStr)) return []

  // 2. Check if doctor works this day of week
  if (!schedule || !schedule.start_time) return []

  // 3. Generate all possible slots from start_time to end_time
  const [startH, startM] = schedule.start_time.split(':').map(Number)
  const [endH, endM] = schedule.end_time.split(':').map(Number)

  const dayStart = new Date(date)
  dayStart.setHours(startH, startM, 0, 0)

  const dayEnd = new Date(date)
  dayEnd.setHours(endH, endM, 0, 0)

  const slots: TimeSlot[] = []
  let current = dayStart

  while (isBefore(current, dayEnd)) {
    const slotEnd = addMinutes(current, schedule.slot_duration_minutes)
    if (isBefore(dayEnd, slotEnd)) break

    // 4. Check if slot overlaps any non-cancelled appointment
    const activeAppointments = existingAppointments.filter(a => a.status !== 'cancelled')
    const isBooked = activeAppointments.some(appt => {
      const apptStart = parseISO(appt.scheduled_start)
      const apptEnd = parseISO(appt.scheduled_end)
      return (isBefore(current, apptEnd) && isBefore(apptStart, slotEnd))
    })

    if (!isBooked) {
      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
        startDisplay: format(current, 'h:mm a'),
        endDisplay: format(slotEnd, 'h:mm a'),
      })
    }

    current = slotEnd
  }

  return slots
}
```

### Pattern 2: Server Action with Validation and Revalidation
**What:** Server actions follow the established project pattern: validate with Zod, check auth/role, perform Supabase operation, revalidatePath.
**When to use:** All mutations (booking, cancelling, schedule updates).
**Example:**
```typescript
// lib/actions/appointments.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const bookAppointmentSchema = z.object({
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  appointment_type: z.enum(['consultation', 'follow_up', 'prenatal', 'ultrasound', 'other']),
  notes: z.string().optional(),
})

export async function bookAppointment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify role (doctor or secretary can book)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can book appointments' }
  }

  // Validate input
  const validation = bookAppointmentSchema.safeParse({
    patient_id: formData.get('patient_id'),
    doctor_id: formData.get('doctor_id'),
    scheduled_start: formData.get('scheduled_start'),
    scheduled_end: formData.get('scheduled_end'),
    appointment_type: formData.get('appointment_type'),
    notes: formData.get('notes'),
  })

  if (!validation.success) return { error: validation.error.flatten().fieldErrors }

  const data = validation.data

  // Insert appointment (exclusion constraint prevents double-booking)
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      ...data,
      created_by: user.id,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23P01') {
      return { error: 'This time slot is already booked' }
    }
    return { error: error.message }
  }

  revalidatePath('/doctor/appointments')
  revalidatePath('/secretary/appointments')
  revalidatePath('/patient/appointments')

  return { success: true, appointment }
}
```

### Pattern 3: 24-Hour Cancellation Policy Enforcement
**What:** Enforce the business rule that appointments cannot be cancelled less than 24 hours before the scheduled time.
**When to use:** All cancellation actions.
**Example:**
```typescript
// In lib/actions/appointments.ts
export async function cancelAppointment(appointmentId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Fetch the appointment
  const { data: appointment } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (!appointment) return { error: 'Appointment not found' }

  // Check 24-hour policy
  const now = new Date()
  const appointmentTime = new Date(appointment.scheduled_start)
  const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntil < 24) {
    return { error: 'Cannot cancel appointments less than 24 hours in advance' }
  }

  // Update status
  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
    })
    .eq('id', appointmentId)

  if (error) return { error: error.message }

  revalidatePath('/doctor/appointments')
  revalidatePath('/secretary/appointments')
  revalidatePath('/patient/appointments')

  return { success: true }
}
```

### Pattern 4: Date Picker with Calendar + Popover (shadcn/ui)
**What:** Standard shadcn/ui date picker pattern combining Popover + Button + Calendar.
**When to use:** Date selection in booking form, schedule management.
**Example:**
```typescript
// components/appointments/date-picker.tsx
'use client'

import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { arSA } from 'react-day-picker/locale'
import { useLocale } from 'next-intl'

export function DatePicker({
  date,
  onDateChange,
}: {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
}) {
  const locale = useLocale()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-start">
          <CalendarIcon className="me-2 h-4 w-4" />
          {date ? format(date, 'PPP') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          locale={locale === 'ar' ? arSA : undefined}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          disabled={(date) => date < new Date()}
          timeZone="Asia/Amman"
        />
      </PopoverContent>
    </Popover>
  )
}
```

### Anti-Patterns to Avoid
- **Client-side slot generation:** Never generate available slots on the client. The client cannot reliably know all booked slots in real-time. Always compute slots server-side and pass as props.
- **Storing day_of_week as string:** The schema uses INT (0-6). Map 0=Sunday through 6=Saturday. Do not use locale-dependent day names for logic.
- **Timezone-naive date comparisons:** Always compare dates in the same timezone. Jordan is Asia/Amman (UTC+3, no DST since 2022). Store as TIMESTAMPTZ in DB, convert to local time for display only.
- **Missing revalidatePath after mutations:** Every server action that modifies data MUST call revalidatePath for all affected routes to keep the UI in sync.
- **Querying without status filter:** When fetching active appointments for slot availability, always filter `status != 'cancelled'`. The GiST exclusion constraint already handles this with its WHERE clause, but application logic should also filter.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Double-booking prevention | Application-level locks or checks | Database EXCLUDE constraint (already exists) | Race conditions are impossible to prevent at app level; DB constraint is atomic |
| Date picking UI | Custom calendar from scratch | shadcn/ui Calendar + Popover | RTL support, locale support, accessibility built-in |
| Form state management | useState for every field | react-hook-form + zod | Already installed, handles validation, errors, dirty state |
| Date formatting for display | Manual string concatenation | date-fns format() with locale | Handles AM/PM, Arabic formatting, timezone display |
| Status indicator colors | Inline conditional classes | Badge component with variant | Consistent styling, reusable pattern |
| Confirmation modals | Window.confirm or custom | shadcn/ui Dialog | Accessible, styled, consistent with project |

**Key insight:** The database schema already handles the hardest problem (double-booking prevention via GiST exclusion constraint). The application layer focuses on UX: showing available slots, collecting booking details, and enforcing business rules (24-hour cancellation). Do not attempt to replicate the DB constraint in application code.

## Common Pitfalls

### Pitfall 1: TypeScript Types Don't Match Database Schema
**What goes wrong:** The `lib/types/database.ts` file has types that don't match the actual SQL migration. Fields like `scheduled_at`, `duration_minutes`, `profile_id` don't exist; real fields like `scheduled_start`, `scheduled_end`, `doctor_id`, `full_name_ar`, `slot_duration_minutes` are missing.
**Why it happens:** Types were created before the schema was finalized, or were generated from an earlier draft.
**How to avoid:** Update `lib/types/database.ts` to match `supabase/migrations/00001_initial_schema.sql` exactly. Add types for `doctor_schedule` and `doctor_holidays` tables which are entirely missing from the types file.
**Warning signs:** TypeScript errors on `.from('doctor_schedule').select('*')`, field name mismatches, runtime errors from wrong column names.

### Pitfall 2: Day-of-Week Mapping Confusion
**What goes wrong:** The schedule form shows wrong days because day_of_week numbering doesn't match expectations. JavaScript Date.getDay() returns 0=Sunday, which matches the schema, but calendar libraries or UI labels may use different conventions.
**Why it happens:** ISO 8601 uses 1=Monday, but JavaScript and the PostgreSQL schema use 0=Sunday.
**How to avoid:** Define a constant mapping: `{ 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' }`. Use `date.getDay()` to match against `day_of_week` column. The doctor works on specific days (from translations: Mon/Wed/Sat in Arabic, Tue/Thu/Sat in English -- NOTE: these translations are inconsistent and need resolution).
**Warning signs:** Slots appearing on wrong days, schedule showing incorrect working days.

### Pitfall 3: Exclusion Constraint Error Not Handled Gracefully
**What goes wrong:** When a double-booking attempt hits the database EXCLUDE constraint, Supabase returns a PostgreSQL error code `23P01` (exclusion_violation). If not caught, the user sees a generic error.
**Why it happens:** The constraint prevents the insert but the app doesn't translate the error to a user-friendly message.
**How to avoid:** Catch error code `23P01` specifically in the bookAppointment server action and return a clear message like "This time slot is already booked. Please select another."
**Warning signs:** Generic "Database error" messages when attempting to book a nearly-taken slot.

### Pitfall 4: Timezone Mismatch Between Server and Client
**What goes wrong:** Server generates slots in UTC, client displays them without conversion, showing times 3 hours earlier than intended.
**Why it happens:** Supabase stores TIMESTAMPTZ in UTC. If the server creates a slot for "10:00 AM Amman time" but stores it as UTC, the display may show "7:00 AM".
**How to avoid:** Use a consistent approach: (1) Generate slots using Amman local time logic, (2) Convert to UTC for storage as TIMESTAMPTZ, (3) Convert back to Amman time for display. Since Jordan has no DST (fixed UTC+3 since 2022), the conversion is simple and predictable.
**Warning signs:** Appointment times appearing 3 hours off, slots not aligning with working hours.

### Pitfall 5: Stale Slot Data Leading to Booking Failures
**What goes wrong:** User selects a slot, but by the time they submit, another user has booked it. The DB constraint rejects the insert.
**Why it happens:** Time passes between slot display and form submission. In a single-doctor clinic this is rare but possible.
**How to avoid:** (1) The EXCLUDE constraint is the safety net -- always handle error code 23P01 gracefully. (2) Keep the booking flow short (few clicks). (3) Show a friendly retry message if the slot was taken.
**Warning signs:** Intermittent booking failures, especially during busy periods.

### Pitfall 6: Not Filtering Past Dates/Times in Available Slots
**What goes wrong:** Available slots include times that have already passed today, allowing booking for 10:00 AM when it's already 11:00 AM.
**Why it happens:** Slot generation logic doesn't account for current time when generating slots for today.
**How to avoid:** When generating slots for today's date, filter out any slot whose start time is before the current time (in Asia/Amman timezone).
**Warning signs:** Users see "available" slots in the past.

### Pitfall 7: Arabic/English Translation Inconsistency for Working Days
**What goes wrong:** The Arabic translations say "Monday, Wednesday, Saturday" but the English translations say "Tuesday, Thursday, Saturday". These are different days.
**Why it happens:** Translation mismatch in the source messages files.
**How to avoid:** This is a data issue that needs resolution. The doctor's actual working days should be stored in the database (doctor_schedule table), not hardcoded in translations. The schedule management UI in this phase will be the source of truth. Working hours text in the landing page contact section should eventually be dynamically generated.
**Warning signs:** Patients seeing different available days depending on their language setting.

## Code Examples

Verified patterns from official sources and project conventions:

### Supabase Query for Schedule + Appointments (Server Component)
```typescript
// app/[locale]/secretary/appointments/book/page.tsx
import { createClient } from '@/lib/supabase/server'
import { generateAvailableSlots } from '@/lib/utils/slots'

export default async function BookAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; doctor_id?: string }>
}) {
  const { date, doctor_id } = await searchParams
  const supabase = await createClient()

  if (!date || !doctor_id) {
    // Show date picker only
    return <DateSelectionStep />
  }

  const selectedDate = new Date(date)
  const dayOfWeek = selectedDate.getDay() // 0-6, matches schema

  // Fetch doctor's schedule for this day
  const { data: schedule } = await supabase
    .from('doctor_schedule')
    .select('start_time, end_time, slot_duration_minutes')
    .eq('doctor_id', doctor_id)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single()

  // Fetch holidays
  const { data: holidays } = await supabase
    .from('doctor_holidays')
    .select('holiday_date')
    .eq('doctor_id', doctor_id)

  // Fetch existing appointments for this date
  const startOfDay = `${date}T00:00:00+03:00`
  const endOfDay = `${date}T23:59:59+03:00`

  const { data: appointments } = await supabase
    .from('appointments')
    .select('scheduled_start, scheduled_end, status')
    .eq('doctor_id', doctor_id)
    .gte('scheduled_start', startOfDay)
    .lte('scheduled_start', endOfDay)
    .neq('status', 'cancelled')

  const availableSlots = generateAvailableSlots(
    selectedDate,
    schedule,
    appointments || [],
    holidays || []
  )

  return <SlotSelectionStep slots={availableSlots} date={date} />
}
```

### Appointment Status Badge Component
```typescript
// components/appointments/status-badge.tsx
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

const statusVariants = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
} as const

export function StatusBadge({ status }: { status: keyof typeof statusVariants }) {
  const t = useTranslations('appointments')

  return (
    <Badge className={statusVariants[status]}>
      {t(`status.${status}`)}
    </Badge>
  )
}
```

### Doctor Schedule Management Form
```typescript
// components/schedule/schedule-form.tsx (simplified)
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const scheduleSchema = z.object({
  day_of_week: z.coerce.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  slot_duration_minutes: z.coerce.number().min(10).max(120).default(30),
})

// Form component uses react-hook-form with Select, Input for times,
// and submits via server action
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API routes for mutations | Server actions with 'use server' | Next.js 14+ (2023) | Simpler code, no API boilerplate, progressive enhancement |
| Client-side date math | Server-side slot generation | Best practice | Prevents race conditions, ensures data consistency |
| Custom booking widgets | shadcn/ui Calendar + Popover + custom grid | 2024+ | Accessible, RTL-aware, consistent theming |
| moment.js for dates | date-fns + date-fns-tz | 2020+ (moment deprecated) | Tree-shakeable, smaller bundles, better TS support |
| utcToZonedTime / zonedTimeToUtc | toZonedTime / fromZonedTime | date-fns-tz v3 (2024) | Renamed functions, same behavior, date-fns v3 compat |
| DST-aware Jordan timezone | Fixed UTC+3 (no DST) | 2022 (Jordan abolished DST) | Simplifies timezone handling significantly |

**Deprecated/outdated:**
- **utcToZonedTime / zonedTimeToUtc:** Renamed to `toZonedTime` / `fromZonedTime` in date-fns-tz v3+
- **moment.js:** Deprecated since 2020, project uses date-fns (correct)
- **react-day-picker v8 locale import path:** v9+ uses `react-day-picker/locale` not `date-fns/locale`

## Open Questions

Things that couldn't be fully resolved:

1. **Working Days Discrepancy in Translations**
   - What we know: Arabic translations say Monday/Wednesday/Saturday, English says Tuesday/Thursday/Saturday. These are different days.
   - What's unclear: What are the doctor's actual working days?
   - Recommendation: The schedule management UI (APPT-02) should be the source of truth. Seed the database with the correct schedule. The landing page text is informational only and may need correction after schedule is configured.

2. **Who Is the Single Doctor?**
   - What we know: This is a single-doctor clinic. The doctor_id in all tables needs to reference a real profile.
   - What's unclear: Is there already a doctor account in the database, or does it need to be seeded?
   - Recommendation: The schedule and appointment actions should fetch the doctor profile dynamically (query profiles where role='doctor', expect exactly one result). If no doctor exists, the actions should fail gracefully. A seeding step may be needed.

3. **Patient Booking Access**
   - What we know: Requirements say "Patient or secretary can book appointment" (APPT-01). But STATE.md says "Patient role is read-only: Patients view but don't modify their records."
   - What's unclear: Can patients actually book their own appointments, or only secretary/doctor?
   - Recommendation: Based on the RLS policies (only doctor/secretary can INSERT into appointments), patients CANNOT book. Secretary and doctor book on behalf of patients. The patient portal only shows read-only views (APPT-06). The planner should NOT build a patient booking flow -- only secretary/doctor booking and patient viewing.

4. **Appointment Status Workflow**
   - What we know: Statuses are 'scheduled', 'confirmed', 'cancelled', 'completed'. RLS allows doctor and secretary to update.
   - What's unclear: What triggers transitions? Does the doctor confirm? When does it become 'completed'?
   - Recommendation: For this phase, keep it simple: new bookings are 'scheduled', cancellation sets 'cancelled', doctor can mark 'completed' after visit. 'Confirmed' can be deferred or used as the default status instead. Don't over-engineer the workflow.

## Sources

### Primary (HIGH confidence)
- Project SQL migration: `supabase/migrations/00001_initial_schema.sql` - Actual schema with constraints, RLS, indexes
- Project existing code: `lib/actions/auth.ts`, `lib/actions/accounts.ts` - Established server action patterns
- Project package.json: Verified installed library versions
- [shadcn/ui Calendar docs](https://ui.shadcn.com/docs/components/radix/calendar) - Calendar component API, RTL support, locale, timezone prop
- [shadcn/ui Date Picker docs](https://ui.shadcn.com/docs/components/radix/date-picker) - Popover + Calendar pattern
- [PostgreSQL generate_series docs](https://www.postgresql.org/docs/current/functions-srf.html) - Timestamp series generation
- [date-fns-tz npm](https://www.npmjs.com/package/date-fns-tz) - v3 API: toZonedTime, fromZonedTime
- [React DayPicker Localization](https://daypicker.dev/docs/localization) - Arabic locale (arSA), RTL dir prop

### Secondary (MEDIUM confidence)
- [PostgreSQL Exclusion Constraints](https://medium.com/@jamshidbek-makhmudov/postgressql-exclusion-constraints-f9fdb4158f9e) - GiST + btree_gist for double-booking prevention
- [Supabase Database Functions docs](https://supabase.com/docs/guides/database/functions) - RPC pattern for server-callable functions
- [Next.js 15 Server Actions patterns](https://johal.in/next-js-15-advanced-patterns-app-router-server-actions-and-caching-strategies-for-2026/) - Caching, revalidation strategies
- [Jordan timezone info](https://www.timeanddate.com/time/zone/jordan) - Fixed UTC+3 since 2022, no DST

### Tertiary (LOW confidence)
- [Appointment booking backend guide](https://saniaalikhan224.medium.com/mastering-time-a-backend-guide-to-appointment-systems-c442de1b37c9) - General slot generation algorithm patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, versions verified in package.json
- Architecture: HIGH - Follows established project patterns (server actions, Supabase clients, file structure)
- Database schema: HIGH - Verified from actual SQL migration, schema already exists with constraints
- Time slot generation: HIGH - Standard algorithm, verified date-fns-tz API
- UI components: HIGH - shadcn/ui Calendar verified with RTL/locale/timezone support
- Timezone handling: HIGH - Jordan fixed at UTC+3, no DST complexity
- Pitfalls: HIGH - TypeScript type mismatch verified by reading actual files
- RLS/permissions: HIGH - Verified from SQL migration, patients cannot INSERT appointments

**Research date:** 2026-02-10
**Valid until:** 2026-03-12 (30 days - stable technologies, fixed schema)
