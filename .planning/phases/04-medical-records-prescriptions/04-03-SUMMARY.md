---
phase: 04-medical-records-prescriptions
plan: 03
subsystem: ui
tags: [next-intl, shadcn-ui, use-debounce, supabase, rtl, search, pagination, tabs]

# Dependency graph
requires:
  - phase: 04-02
    provides: searchPatients and updatePatientInfo server actions in lib/actions/patients.ts
provides:
  - Patient list pages with debounced search (doctor and secretary)
  - Patient card grid with pagination
  - Patient profile page with 4-tab layout (info/visits/prescriptions/files)
  - PatientInfoForm with view/edit toggle calling updatePatientInfo
affects:
  - 04-04 (will populate visits and prescriptions tab content)
  - 04-05 (will populate files tab content)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server pages pass translated labels as props to client list components
    - PatientCard uses next/link (not i18n Link) for dynamic ID-based hrefs
    - Supabase nested join returns array or object — normalize with Array.isArray check
    - PatientInfoForm controlled select (blood type) uses React state alongside FormData
    - _prefixed variables for fetched data not yet wired into UI (reserved for future plans)

key-files:
  created:
    - components/patients/patient-search.tsx
    - components/patients/patient-card.tsx
    - components/patients/patient-list.tsx
    - components/patients/patient-info-form.tsx
    - app/[locale]/doctor/patients/page.tsx
    - app/[locale]/doctor/patients/[id]/page.tsx
    - app/[locale]/secretary/patients/page.tsx
    - app/[locale]/secretary/patients/[id]/page.tsx
  modified: []

key-decisions:
  - "PatientCard uses next/link instead of i18n Link — dynamic ID paths cause TypeScript errors with next-intl typed routing"
  - "Supabase join on patients table normalizes result as Array.isArray check in both card and profile pages"
  - "PatientInfoForm uses controlled React state for blood type Select (not hidden input) to pass via FormData"
  - "_patientFiles prefixed to suppress unused-var warning — data fetched now, wired in Plan 05"

patterns-established:
  - "Server page fetches data + passes translated labels as props to client PatientList/PatientSearch"
  - "PatientCard: entire card wrapped in next/link for full-card click target"
  - "Profile pages fetch visit records and files at page level — tabs receive data as props for Plan 04/05 to wire"

# Metrics
duration: 44min
completed: 2026-02-11
---

# Phase 4 Plan 03: Patient List and Profile UI Summary

**Debounced patient search with card grid, URL-param pagination, and 4-tab profile page (info/visits/prescriptions/files) for both doctor and secretary roles**

## Performance

- **Duration:** 44 min
- **Started:** 2026-02-11T16:50:36Z
- **Completed:** 2026-02-11T17:34:40Z
- **Tasks:** 2
- **Files modified:** 8 created

## Accomplishments

- PatientSearch debounces input at 300ms and updates URL `query` + `page` params via `useDebouncedCallback`
- PatientList renders responsive card grid (1/2/3 cols) with Previous/Next pagination and empty state
- PatientCard displays Arabic name (primary), English name, phone (dir=ltr), DOB, blood type badge
- Doctor and secretary both get identical list pages wired to `searchPatients` server action
- Patient profile pages fetch profile, visit records, and files — render 4 tabs (info, visits, prescriptions, files)
- PatientInfoForm: view-mode displays all fields, edit-mode shows form inputs with controlled blood type select
- All components RTL-compatible using logical CSS properties (ps, ms, text-start)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create patient list components** - `3e29b1f` (feat)
2. **Task 2: Create patient list pages and profile pages with tabs** - `58f5d18` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `components/patients/patient-search.tsx` - Debounced search input updating URL params
- `components/patients/patient-card.tsx` - Patient card (name, phone, DOB, blood type)
- `components/patients/patient-list.tsx` - Responsive card grid with pagination controls
- `components/patients/patient-info-form.tsx` - View/edit form for patient demographics
- `app/[locale]/doctor/patients/page.tsx` - Doctor patient list page with search
- `app/[locale]/doctor/patients/[id]/page.tsx` - Doctor patient profile with 4 tabs
- `app/[locale]/secretary/patients/page.tsx` - Secretary patient list page with search
- `app/[locale]/secretary/patients/[id]/page.tsx` - Secretary patient profile with 4 tabs

## Decisions Made

- **next/link vs i18n Link for dynamic paths:** `PatientCard` uses `next/link` directly (not `@/i18n/routing`'s `Link`) because next-intl's typed Link has strict path constraints that cause TypeScript errors for dynamic ID-based paths like `/doctor/patients/${id}`. The path still renders correctly with locale prefix since the layout handles that.

- **Supabase join normalization:** When selecting `profiles.*, patients(*)` the `patients` field can be returned as an array (one-to-many semantics) or object (one-to-one after `.single()`). Both profile pages and PatientCard normalize with `Array.isArray(patient.patients) ? patient.patients[0] : patient.patients`.

- **Blood type as controlled state in form:** The ShadCN `Select` component doesn't emit a native form input, so `blood_type` is tracked in React state and manually injected into FormData before calling `updatePatientInfo`.

- **Pre-fetching files data:** Both profile pages fetch `patient_files` records now (prefixed `_patientFiles`) so Plan 05 only needs to wire the existing prop into tab content without refactoring the page query.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used next/link instead of i18n Link for dynamic patient ID paths**
- **Found during:** Task 1 (PatientCard implementation)
- **Issue:** `@/i18n/routing`'s `Link` is type-strict about paths — template literals like `` `/doctor/patients/${id}` `` cause TypeScript errors since they're not in the defined route set
- **Fix:** Used `import Link from 'next/link'` which accepts arbitrary string hrefs
- **Files modified:** `components/patients/patient-card.tsx`
- **Verification:** Build passes, links render with correct locale-prefixed paths
- **Committed in:** `3e29b1f` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug prevention)
**Impact on plan:** Necessary for TypeScript correctness. No scope creep.

## Issues Encountered

None — build passed on first attempt after fixing the Link type issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Patient list and search fully functional — doctors and secretaries can navigate to patients
- Profile page container ready with 4 tabs — Plan 04 (visits/prescriptions) and Plan 05 (files) just need to replace placeholder text with real components
- `visitRecords` and `_patientFiles` are already fetched at page level — future plans receive them as props
- No blockers for Phase 4 continuation

---
*Phase: 04-medical-records-prescriptions*
*Completed: 2026-02-11*

## Self-Check: PASSED
