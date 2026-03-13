---
phase: 05-pregnancy-tracking
plan: 03
subsystem: ui
tags: [next-intl, supabase, react, tailwind, shadcn-ui, lucide-react, pregnancy, dashboard]

# Dependency graph
requires:
  - phase: 05-01
    provides: "Pregnancy server actions, utility functions (getGestationalWeek, getDaysUntilDue), i18n keys for pregnancy namespace"
  - phase: 05-02
    provides: "Pregnancy UI components (pregnancy-form, measurement-form, pregnancy-card, pregnancy-list) committed via parallel executor"
provides:
  - "Patient-facing pregnancy timeline page at /patient/pregnancy (read-only, Server Component)"
  - "PregnancyTimeline client component with gestational week, progress bar, measurement history"
  - "Patient sidebar nav link to pregnancy page (myPregnancy translation key)"
  - "DueDateAlert client component for doctor dashboard with color-coded urgency"
  - "Doctor dashboard updated with real due-date alerts (replaces placeholder)"
affects: [phase-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next/link (not i18n Link) for dynamic paths like /doctor/patients/{id}"
    - "Server Component de-duplication via Map before passing to client components"
    - "Date range filter in Supabase query (.gte + .lte) for due-date window"
    - "Inline JS sort for nested measurements (measured_at descending)"

key-files:
  created:
    - app/[locale]/patient/pregnancy/page.tsx
    - components/pregnancy/pregnancy-timeline.tsx
    - components/pregnancy/due-date-alert.tsx
  modified:
    - app/[locale]/patient/layout.tsx
    - app/[locale]/doctor/dashboard/page.tsx

key-decisions:
  - "Patient pregnancy page is fully read-only — no form elements, no action buttons, pregnancy.notes not displayed (clinical notes hidden from patients per research recommendation)"
  - "Dashboard uses Map keyed by patient_id to de-duplicate patients with multiple approaching-due pregnancies, keeping the earliest due date"
  - "DueDateAlert urgency color coding: 0-3 days = destructive (red), 4-7 days = default, 8-14 days = secondary"
  - "Task 1 files were committed by parallel 05-02 executor; Task 2 committed by this plan"

patterns-established:
  - "Patient read-only portal pattern: Server Component fetches data, passes to Client Component for display — no write operations in patient pages"
  - "Dashboard alert de-duplication via Map<patient_id, ...> before rendering"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Phase 5 Plan 03: Patient Pregnancy Timeline and Doctor Dashboard Alerts Summary

**Patient pregnancy timeline page (read-only, Server Component) and doctor dashboard due-date alerts with Map-based patient de-duplication**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-15T15:04:46Z
- **Completed:** 2026-02-15T15:09:27Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Patient can navigate to /patient/pregnancy from sidebar and view their pregnancy history with gestational week, due date progress bar, and measurement table — completely read-only
- Doctor dashboard now shows real approaching-due-date alerts instead of placeholder, de-duplicated by patient with urgency-based color coding (red/amber/green)
- DueDateAlert links each patient row to /doctor/patients/{id} via next/link for quick access to patient profile

## Task Commits

Each task was committed atomically:

1. **Task 1: Patient pregnancy timeline page and nav link** — `5ae38ad` (feat — committed by parallel 05-02 executor)
2. **Task 2: Doctor dashboard due-date alerts** — `0092592` (feat)

## Files Created/Modified

- `components/pregnancy/pregnancy-timeline.tsx` — Client Component; displays pregnancies with gestational week, progress bar, measurement history table; no notes field, fully read-only
- `app/[locale]/patient/pregnancy/page.tsx` — Server Component; auth check, fetches pregnancies with measurements for current user, passes to PregnancyTimeline
- `app/[locale]/patient/layout.tsx` — Added `{ href: '/patient/pregnancy', label: t('myPregnancy') }` to navItems
- `components/pregnancy/due-date-alert.tsx` — Client Component; shows approaching-due patients with urgency badges (0-3=red, 4-7=default, 8-14=secondary), links to patient profiles
- `app/[locale]/doctor/dashboard/page.tsx` — Replaced placeholder with real data: fetches active pregnancies due within 14 days, separately fetches profile names, de-duplicates by patient_id via Map, renders DueDateAlert

## Decisions Made

- pregnancy.notes not shown to patients — clinical notes are for doctor use only (per Phase 5 research)
- Dashboard de-duplication uses Map<patient_id> keeping the earliest (fewest days remaining) due date per patient when a patient has multiple active pregnancies
- DueDateAlert uses next/link (not next-intl Link) for dynamic `/doctor/patients/{id}` paths — consistent with NEW (04-03) decision
- Task 1 files were committed by the parallel 05-02 executor before this plan ran; this plan committed only Task 2 files

## Deviations from Plan

None — plan executed exactly as written. Task 1 files were already committed by the parallel 05-02 executor as noted in context.

## Issues Encountered

The parallel 05-02 executor had already committed all Task 1 files (`pregnancy-timeline.tsx`, `patient/pregnancy/page.tsx`, `patient/layout.tsx`) before this plan ran. Files were verified to match plan requirements and TypeScript compiled cleanly. Only Task 2 files required creation/modification in this execution.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 5 (Pregnancy Tracking) is complete: foundation (05-01), UI components for doctor portal (05-02), and patient/dashboard pages (05-03)
- Phase 6 can use `getDaysUntilDue`, `getGestationalWeek`, `isApproachingDueDate` from lib/utils/pregnancy
- Doctor dashboard only shows pregnancy alerts; Phase 6 may add today's appointments section
- No blockers for Phase 6

---
*Phase: 05-pregnancy-tracking*
*Completed: 2026-02-15*

## Self-Check: PASSED
