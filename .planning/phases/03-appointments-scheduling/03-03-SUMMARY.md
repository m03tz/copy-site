---
phase: 03-appointments-scheduling
plan: 03
subsystem: api
tags: [supabase, server-actions, date-fns, appointments, slots, typescript]

# Dependency graph
requires:
  - phase: 03-01
    provides: Database types (Appointment, DoctorSchedule, DoctorHoliday), AppointmentType enum
  - phase: 01-03
    provides: Supabase server client (createClient from lib/supabase/server)
provides:
  - generateAvailableSlots pure function (lib/utils/slots.ts)
  - bookAppointment server action with 23P01 double-booking protection
  - cancelAppointment server action with 24-hour policy enforcement
  - getAvailableSlots data-fetching action wiring slots utility to Supabase
  - getAppointments role-based listing action
affects:
  - 03-04 (appointment booking UI will call these actions)
  - 03-05 (appointment management UI will call cancelAppointment and getAppointments)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure utility functions with no side effects, data passed as arguments (slots.ts)
    - Server actions with auth check -> role check -> validation -> DB operation -> revalidatePath
    - Type cast pattern for Supabase .single() results to bypass TypeScript inference issues
    - Relationships array required on all Database table types for GenericTable conformance

key-files:
  created:
    - lib/utils/slots.ts
    - lib/actions/appointments.ts
  modified:
    - lib/types/database.ts
    - lib/actions/schedule.ts

key-decisions:
  - "generateAvailableSlots is pure with no Supabase dependency - testable and composable"
  - "bookAppointment maps 23P01 to slotTaken translation key for friendly UI error"
  - "cancelAppointment returns cancel24HourPolicy translation key for i18n error messages"
  - "Database Relationships field required on all tables to match Supabase GenericTable contract"

patterns-established:
  - "Pure slot generation: schedule/appointments/holidays passed as arguments, no I/O inside"
  - "Error code 23P01 maps to translation key slotTaken (not raw DB error)"
  - "24-hour policy: (scheduledStart - now) / (1000*60*60) < 24 returns cancel24HourPolicy"
  - "Role cast pattern for Supabase queries: as { data: { role: string } | null }"

# Metrics
duration: 5min
completed: 2026-02-10
---

# Phase 3 Plan 3: Slot Generation Utility & Appointment Server Actions Summary

**Pure slot generation function plus four server actions (book, cancel, getSlots, list) implementing core appointment business logic with double-booking protection and 24-hour cancellation policy**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-10T20:35:11Z
- **Completed:** 2026-02-10T20:40:57Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Pure `generateAvailableSlots` function computes available times from schedule minus booked slots, filtering holidays, off-days, and past times for today
- `bookAppointment` inserts with status 'scheduled' and `created_by` field, catching PostgreSQL error 23P01 (exclusion_violation) and returning `{ error: 'slotTaken' }` translation key
- `cancelAppointment` enforces 24-hour advance policy and prevents re-cancellation of already-cancelled appointments
- `getAvailableSlots` orchestrates Supabase data fetching and passes it to the pure slot generator
- `getAppointments` provides role-based filtering (patients see only their own appointments)
- Fixed pre-existing bug in database types: `Relationships: []` field required by Supabase v2.95 `GenericTable` contract
- Fixed pre-existing TypeScript errors in `lib/actions/schedule.ts` type assertions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create time slot generation utility** - `09f6b3c` (feat)
2. **Task 2: Create appointment server actions** - `f2ddd5c` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `lib/utils/slots.ts` - Pure function generateAvailableSlots + TimeSlot interface
- `lib/actions/appointments.ts` - Four server actions: bookAppointment, cancelAppointment, getAvailableSlots, getAppointments
- `lib/types/database.ts` - Added Relationships: [] to all table definitions for GenericTable conformance
- `lib/actions/schedule.ts` - Fixed type assertion pattern for .single() Supabase queries

## Decisions Made
- `generateAvailableSlots` is a pure function with no Supabase dependency: schedule, appointments, and holidays are passed as arguments. This makes it independently testable and reusable.
- Error code `23P01` (PostgreSQL exclusion_violation for overlapping time ranges) maps to translation key `slotTaken` rather than raw DB error message for user-friendly UI display.
- Cancellation policy error maps to `cancel24HourPolicy` translation key (i18n-compatible).
- All `.single()` Supabase queries on `profiles` use explicit type cast `as { data: { role: string } | null }` to work around TypeScript inference limitations in Supabase v2.95.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added Relationships field to all Database table types**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** Supabase v2.95 requires `Relationships: GenericRelationship[]` on every table definition to satisfy the `GenericTable` type contract. Without it, `.from('table_name')` returns `never` for the Relation type, making `.insert()` and `.upsert()` accept only `never`.
- **Fix:** Added `Relationships: []` to all 10 table definitions in `lib/types/database.ts`
- **Files modified:** lib/types/database.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 09f6b3c (Task 1 commit)

**2. [Rule 1 - Bug] Fixed type assertions in schedule.ts**
- **Found during:** Task 1 (TypeScript verification revealed pre-existing errors)
- **Issue:** `lib/actions/schedule.ts` had identical issue with `.single()` returning `never` for profile/doctorProfile queries - same root cause as deviation 1
- **Fix:** Added explicit type casts `as { data: { role: string } | null }` and `as { data: { id: string } | null }` on affected queries
- **Files modified:** lib/actions/schedule.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 09f6b3c (Task 1 commit, bundled with database types fix)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes required for correctness (TypeScript would not compile without them). Root cause was same: Supabase v2.95 requires Relationships field on GenericTable. No scope creep.

## Issues Encountered
- Supabase v2.95 `GenericTable` contract now requires `Relationships: GenericRelationship[]` on all table types. Manually-maintained Database types were written without this field. Fix was straightforward: add `Relationships: []` to each table.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Slot generation and appointment CRUD logic is complete
- `bookAppointment`, `cancelAppointment`, `getAvailableSlots`, `getAppointments` ready for UI consumption in Plans 03-04 and 03-05
- TypeScript compiles clean; all actions validate auth, role, and input before touching DB
- No blockers for next plan

---
*Phase: 03-appointments-scheduling*
*Completed: 2026-02-10*

## Self-Check: PASSED
