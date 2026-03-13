---
phase: 05-pregnancy-tracking
plan: 02
subsystem: ui
tags: [react, next.js, shadcn/ui, react-hook-form, zod, date-fns, next-intl, typescript]

# Dependency graph
requires:
  - phase: 05-01
    provides: createPregnancy, addMeasurement, updatePregnancyStatus server actions; getGestationalWeek, getDaysUntilDue utilities; Pregnancy/PregnancyMeasurement types; bilingual i18n keys
  - phase: 04-medical-records-prescriptions
    provides: doctor patient profile page (app/[locale]/doctor/patients/[id]/page.tsx) with 4-tab pattern to extend
provides:
  - 5 pregnancy client components in components/pregnancy/
  - Doctor patient profile page extended to 5 tabs with pregnancy management tab
  - Full PREG-01 and PREG-02 clinical workflows (create pregnancy, add measurements, update status)
affects: [05-03-pregnancy-dashboard, future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - All-string Zod schema for react-hook-form with optional numeric HTML inputs (avoids zodResolver type mismatch with z.preprocess/z.union([z.coerce.number(), z.literal('')]))
    - Status badge coloring via className overrides on Badge variant="outline" (green/blue/red)
    - Nested Supabase relationship data sorted in JS after fetch (measured_at desc) — Supabase doesn't support nested .order()

key-files:
  created:
    - components/pregnancy/pregnancy-form.tsx
    - components/pregnancy/measurement-form.tsx
    - components/pregnancy/measurement-list.tsx
    - components/pregnancy/pregnancy-card.tsx
    - components/pregnancy/pregnancy-list.tsx
  modified:
    - app/[locale]/doctor/patients/[id]/page.tsx

key-decisions:
  - "All-string Zod schema for react-hook-form handles optional numeric inputs without zodResolver type mismatch — refine() validates range, onSubmit passes strings to FormData (server action handles coerce)"
  - "Pregnancy measurements sorted by measured_at desc in JS after Supabase fetch — no nested .order() needed"
  - "Status badge uses Badge variant=outline with className color overrides (not variant prop) — gives full color control"

patterns-established:
  - "All-string form schema: use z.string().refine() for optional numeric fields in react-hook-form when zodResolver incompatibility would arise from z.coerce/z.preprocess"

# Metrics
duration: 15min
completed: 2026-02-15
---

# Phase 5 Plan 2: Pregnancy UI Components Summary

**Five doctor-facing pregnancy components (list/card/form/measurement-form/measurement-list) integrated as 5th tab on doctor patient profile, enabling full PREG-01 (record pregnancy with LMP) and PREG-02 (add per-visit measurements) workflows**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-15T15:00:00Z
- **Completed:** 2026-02-15T15:15:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Built 5 client components covering the complete pregnancy management workflow: create pregnancy, view with gestational week + days until due, update status, add measurements, view measurement history
- Fixed TypeScript errors from previous partial execution (zodResolver type mismatch in measurement-form.tsx)
- Extended doctor patient profile from 4 to 5 tabs with pregnancy tab showing PregnancyList

## Task Commits

Each task was committed atomically:

1. **Task 1: Pregnancy components (list, card, forms, measurement list)** - `5ae38ad` (feat)
2. **Task 2: Integrate pregnancy tab into doctor patient profile page** - `11703e6` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `components/pregnancy/pregnancy-form.tsx` - Dialog form to create pregnancy (LMP date + notes), calls createPregnancy server action
- `components/pregnancy/measurement-form.tsx` - Dialog form for per-visit measurements (date/week/weight/BP/heartbeat/notes), calls addMeasurement server action; uses all-string Zod schema to avoid zodResolver type mismatch
- `components/pregnancy/measurement-list.tsx` - Read-only table of measurements, sorted by date desc, with empty state
- `components/pregnancy/pregnancy-card.tsx` - Card with status badge (color-coded), LMP/EDD dates, gestational week (from getGestationalWeek), days until due, status update Select, MeasurementForm trigger, MeasurementList
- `components/pregnancy/pregnancy-list.tsx` - Container listing all pregnancies with Add Pregnancy button (PregnancyForm) and empty state icon
- `app/[locale]/doctor/patients/[id]/page.tsx` - Added pregnancies fetch with pregnancy_measurements(*), grid-cols-5, pregnancy TabsTrigger and TabsContent with PregnancyList

## Decisions Made

- **All-string Zod schema for optional numeric inputs:** `z.preprocess` and `z.union([z.coerce.number(), z.literal('')])` both cause `unknown` type inference in zodResolver, breaking TypeScript. Solution: use `z.string().refine()` for validation, keep all form values as strings, pass string values to FormData (server action handles coerce via its own Zod schema).
- **Measurements sorted in JS:** Supabase `.select('*, pregnancy_measurements(*)')` doesn't support nested `.order()`. Sort `pregnancy_measurements` by `measured_at` descending after fetching, both in the page.tsx data fetch and in MeasurementList component.
- **Status badge via className:** Used `Badge variant="outline"` with `className` for green/blue/red coloring rather than variant prop — gives full Tailwind color control without shadcn variant overrides.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in measurement-form.tsx from previous partial execution**

- **Found during:** Task 1 (pregnancy components assessment)
- **Issue:** `z.union([z.coerce.number(), z.literal('')]).optional()` and `z.preprocess(...)` both cause `unknown` type inference when used with zodResolver — TypeScript error: Resolver type parameters incompatible
- **Fix:** Rewrote measurement-form.tsx schema to use all-string fields with `z.string().refine()` for optional numeric validation. onSubmit passes string values to FormData; the server action's own Zod schema handles numeric coercion.
- **Files modified:** `components/pregnancy/measurement-form.tsx`
- **Verification:** `tsc --noEmit` passes with zero errors after fix
- **Committed in:** `5ae38ad` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug from partial previous execution)
**Impact on plan:** Fix was necessary for TypeScript compilation. No scope creep. All planned functionality delivered as specified.

## Issues Encountered

- Previous executor left partial work: 5 component files existed but were untracked in git, with TypeScript errors in measurement-form.tsx. Assessed all files, fixed the TypeScript issue, then committed cleanly.
- pregnancy-timeline.tsx and due-date-alert.tsx (plan 03 files) were also in the untracked components/pregnancy/ directory — these were inadvertently included in the Task 1 commit since git staged the directory. They are plan 03 work committed early but functionally correct.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All pregnancy UI components are complete and type-safe
- Doctor patient profile has the pregnancy tab fully wired to PregnancyList
- Plan 03 (pregnancy dashboard widget) can proceed — due-date-alert.tsx and pregnancy-timeline.tsx already partially exist from previous partial execution
- No blockers for plan 03

---
*Phase: 05-pregnancy-tracking*
*Completed: 2026-02-15*

## Self-Check: PASSED
