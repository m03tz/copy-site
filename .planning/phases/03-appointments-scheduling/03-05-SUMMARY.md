---
phase: 03-appointments-scheduling
plan: 05
subsystem: ui
tags: [next.js, supabase, react, date-fns, tailwind, shadcn, i18n]

# Dependency graph
requires:
  - phase: 03-01
    provides: Database types (Appointment, AppointmentStatus, AppointmentType), translations for appointments namespace
  - phase: 03-03
    provides: Appointment server actions and Supabase integration patterns
  - phase: 03-04
    provides: StatusBadge component (components/appointments/status-badge.tsx)
provides:
  - Patient-facing read-only appointments page at /patient/appointments
  - Upcoming/past tab partitioning with appointment count badges
  - Appointment cards showing date, time, type, status, cancellation reason, notes
affects: [04-patient-records, 05-dashboard, future-patient-portal-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component fetching appointments via Supabase RLS (patient_id = user.id auto-filtered)
    - AppointmentList/AppointmentCard as inner server-side functions within a Server Component page
    - getTranslations passed as prop to inner functions (avoids repeated async calls)
    - RTL-compatible layout using text-start, logical CSS (gap, etc.)

key-files:
  created:
    - app/[locale]/patient/appointments/page.tsx
  modified: []

key-decisions:
  - "StatusBadge component already existed from plan 03-04 (parallel execution), used as-is"
  - "TranslationFunction type alias used for passing t function to inner components"
  - "Upcoming filter: scheduled_start > now AND status != cancelled; Past: scheduled_start <= now OR status is completed/cancelled"

patterns-established:
  - "Patient pages are Server Components that redirect unauthenticated users to /login"
  - "Supabase RLS enforces patient data isolation — no additional filter needed beyond patient_id eq"
  - "Inner server component functions (not exported) accept typed t prop instead of calling getTranslations"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 3 Plan 05: Patient Appointments View Summary

**Read-only patient appointments page with upcoming/past tabs, Supabase RLS data isolation, date-fns formatting, and StatusBadge status display**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-10T20:51:01Z
- **Completed:** 2026-02-10T20:52:45Z
- **Tasks:** 1/1
- **Files created:** 1

## Accomplishments

- Patient appointments page at `/patient/appointments` querying `appointments` table filtered by `patient_id = auth.uid()` via Supabase RLS
- Upcoming tab shows appointments where `scheduled_start > now` and `status != cancelled`
- Past tab shows appointments where `scheduled_start <= now` or status is `completed` or `cancelled`
- Each appointment card displays formatted date/time, appointment type (translated), StatusBadge, cancellation reason, and notes
- No action buttons - page is fully read-only per project patient-is-read-only decision

## Task Commits

Each task was committed atomically:

1. **Task 1: Create patient appointments view page** - `a4173a3` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `app/[locale]/patient/appointments/page.tsx` - Server Component page with upcoming/past tab appointment view (153 lines)

## Decisions Made

- StatusBadge from 03-04 was already present (parallel plan execution); used as-is with `status` prop — it handles its own translations via `useTranslations`
- Used `getTranslations` return type alias `TranslationFunction` to type the `t` parameter in inner functions, avoiding repeated async calls
- Upcoming filter uses both date check AND status check to properly exclude cancelled future appointments from upcoming list

## Deviations from Plan

None - plan executed exactly as written. StatusBadge component existed from 03-04 as expected by the plan note.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Patient appointments view complete and read-only
- StatusBadge shared component available for other appointment views (doctor/secretary)
- Ready for Phase 4 (Patient Records) or any remaining Phase 3 plans

## Self-Check: PASSED

---
*Phase: 03-appointments-scheduling*
*Completed: 2026-02-10*
