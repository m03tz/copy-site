---
phase: 03-appointments-scheduling
plan: 02
subsystem: ui
tags: [nextjs, supabase, server-actions, zod, shadcn-ui, i18n, rtl, doctor-schedule]

# Dependency graph
requires:
  - phase: 03-appointments-scheduling
    plan: 01
    provides: Database types (DoctorSchedule, DoctorHoliday), shadcn/ui components (Table, Dialog, Badge, Tabs, Select, Input, Textarea), schedule/appointments translations
  - phase: 01-foundation
    provides: Supabase server client, profiles table, authentication pattern
provides:
  - Doctor schedule management page at /doctor/schedule
  - Server actions: upsertScheduleDay, deleteScheduleDay, addHoliday, deleteHoliday in lib/actions/schedule.ts
  - ScheduleForm client component for adding/editing working days
  - HolidayForm client component for adding holidays
affects:
  - 03-03-appointment-booking (needs schedule data to generate time slots)
  - 03-04-appointment-views
  - 03-05-appointment-management

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server action pattern with Zod validation + doctor role check + revalidatePath
    - Bound server action for ID-based deletions (deleteScheduleDay.bind(null, id))
    - Void wrapper server actions for TypeScript form action compatibility
    - useActionState hook for client-side form state and pending/error/success feedback
    - Single-doctor clinic getDoctorId pattern via profiles.eq('role', 'doctor').single()

key-files:
  created:
    - lib/actions/schedule.ts
    - app/[locale]/doctor/schedule/page.tsx
    - components/schedule/schedule-form.tsx
    - components/schedule/holiday-form.tsx
  modified: []

key-decisions:
  - "Void wrapper server actions at module scope (handleDeleteScheduleDay, handleDeleteHoliday) to satisfy TypeScript form action type"
  - "Inline 'use server' directive pattern for ID-bound delete actions in Server Components"
  - "Single-doctor getDoctorId pattern: query profiles where role='doctor' .single() - consistent with appointments.ts pattern"
  - "upsertScheduleDay uses onConflict: 'doctor_id,day_of_week' for idempotent schedule updates"

patterns-established:
  - "Doctor role check: from('profiles').select('role').eq('id', user.id).single() cast as { data: { role: string } | null }"
  - "Form state with useActionState: state.success / state.error (string or Record<string, string[]>)"
  - "Slot duration SelectItem options: [15, 20, 30, 45, 60] min"

# Metrics
duration: 11min
completed: 2026-02-10
---

# Phase 3 Plan 02: Doctor Schedule Management Summary

**Doctor schedule CRUD via four Zod-validated server actions plus a tabbed `/doctor/schedule` page with working-day and holiday management using shadcn/ui Table, Dialog, and Tabs**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-10T20:34:52Z
- **Completed:** 2026-02-10T20:45:56Z
- **Tasks:** 2
- **Files modified:** 4 (all new)

## Accomplishments
- Created `lib/actions/schedule.ts` with 4 server actions: `upsertScheduleDay`, `deleteScheduleDay`, `addHoliday`, `deleteHoliday` — each with Zod validation, doctor role auth, Supabase operation, and `revalidatePath`
- Built `app/[locale]/doctor/schedule/page.tsx` Server Component fetching current working days and holidays via Supabase, rendering them in Tables with delete buttons using bound server actions
- Created `ScheduleForm` and `HolidayForm` client components with `useActionState` for optimistic feedback (pending, error, success states)
- Full bilingual (ar/en) support via `useTranslations('schedule')` — day names, labels, feedback messages

## Task Commits

Each task was committed atomically:

1. **Task 1: Create schedule server actions** - `09f6b3c` (feat) - *already committed in prior 03-03 session*
2. **Task 2: Create doctor schedule management page and form components** - `3beb617` (feat)

**Plan metadata:** *(docs commit follows)*

## Files Created/Modified
- `lib/actions/schedule.ts` - Four server actions for doctor_schedule and doctor_holidays CRUD (committed in 09f6b3c as part of 03-03 prep work)
- `app/[locale]/doctor/schedule/page.tsx` - Doctor schedule management page with Tabs (working days / holidays), Tables, Dialog-wrapped forms, and delete actions
- `components/schedule/schedule-form.tsx` - Client component form for adding a working day (day of week Select, time Inputs, slot duration Select)
- `components/schedule/holiday-form.tsx` - Client component form for adding a holiday (date Input with min=today, optional reason Textarea)

## Decisions Made
- Used void wrapper server actions (`handleDeleteScheduleDay`, `handleDeleteHoliday`) at module scope with inline `'use server'` directive — TypeScript requires form `action` to return `void | Promise<void>`, not `Promise<{success, error}>`
- Typed `.single()` query results as `as { data: { role: string } | null }` — matching the established `accounts.ts` pattern for Supabase type narrowing with `@supabase/supabase-js` 2.95+
- `existingDays` prop on `ScheduleForm` disables already-configured days in the Select to prevent duplicate day errors

## Deviations from Plan

None - plan executed exactly as written. One deviation handled:

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript form action void type mismatch**
- **Found during:** Task 2 (schedule page creation)
- **Issue:** `deleteScheduleDay.bind(null, id)` returns `() => Promise<{success?, error?}>` which is not assignable to `(formData: FormData) => void | Promise<void>` required by React form `action` prop
- **Fix:** Added void wrapper functions `handleDeleteScheduleDay` and `handleDeleteHoliday` with inline `'use server'` directive that wrap the actual actions, absorbing the return value
- **Files modified:** `app/[locale]/doctor/schedule/page.tsx`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `3beb617` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (TypeScript type correctness)
**Impact on plan:** Essential for type safety with no scope creep.

## Issues Encountered
- `lib/actions/schedule.ts` was already committed in prior session `09f6b3c` (feat(03-03) time slot utility commit which also fixed schedule.ts type assertions). The file content exactly matched what this plan required — no rework needed.
- Supabase `@supabase/supabase-js` 2.95+ requires `.single()` query results to be cast manually (`as { data: {...} | null }`) because the generic type inference chain resolves to `never` for certain query patterns without the explicit cast. This matches the established pattern in `accounts.ts`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Doctor can define working days (day of week, start/end time, slot duration) and manage holidays
- Schedule data is the prerequisite for 03-03 appointment booking (time slot generation reads from doctor_schedule and doctor_holidays)
- All four server actions are available for import in future plans
- Both `ScheduleForm` and `HolidayForm` components follow established `useActionState` pattern and can be reused

---
*Phase: 03-appointments-scheduling*
*Completed: 2026-02-10*

## Self-Check: PASSED
