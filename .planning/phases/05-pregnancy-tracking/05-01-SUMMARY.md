---
phase: 05-pregnancy-tracking
plan: 01
subsystem: api
tags: [supabase, zod, typescript, i18n, next-intl, server-actions]

# Dependency graph
requires:
  - phase: 04-medical-records-prescriptions
    provides: medical-records.ts pattern for server actions (getDoctorId, Zod schema, role check, revalidatePath)
  - phase: 03-appointments-scheduling
    provides: database types for pregnancies and pregnancy_measurements tables
provides:
  - lib/actions/pregnancies.ts — createPregnancy, updatePregnancyStatus, addMeasurement server actions
  - lib/utils/pregnancy.ts — getGestationalWeek, getDaysUntilDue, isApproachingDueDate pure utilities
  - messages/ar.json — pregnancy namespace + nav/dashboard/tabs keys in Arabic
  - messages/en.json — pregnancy namespace + nav/dashboard/tabs keys in English
affects:
  - 05-02 (pregnancy UI components will import these actions and utilities)
  - 05-03 (patient pregnancy tab will use these actions and translations)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Doctor-only role check pattern (profile.role === 'doctor' only, not secretary)"
    - "Empty-string-to-undefined conversion for optional numeric FormData fields before Zod coerce"
    - "Fetch parent row for revalidatePath before update/insert in dependent tables"

key-files:
  created:
    - lib/utils/pregnancy.ts
    - lib/actions/pregnancies.ts
  modified:
    - messages/ar.json
    - messages/en.json

key-decisions:
  - "gestational_week in measurements is doctor-entered, NOT auto-calculated from LMP date"
  - "blood_pressure is single TEXT field (e.g. '120/80'), not separate systolic/diastolic columns"
  - "expected_due_date excluded from all INSERT calls — GENERATED ALWAYS column in PostgreSQL"
  - "pregnancy server actions are doctor-only (not secretary), unlike medical-records which allow doctor|secretary"
  - "isApproachingDueDate window is 0-14 days inclusive (today through 14 days out)"

patterns-established:
  - "Pregnancy utilities: pure functions with no Supabase dependency — safe to call from any component"
  - "Optional numeric fields: raw string check (value && value !== '') before Zod to avoid coercing empty string to 0"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 5 Plan 01: Pregnancy Tracking Foundation Summary

**Pure gestational-age utilities (getGestationalWeek, getDaysUntilDue, isApproachingDueDate) and doctor-only server actions (createPregnancy, updatePregnancyStatus, addMeasurement) with full Arabic/English i18n pregnancy namespace**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-15T10:39:55Z
- **Completed:** 2026-02-15T10:43:18Z
- **Tasks:** 2 of 2
- **Files modified:** 4

## Accomplishments

- Three pure utility functions for pregnancy date math with null-safety (getGestationalWeek returns null for out-of-range values)
- Three doctor-only server actions following the established medical-records.ts pattern (Zod, getDoctorId helper, revalidatePath)
- Full Arabic and English i18n coverage: pregnancy namespace (form, status, measurements, timeline, actions), nav.myPregnancy, patients.profile.tabs.pregnancy, dashboard due-date alert keys

## Task Commits

Each task was committed atomically:

1. **Task 1: Pregnancy utility functions and server actions** - `4fc3530` (feat)
2. **Task 2: Bilingual i18n translations for pregnancy features** - `d369fdb` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `lib/utils/pregnancy.ts` - Three pure functions: getGestationalWeek (weeks from LMP, null if 0–42 violated), getDaysUntilDue (signed day count to due date), isApproachingDueDate (active + 0–14 days window)
- `lib/actions/pregnancies.ts` - createPregnancy, updatePregnancyStatus, addMeasurement server actions with doctor-only role check, Zod validation, and revalidatePath
- `messages/ar.json` - Added pregnancy namespace + nav.myPregnancy + patients.profile.tabs.pregnancy + 4 dashboard due-date keys
- `messages/en.json` - Same additions in English

## Decisions Made

- gestational_week in measurements is doctor-entered (not auto-calculated). The form accepts whatever week the doctor records.
- blood_pressure is a single TEXT field (e.g. "120/80") — database schema has no separate systolic/diastolic.
- expected_due_date is a GENERATED ALWAYS PostgreSQL column and must never appear in INSERT payloads.
- Pregnancy actions are doctor-only. Medical records allow secretary too; pregnancies are doctor-only per plan spec.
- isApproachingDueDate uses a 0–14 day inclusive window: 0 means due today (alert), 14 means two weeks out (still alerts).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled clean on first pass, JSON validation passed immediately.

## User Setup Required

None - no external service configuration required. The pregnancies and pregnancy_measurements tables already exist from Phase 3 database migration.

## Next Phase Readiness

- lib/actions/pregnancies.ts is ready for import by Phase 5 UI plans (05-02, 05-03)
- lib/utils/pregnancy.ts is ready for use in pregnancy timeline components
- Both i18n files have all keys needed for pregnancy UI components
- No blockers — database tables exist, types are defined in lib/types/database.ts

---
*Phase: 05-pregnancy-tracking*
*Completed: 2026-02-15*

## Self-Check: PASSED
