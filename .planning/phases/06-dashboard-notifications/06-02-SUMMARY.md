---
phase: 06-dashboard-notifications
plan: 02
subsystem: ui
tags: [dashboard, supabase, server-action, shadcn, date-fns, next-intl, use-debounce, rtl, autocomplete]

# Dependency graph
requires:
  - phase: 06-01
    provides: shadcn Command component, i18n keys (todayAppointments, totalPatients, approachingDueDate, searchPatients, etc.)
  - phase: 05-pregnancy-tracking
    provides: DueDateAlert component, getDaysUntilDue utility, pregnancies table with expected_due_date
  - phase: 04-medical-records-prescriptions
    provides: searchPatients action (patients!inner join pattern), profiles table
  - phase: 03-appointments-scheduling
    provides: appointments table with patient_id, scheduled_start, appointment_type, status
provides:
  - lib/actions/dashboard.ts — getDayAppointments server action with auth, date-range query, status filter
  - components/dashboard/stat-card.tsx — reusable server component stat card (icon/label/value)
  - components/dashboard/appointment-day-list.tsx — client component with day navigation, per-day appointment list
  - components/dashboard/patient-autocomplete.tsx — client component with 300ms debounced autocomplete search
  - app/[locale]/doctor/dashboard/page.tsx — fully rebuilt doctor dashboard with stat cards, search, two-column layout
affects:
  - 06-03 (email integration plan — dashboard page already wired; revalidatePath('/doctor/dashboard') in appointment actions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - as-unknown-as cast pattern for Supabase profiles join — Relationships[] in manual Database type prevents type inference for !foreign-key hint joins; cast query result to unknown then to typed interface
    - Promise.all parallel data fetching — all dashboard queries run concurrently (appointments, patient count, pregnancy count, pregnancy data)
    - RTL-aware chevron direction — isAr conditional renders ChevronRight for prev and ChevronLeft for next in Arabic locale
    - useDebouncedCallback 300ms for search — prevents excessive server action calls on rapid keystrokes

key-files:
  created:
    - lib/actions/dashboard.ts
    - components/dashboard/stat-card.tsx
    - components/dashboard/appointment-day-list.tsx
    - components/dashboard/patient-autocomplete.tsx
  modified:
    - app/[locale]/doctor/dashboard/page.tsx

key-decisions:
  - "as unknown as cast bypasses Supabase SelectQueryError for profiles!appointments_patient_id_fkey join — Relationships: [] in manual Database type prevents type resolution"
  - "Dashboard page uses Promise.all for 4 parallel queries: today appointments, patient count, pregnancy count, pregnancy data for DueDateAlert"
  - "AppointmentDayList uses RTL-aware chevron icons (locale check) — ChevronRight for prev and ChevronLeft for next in Arabic"
  - "AppointmentDayList normalises Supabase joined patient field — handles both array and object return shapes"
  - "PatientAutocomplete uses Popover open state gated by results.length > 0 — avoids empty dropdown flash"

patterns-established:
  - "Supabase join type bypass: (query) as unknown as Promise<{data: TypedRow[], error: ...}> for unresolved !foreign-key joins"
  - "Day navigation pattern: loadDay(newDate) sets loading state, calls getDayAppointments, updates appointments state"

# Metrics
duration: 4min
completed: 2026-02-16
---

# Phase 6 Plan 02: Doctor Dashboard UI Summary

**Doctor dashboard rebuilt with 3 stat cards (today/patients/due), RTL-aware day-navigable appointment list via getDayAppointments server action, debounced patient autocomplete search, and two-column layout with DueDateAlert sidebar**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-16T01:50:02Z
- **Completed:** 2026-02-16T01:53:56Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `getDayAppointments` server action filtering by status in (scheduled, confirmed), ordered ascending by scheduled_start, with auth check and profiles join normalisation
- Built `StatCard` server component (icon + value text-2xl + label text-xs) and `PatientAutocomplete` client component with 300ms debounce, Popover+Command dropdown, navigates to /doctor/patients/{id}
- Built `AppointmentDayList` client component with prev/next day navigation, chronological list (time + name + type badge), each row links to patient profile, RTL-aware chevron icons
- Rebuilt `DoctorDashboard` page with force-dynamic, Promise.all parallel fetching, 3 StatCards, PatientAutocomplete, two-column layout (AppointmentDayList 2/3 + DueDateAlert 1/3)
- Applied as-unknown-as cast pattern to resolve Supabase type inference failure for profiles!appointments_patient_id_fkey join

## Task Commits

Each task was committed atomically:

1. **Task 1: Dashboard server action, stat card, patient autocomplete** - `ad96eb4` (feat)
2. **Task 2: Appointment day list component and rebuilt dashboard page** - `4e7ac12` (feat, in 06-03 commit)

## Files Created/Modified
- `lib/actions/dashboard.ts` — getDayAppointments: auth check, date range from 'yyyy-MM-dd', status filter in (scheduled, confirmed), ascending order, profiles join via as-unknown-as cast
- `components/dashboard/stat-card.tsx` — server component, Card layout, icon text-muted-foreground, value text-2xl font-bold, label text-xs text-muted-foreground
- `components/dashboard/appointment-day-list.tsx` — 'use client', parseISO for initial date, subDays/addDays navigation, loadDay calls getDayAppointments, RTL chevron direction via useLocale, appointment rows with time/name/badge linked to patient profile
- `components/dashboard/patient-autocomplete.tsx` — 'use client', useDebouncedCallback 300ms, searchPatients(value, 1, 8), Popover+Command dropdown, open gated by results.length > 0, router.push to patient profile
- `app/[locale]/doctor/dashboard/page.tsx` — force-dynamic export, Promise.all for 4 queries, as-unknown-as for appointments join, 3 StatCards, PatientAutocomplete, lg:grid-cols-3 two-column layout

## Decisions Made
- **as-unknown-as cast for Supabase joins:** The `profiles!appointments_patient_id_fkey` join alias cannot be resolved by Supabase type inference because our manual Database type has `Relationships: []`. Applied `(query) as unknown as Promise<{data: RawRow[], error: ...}>` pattern in both `dashboard.ts` and the dashboard page. Same pattern as in Phase 4 actions.
- **Promise.all for 4 parallel queries:** All dashboard data (today appointments, patient count, pregnancy count, pregnancy details for alerts) fetched in parallel. Profile name lookup for DueDateAlert runs after since it depends on patient IDs from the pregnancy query.
- **RTL-aware chevrons:** `useLocale()` from next-intl determines if Arabic, then renders ChevronRight for previous and ChevronLeft for next (opposite of LTR) so arrows visually point the correct direction in both RTL and LTR layouts.
- **Popover open gated by results:** `open && results.length > 0` prevents empty Command dropdown from flashing on focus before search results arrive.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase TypeScript type inference failure for profiles join**
- **Found during:** Task 1 (dashboard.ts) and Task 2 (dashboard page)
- **Issue:** `SelectQueryError<"could not find the relation between appointments and profiles">` from Supabase type system — our manual `Database` type has `Relationships: []` on all tables so the `!foreign-key-hint` join syntax cannot be type-resolved. TypeScript refused the cast without going through `unknown`.
- **Fix:** Used `(query) as unknown as Promise<{data: TypedRow[], error: ...}>` pattern — identical to how Phase 4 actions handle the same constraint. Runtime query is correct; only the TS type layer needs the cast.
- **Files modified:** lib/actions/dashboard.ts, app/[locale]/doctor/dashboard/page.tsx
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** `ad96eb4` (Task 1), `4e7ac12` (Task 2)

---

**Total deviations:** 1 auto-fixed (1 bug — TypeScript type casting)
**Impact on plan:** Required fix for TypeScript compilation. Identical runtime behavior; no scope creep. Pattern already established in Phase 4.

## Issues Encountered
- Task 2 files (`appointment-day-list.tsx`, dashboard `page.tsx`) were committed in the same commit as 06-03 email integration (`4e7ac12`) during a prior session that ran ahead. The files match the 06-02 plan specification exactly. TypeScript compilation confirmed correct.

## User Setup Required
None — all components are pure frontend/Supabase queries. No new packages installed.

## Next Phase Readiness
- Doctor dashboard fully functional: stat cards, day-navigable appointments, patient autocomplete, due-date alerts sidebar
- DASH-01 satisfied: Doctor sees today's appointments on login
- DASH-02 satisfied: Dashboard shows urgent due-date alerts with urgency colors
- DASH-03 satisfied: Quick patient search with autocomplete navigation
- 06-03 (email integration) already complete per git history

---
*Phase: 06-dashboard-notifications*
*Completed: 2026-02-16*

## Self-Check: PASSED
