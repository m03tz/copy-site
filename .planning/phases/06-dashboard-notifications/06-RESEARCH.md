# Phase 6: Dashboard & Notifications - Research

**Researched:** 2026-02-16
**Domain:** Next.js dashboard layout, email notifications, autocomplete search, Resend, Vercel Cron
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Area 1: Dashboard Design**
- Layout: stat cards row at top, then two-column (appointments list primary, due-date alerts sidebar)
- Appointments section: chronological list (NOT calendar grid), time + patient name + type
- Day navigation: left/right arrows shifting date by one day, today as default
- Each appointment row links to patient profile page
- Stat cards: 3-4 cards, suggested: today's count, total patients, active pregnancies approaching due date, recent cancellations (optional)
- Due-date alerts: reuse existing DueDateAlert component from Phase 5 (sidebar placement)
- Alert ordering: chronological (earliest due date first)
- Alert action: navigate to `/doctor/patients/{id}`

**Area 2: Urgent Alerts**
- Due-date alerts ONLY — NO cancellation alerts, NO no-show tracking
- Existing `components/pregnancy/due-date-alert.tsx` is reused as-is
- Dashboard positions it in new sidebar layout

**Area 3: Email Notifications**
- Two reminders per appointment: 24 hours before + 2 hours before
- Content: patient name, appointment date/time, clinic address
- Language: Arabic only
- Template: clean, branded with clinic logo and doctor info
- Cancellation notification: sent immediately on cancellation
- Cancellation content: date/time of cancelled appointment + clinic contact info
- Email service: researcher/planner should choose (Resend recommended)

**Area 4: Quick Patient Search**
- Autocomplete with dropdown, ~300ms debounce
- Searches `full_name_ar`, `full_name_en`, and phone in single field
- Reuse existing `searchPatients` server action from `lib/actions/patients.ts`
- Selecting a patient navigates to `/doctor/patients/{id}`

### Claude's Discretion
- Exact stat card set (3 or 4 cards)
- Exact position of quick search on dashboard
- Email scheduling mechanism (Supabase pg_cron vs. Resend `scheduled_at` vs. Vercel Cron)
- Cron frequency and approach

### Deferred Ideas
- None identified during discussion.
</user_constraints>

---

## Summary

Phase 6 is the final phase, adding a doctor-facing dashboard and patient email notifications. The codebase already has strong foundations: the `DueDateAlert` component and pregnancy data-fetching logic exist in the doctor dashboard page, `searchPatients` action exists in `lib/actions/patients.ts`, and the appointments query pattern is established.

The most architecturally significant decision is how to send the 24h and 2h appointment reminders. **Resend's `scheduled_at` API is the recommended approach** — schedule both reminder emails at booking time, store their Resend IDs in the database, and cancel them if the appointment is cancelled. This eliminates the need for any cron infrastructure, which simplifies the implementation considerably.

The dashboard layout requires a new responsive two-column layout inside the existing `app/[locale]/doctor/dashboard/page.tsx` (currently minimal). The autocomplete patient search needs a new `PatientAutocomplete` client component using shadcn's `Command` component (needs installation) layered behind a Popover trigger.

**Primary recommendation:** Use Resend with `scheduled_at` for reminder scheduling (no cron needed). Store Resend email IDs in a new `email_reminders` table or as columns on the `appointments` table to support cancellation. Use plain HTML strings (not `react-email`) for Arabic email templates to maintain RTL control.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | latest | Email sending + scheduling | Free tier 100/day, `scheduled_at` API, cancel API, HTML support |
| shadcn/ui Command | (install) | Autocomplete dropdown UI | Already using shadcn, Command powers the Popover+Command combobox pattern |
| date-fns | ^4.1.0 (installed) | Date formatting for dashboard | Already in project |
| lucide-react | installed | Icons for stat cards, arrows | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn Popover | installed | Wraps the Command for positioning | Already installed, use with Command for combobox |
| use-debounce | installed | Debounce autocomplete input | Already in project, used in PatientSearch |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend `scheduled_at` | Supabase pg_cron + Resend API route | Cron approach requires extra infra, edge functions, DB state machine. `scheduled_at` handles it at the SDK level |
| Resend `scheduled_at` | Vercel Cron | Vercel Hobby plan limited to once/day — cannot check every hour for 2h reminders. Requires Pro plan |
| Plain HTML email | react-email | react-email adds a dependency and its RTL Arabic rendering is untested. Plain HTML `dir="rtl"` is reliable across email clients |

**Installation:**
```bash
pnpm add resend
pnpm dlx shadcn@latest add command
```

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── [locale]/
│   └── doctor/
│       └── dashboard/
│           └── page.tsx          # Rebuilt: stat cards + two-column layout
├── api/
│   └── emails/
│       └── cancel/
│           └── route.ts          # Internal: cancel scheduled Resend emails
components/
├── dashboard/
│   ├── stat-card.tsx             # Single stat card component
│   ├── appointment-day-list.tsx  # Day-navigable appointment list (client)
│   └── patient-autocomplete.tsx  # Autocomplete search (client)
├── pregnancy/
│   └── due-date-alert.tsx        # Already exists — reuse as-is
lib/
├── actions/
│   ├── appointments.ts           # Add email scheduling to bookAppointment & cancelAppointment
│   └── email.ts                  # NEW: sendReminderEmail, sendCancellationEmail helpers
└── types/
    └── database.ts               # Add email_id columns to appointments (or new table)
```

### Pattern 1: Dashboard Two-Column Layout

**What:** Server Component page fetching all data, passing to client sub-components
**When to use:** Dashboard page (read-heavy, no mutations needed at page level)

```typescript
// Source: existing pattern from app/[locale]/doctor/dashboard/page.tsx

export default async function DoctorDashboard() {
  const supabase = await createClient()

  // Parallel fetches for all dashboard data
  const [
    { data: todayAppointments },
    { count: totalPatients },
    { data: pregnancyAlerts },
  ] = await Promise.all([
    supabase.from('appointments')
      .select('id, patient_id, scheduled_start, appointment_type, patient:profiles!appointments_patient_id_fkey(full_name_ar, full_name_en)')
      .gte('scheduled_start', todayStart.toISOString())
      .lte('scheduled_start', todayEnd.toISOString())
      .eq('status', 'scheduled')
      .order('scheduled_start', { ascending: true }),
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    // ... pregnancies query (already in current page)
  ])

  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="..." value={...} icon={...} />
      </div>

      {/* Quick search */}
      <PatientAutocomplete />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AppointmentDayList initialAppointments={todayAppointments} initialDate={todayStr} />
        </div>
        <div>
          <DueDateAlert alerts={alerts} />
        </div>
      </div>
    </div>
  )
}
```

### Pattern 2: Day Navigation (Client Component)

**What:** Client component managing a date state, fetching appointments for that date
**When to use:** AppointmentDayList — needs client interactivity for prev/next arrows

```typescript
// Source: established pattern from appointments-tabs.tsx + date-fns

'use client'

export function AppointmentDayList({ initialAppointments, initialDate }: Props) {
  const [date, setDate] = useState(new Date(initialDate))
  const [appointments, setAppointments] = useState(initialAppointments)
  const [loading, setLoading] = useState(false)

  // When date changes, fetch via server action
  async function loadDay(newDate: Date) {
    setLoading(true)
    const result = await getDayAppointments(format(newDate, 'yyyy-MM-dd'))
    setAppointments(result.appointments ?? [])
    setLoading(false)
  }

  return (
    <Card>
      {/* Date navigation header */}
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => {
            const prev = subDays(date, 1)
            setDate(prev)
            loadDay(prev)
          }}>
            <ChevronRight className="h-4 w-4" /> {/* RTL: right = previous */}
          </Button>
          <span className="font-semibold">{format(date, 'PPP')}</span>
          <Button variant="ghost" size="icon" ...>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {/* Appointment list */}
    </Card>
  )
}
```

**RTL navigation note:** In RTL layout (`dir="rtl"`), ChevronLeft/ChevronRight display in reverse. Use `ChevronRight` for "previous day" and `ChevronLeft` for "next day" to match Arabic reading direction — OR use `ChevronLeft`/`ChevronRight` consistently and let CSS `transform: scaleX(-1)` invert, OR use `ArrowLeft`/`ArrowRight` from lucide which are semantic.

**Simpler approach:** Use `←` / `→` text or lucide's `ArrowLeft`/`ArrowRight`, which convey absolute direction and work correctly with RTL without confusion.

### Pattern 3: Autocomplete Search (Popover + Command)

**What:** Inline autocomplete with server action for data fetching, debounced 300ms
**When to use:** PatientAutocomplete on dashboard

```typescript
// Source: shadcn/ui official combobox docs pattern

'use client'

import { useState, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { searchPatients } from '@/lib/actions/patients'
import { useRouter } from 'next/navigation'

export function PatientAutocomplete() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientResult[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSearch = useDebouncedCallback((value: string) => {
    if (!value.trim()) {
      setResults([])
      return
    }
    startTransition(async () => {
      const result = await searchPatients(value, 1, 8) // limit to 8 results
      setResults((result.patients ?? []) as PatientResult[])
    })
  }, 300)

  return (
    <Popover open={open && results.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-10"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              handleSearch(e.target.value)
            }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>{isPending ? t('loading') : t('noResults')}</CommandEmpty>
            <CommandGroup>
              {results.map((patient) => (
                <CommandItem
                  key={patient.id}
                  onSelect={() => {
                    router.push(`/doctor/patients/${patient.id}`)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <div>
                    <p className="font-medium">{patient.full_name_ar}</p>
                    <p className="text-xs text-muted-foreground">{patient.phone}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

### Pattern 4: Email Scheduling with Resend `scheduled_at`

**What:** At booking time, schedule two future emails (24h and 2h before); cancel them if appointment is cancelled
**When to use:** Modify `bookAppointment` and `cancelAppointment` server actions

```typescript
// Source: Resend API docs — https://resend.com/docs/api-reference/emails/send-email

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Called from bookAppointment after successful insert
async function scheduleReminders(appointment: {
  id: string
  patient_email: string
  patient_name: string
  scheduled_start: string  // ISO string
  appointment_type: string
}) {
  const startTime = new Date(appointment.scheduled_start)
  const reminder24h = new Date(startTime.getTime() - 24 * 60 * 60 * 1000)
  const reminder2h = new Date(startTime.getTime() - 2 * 60 * 60 * 1000)

  const [r24, r2h] = await Promise.all([
    resend.emails.send({
      from: 'عيادة د. فادي <noreply@clinic-domain.com>',
      to: appointment.patient_email,
      subject: 'تذكير: موعدك غداً',
      html: buildReminderHtml(appointment, '24'),
      scheduled_at: reminder24h.toISOString(),
    }),
    resend.emails.send({
      from: 'عيادة د. فادي <noreply@clinic-domain.com>',
      to: appointment.patient_email,
      subject: 'تذكير: موعدك خلال ساعتين',
      html: buildReminderHtml(appointment, '2'),
      scheduled_at: reminder2h.toISOString(),
    }),
  ])

  // Store Resend email IDs for potential cancellation
  return { reminder24hId: r24.data?.id, reminder2hId: r2h.data?.id }
}

// Called from cancelAppointment
async function cancelReminders(reminder24hId: string | null, reminder2hId: string | null) {
  const cancellations = []
  if (reminder24hId) cancellations.push(resend.emails.cancel(reminder24hId))
  if (reminder2hId) cancellations.push(resend.emails.cancel(reminder2hId))
  await Promise.allSettled(cancellations) // allSettled — don't fail if already sent
}
```

### Pattern 5: Arabic HTML Email Template

**What:** Plain HTML string with `dir="rtl"` for Arabic email content
**When to use:** For all clinic email templates

```typescript
// Source: Resend API docs (html parameter) + standard RTL email practices

function buildReminderHtml(data: {
  patient_name: string
  appointment_date: string   // formatted in Arabic locale
  appointment_time: string
  appointment_type: string
  clinic_address: string
}, hoursType: '24' | '2'): string {
  const subject = hoursType === '24' ? 'موعدك غداً' : 'موعدك خلال ساعتين'

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f9f9f9; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h1 style="color: #1a73e8; font-size: 20px; margin-bottom: 8px;">عيادة د. فادي نادي السحلة</h1>
    <p style="color: #666; font-size: 14px; margin-bottom: 24px;">أخصائي نساء وتوليد وعقم وجراحة بالمنظار</p>
    <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 24px;" />
    <h2 style="font-size: 18px; margin-bottom: 16px;">تذكير بموعدك</h2>
    <p>عزيزتي <strong>${data.patient_name}</strong>،</p>
    <p>نذكرك بموعدك القادم:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; color: #666;">التاريخ:</td><td style="padding: 8px;"><strong>${data.appointment_date}</strong></td></tr>
      <tr><td style="padding: 8px; color: #666;">الوقت:</td><td style="padding: 8px;"><strong>${data.appointment_time}</strong></td></tr>
      <tr><td style="padding: 8px; color: #666;">نوع الزيارة:</td><td style="padding: 8px;">${data.appointment_type}</td></tr>
    </table>
    <p><strong>العنوان:</strong> ${data.clinic_address}</p>
    <p style="color: #666; font-size: 12px; margin-top: 24px;">إذا كنت بحاجة إلى إلغاء أو تغيير موعدك، يرجى التواصل معنا في أقرب وقت ممكن.</p>
  </div>
</body>
</html>`
}
```

### Anti-Patterns to Avoid

- **Fetching appointment data in a loop for the day list:** Use a single date-range query per day, not individual appointment fetches
- **Polling instead of server action calls:** The day navigation should call a server action, not poll
- **Using Vercel Cron for sub-daily reminders on Hobby plan:** Hobby plan is limited to once/day — breaks the 2h reminder
- **Not storing Resend email IDs:** If you don't persist the IDs, you cannot cancel scheduled emails when an appointment is cancelled
- **Using `router.push` without clearing the autocomplete:** After selecting a patient, clear the input and close the dropdown to avoid stale state

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email scheduling | Custom pg_cron + state machine | Resend `scheduled_at` | Handled entirely by Resend SDK; no cron setup, no polling |
| Autocomplete dropdown | Custom dropdown with positioning | Popover + Command (shadcn) | Handles keyboard nav, ARIA, positioning, RTL, focus trapping |
| Debounced search input | Custom setTimeout/clearTimeout | `use-debounce` (already installed) | Already in project, proven |
| Date formatting | Manual string manipulation | `date-fns` (already installed) | Handles timezone, locale formatting, adds/subtracts days |
| Email cancel | Re-sending with different content | `resend.emails.cancel(id)` | Resend cancel API; much simpler than re-scheduling |

**Key insight:** Resend's `scheduled_at` parameter eliminates the entire cron infrastructure problem. Schedule at booking time, cancel if needed. This is the simplest possible architecture for reminder emails.

---

## Common Pitfalls

### Pitfall 1: Vercel Hobby Plan Cron Limitation

**What goes wrong:** Developer sets up Vercel Cron to run every hour; deployment fails with "Hobby accounts are limited to daily cron jobs"
**Why it happens:** Vercel Hobby plan restricts cron to once-per-day minimum interval
**How to avoid:** Use Resend `scheduled_at` instead of cron. If cron is absolutely needed, use Supabase pg_cron (free tier, runs on Supabase's infrastructure not Vercel)
**Warning signs:** The need for a cron schedule like `0 * * * *` (hourly) or `*/30 * * * *`

### Pitfall 2: Not Persisting Resend Email IDs

**What goes wrong:** Appointment is booked, emails are scheduled via Resend. Appointment gets cancelled. The reminder emails still arrive because there's no record of the Resend IDs to cancel
**Why it happens:** Developer treats email scheduling as fire-and-forget
**How to avoid:** Add `reminder_24h_email_id` and `reminder_2h_email_id` columns to the `appointments` table, or create a separate `email_reminders` table. Store IDs returned by `resend.emails.send()` immediately after booking
**Warning signs:** `cancelAppointment` action doesn't reference any email IDs

### Pitfall 3: RTL Direction in Day Navigation Arrows

**What goes wrong:** "Previous day" button shows a left-facing arrow `<` which in RTL layout visually points forward (toward larger dates), confusing users
**Why it happens:** ChevronLeft/ChevronRight are physically directional; RTL flips visual meaning
**How to avoid:** Use lucide `ArrowLeft`/`ArrowRight` (semantic) and apply logical property button ordering, OR use text strings like `←` `→` and test in RTL mode. The simplest approach: use the same icons but swap which button is left/right in the DOM so they display correctly with RTL flex-direction
**Warning signs:** Arrows appear backwards relative to their action in Arabic UI

### Pitfall 4: `searchPatients` Called on Every Keystroke

**What goes wrong:** Server action called too frequently, causing race conditions and performance issues
**Why it happens:** Forgetting to wrap the server action call in the debounce callback
**How to avoid:** Wrap the `searchPatients` call inside `useDebouncedCallback` from `use-debounce` (already installed). Only call the action from inside the debounced function, not from the raw input handler
**Warning signs:** Network tab shows a new request for every character typed

### Pitfall 5: Patient Email May Be Null

**What goes wrong:** `resend.emails.send()` called with `to: null`, causing a Resend API error
**Why it happens:** The `profiles.email` field is nullable — patients registered by the doctor/secretary may not have email
**How to avoid:** Check `patient.email` before scheduling reminders. If no email, skip silently (or log). Do not throw an error for missing email — just skip the reminder scheduling
**Warning signs:** Runtime errors from Resend when email is null/undefined

### Pitfall 6: Day Navigation Fetches Appointments Including Cancelled

**What goes wrong:** Dashboard shows cancelled appointments mixed with scheduled ones for the day, cluttering the view
**Why it happens:** Query doesn't filter by status
**How to avoid:** Filter appointments to `status in ('scheduled', 'confirmed')` for the day list view — or show all but visually distinguish cancelled ones
**Warning signs:** Cancelled appointments appear in the daily list without visual differentiation

### Pitfall 7: Stat Cards Data Staleness

**What goes wrong:** Stat cards show stale counts after new appointments are booked
**Why it happens:** Server Component page is statically rendered or cached aggressively
**How to avoid:** Ensure `revalidatePath('/doctor/dashboard')` is called from `bookAppointment` and `cancelAppointment` actions. Add `export const dynamic = 'force-dynamic'` to the dashboard page if caching is aggressive
**Warning signs:** Stat counts don't update after booking a new appointment

---

## Code Examples

### Server Action: Get Day Appointments (for Day Navigation)

```typescript
// Source: based on existing getAppointments pattern in lib/actions/appointments.ts

'use server'

export async function getDayAppointments(
  date: string  // 'yyyy-MM-dd'
): Promise<{ appointments?: AppointmentWithPatient[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      patient_id,
      scheduled_start,
      appointment_type,
      status,
      patient:profiles!appointments_patient_id_fkey(full_name_ar, full_name_en)
    `)
    .gte('scheduled_start', dayStart.toISOString())
    .lte('scheduled_start', dayEnd.toISOString())
    .in('status', ['scheduled', 'confirmed'])
    .order('scheduled_start', { ascending: true })

  if (error) return { error: error.message }
  return { appointments: data ?? [] }
}
```

### Database: Add Reminder Email ID Columns

```sql
-- Source: project pattern — add to a migration file

ALTER TABLE appointments
  ADD COLUMN reminder_24h_email_id TEXT,
  ADD COLUMN reminder_2h_email_id TEXT;
```

Or use a separate tracking table (preferred if you want cleaner separation):

```sql
CREATE TABLE appointment_email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '2h', 'cancellation')),
  resend_email_id TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Stat Cards Query (Parallel Fetches)

```typescript
// Source: Supabase client pattern established in project

const today = new Date()
const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)

const [
  { count: todayCount },
  { count: totalPatients },
  { count: approachingDue },
] = await Promise.all([
  supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .gte('scheduled_start', todayStart.toISOString())
    .lte('scheduled_start', todayEnd.toISOString())
    .in('status', ['scheduled', 'confirmed']),
  supabase
    .from('patients')
    .select('id', { count: 'exact', head: true }),
  supabase
    .from('pregnancies')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('expected_due_date', todayStart.toISOString().split('T')[0])
    .lte('expected_due_date', twoWeeksFromNow),
])
```

### Resend Integration in bookAppointment

```typescript
// Source: Resend API docs + project server action pattern

// After successful appointment insert, schedule reminder emails
if (patientEmail) {
  const startTime = new Date(scheduled_start)
  const now = new Date()

  const reminder24hAt = new Date(startTime.getTime() - 24 * 60 * 60 * 1000)
  const reminder2hAt = new Date(startTime.getTime() - 2 * 60 * 60 * 1000)

  // Only schedule if the reminder time is in the future
  const [r24, r2h] = await Promise.allSettled([
    reminder24hAt > now ? resend.emails.send({
      from: 'عيادة د. فادي <noreply@yourdomain.com>',
      to: patientEmail,
      subject: 'تذكير: موعدك غداً في عيادة د. فادي',
      html: buildReminderHtml({ ... }, '24h'),
      scheduled_at: reminder24hAt.toISOString(),
    }) : Promise.resolve(null),
    reminder2hAt > now ? resend.emails.send({
      from: 'عيادة د. فادي <noreply@yourdomain.com>',
      to: patientEmail,
      subject: 'تذكير: موعدك خلال ساعتين في عيادة د. فادي',
      html: buildReminderHtml({ ... }, '2h'),
      scheduled_at: reminder2hAt.toISOString(),
    }) : Promise.resolve(null),
  ])

  // Store IDs (null-safe)
  const reminder24hId = r24.status === 'fulfilled' && r24.value?.data?.id
    ? r24.value.data.id : null
  const reminder2hId = r2h.status === 'fulfilled' && r2h.value?.data?.id
    ? r2h.value.data.id : null

  if (reminder24hId || reminder2hId) {
    await supabase
      .from('appointments')
      .update({ reminder_24h_email_id: reminder24hId, reminder_2h_email_id: reminder2hId })
      .eq('id', appointment.id)
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cron daemon for scheduled emails | `scheduled_at` parameter in email API | Resend added ~2024 | No infra needed, handled at SDK level |
| `react-email` required for Resend | Plain `html` string parameter | Always supported | Simpler for pure HTML needs |
| react-query for autocomplete | `useTransition` + server actions | Next.js 15 | No client state library needed |
| Vercel Cron (Hobby) | Supabase pg_cron or `scheduled_at` | N/A | Hobby plan blocks sub-daily cron |

**Deprecated/outdated:**
- Pages Router API routes for email: Use App Router route handlers or server actions
- `react-email` for simple HTML templates: Overkill if you just need HTML strings; adds an extra package and development server

---

## Existing Codebase: What's Already Built

Critical context for the planner — do NOT rebuild these:

| Asset | Location | Status |
|-------|----------|--------|
| DueDateAlert component | `components/pregnancy/due-date-alert.tsx` | Complete — accepts `alerts` prop, handles all styling |
| Pregnancy data fetch + de-dup logic | `app/[locale]/doctor/dashboard/page.tsx` | Complete — copy/adapt from existing page |
| `searchPatients` server action | `lib/actions/patients.ts` | Complete — reuse directly |
| `getAppointments` server action | `lib/actions/appointments.ts` | Complete — use for day list |
| `cancelAppointment` server action | `lib/actions/appointments.ts` | Exists — needs email cancellation added |
| `bookAppointment` server action | `lib/actions/appointments.ts` | Exists — needs email scheduling added |
| Popover component | `components/ui/popover.tsx` | Installed |
| `use-debounce` | package.json | Installed — `useDebouncedCallback` |
| `date-fns` | package.json | Installed — `format`, `subDays`, `addDays` |
| `lucide-react` | package.json | Installed |
| Appointment type translations | `messages/ar.json` `appointments.type.*` | Complete |
| Dashboard translations | `messages/ar.json` `dashboard.*` | Partial — needs expansion |

**NOT yet installed — needs pnpm add:**
- `resend` — new dependency
- shadcn `command` component — `pnpm dlx shadcn@latest add command`

---

## Database Schema Changes

The planner must account for these required schema changes:

### Option A: Columns on appointments table (simpler)

```sql
ALTER TABLE appointments
  ADD COLUMN reminder_24h_email_id TEXT,
  ADD COLUMN reminder_2h_email_id TEXT;
```

**Pros:** Simple, no extra table, no join needed
**Cons:** Pollutes appointments table with email-system concerns

### Option B: Separate email_reminders table (cleaner)

```sql
CREATE TABLE appointment_email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '2h')),
  resend_email_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Pros:** Clean separation, extensible
**Cons:** Extra join when cancelling

**Recommendation:** Option A for this clinic's scale. Two extra nullable columns are simpler than a new table.

The `database.ts` types file must be updated to include the new columns.

---

## i18n Keys Needed

The `dashboard` namespace needs significant expansion. New keys needed in both `ar.json` and `en.json`:

```json
"dashboard": {
  "doctorTitle": "...",          // exists
  "dueDateAlerts": "...",        // exists
  "daysRemaining": "...",        // exists
  "dueToday": "...",             // exists
  "noDueDateAlerts": "...",      // exists
  "totalPatients": "...",        // NEW — stat card label
  "todayAppointments": "...",    // NEW — stat card label (appointments.todayAppointments exists — reuse)
  "approachingDueDate": "...",   // NEW — stat card label
  "noAppointmentsToday": "...",  // NEW — empty state for day list
  "searchPatients": "...",       // NEW — search placeholder
  "searchNoResults": "...",      // NEW — autocomplete empty state
  "previousDay": "...",          // NEW — arrow button label
  "nextDay": "..."               // NEW — arrow button label
}
```

Note: `appointments.todayAppointments` already exists in `ar.json` ("مواعيد اليوم") — can reuse.

---

## Open Questions

1. **Resend domain verification**
   - What we know: Resend requires domain verification before sending from a custom `from` address
   - What's unclear: Whether the clinic has a domain set up; during development, Resend provides `onboarding@resend.dev` as a testing sender
   - Recommendation: Plan for using `onboarding@resend.dev` for development. Leave a TODO for production domain setup. The planner should note this in the env var setup.

2. **Appointments booked far in advance vs. Resend 30-day scheduling limit**
   - What we know: Resend can schedule emails up to 30 days in advance
   - What's unclear: Whether this clinic books appointments more than 30 days out
   - Recommendation: For appointments > 30 days out, skip the `scheduled_at` (send immediately without scheduling) OR fallback to a pg_cron approach for those edge cases. Given it's an OB/GYN clinic, most appointments are likely within 30 days.

3. **Email sending when patient has no email**
   - What we know: `profiles.email` is nullable — patients can be created without email
   - What's unclear: How common this is in practice
   - Recommendation: Silently skip email sending if `patient.email` is null. Do not fail the booking action. Add a comment in the code.

---

## Sources

### Primary (HIGH confidence)
- Resend API docs (https://resend.com/docs/api-reference/emails/send-email) — `scheduled_at` parameter, `html` parameter, cancel API
- Resend Next.js docs (https://resend.com/docs/send-with-nextjs) — App Router pattern
- Vercel Cron docs (https://vercel.com/docs/cron-jobs/usage-and-pricing) — **Hobby plan: once/day only**
- Vercel Cron quickstart (https://vercel.com/docs/cron-jobs/quickstart) — configuration, CRON_SECRET pattern
- shadcn/ui combobox pattern (https://ui.shadcn.com/docs/components/combobox) — Popover + Command pattern
- Direct codebase inspection — existing components, actions, database types

### Secondary (MEDIUM confidence)
- Supabase pg_cron docs (https://supabase.com/docs/guides/cron) — free-tier availability (resource-limited, not plan-limited)
- GitHub discussion: Supabase pg_cron free tier (https://github.com/orgs/supabase/discussions/37405) — "limited by resources only"
- Resend scheduling changelog (https://resend.com/changelog/extended-email-scheduling) — 30-day max window

### Tertiary (LOW confidence)
- WebSearch results for RTL Arabic email templates — no authoritative source found; recommendation based on HTML email best practices (`dir="rtl"` on `<html>` and inline styles)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Resend and shadcn Command are well-documented; project dependencies verified
- Architecture: HIGH — Based on existing codebase patterns + official docs
- Email scheduling: HIGH — Resend `scheduled_at` documented in official API reference
- Vercel cron limitation: HIGH — Officially documented in Vercel pricing docs
- Pitfalls: HIGH for items found in official docs; MEDIUM for RTL arrow direction

**Research date:** 2026-02-16
**Valid until:** 2026-04-16 (stable APIs; Resend free tier limits may change)
