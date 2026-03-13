---
phase: 04-medical-records-prescriptions
plan: 04
subsystem: ui
tags: [react-hook-form, useFieldArray, zod, shadcn-ui, next-intl, rtl, print-css, dialog, date-fns]

# Dependency graph
requires:
  - phase: 04-02
    provides: createVisitRecord, updateVisitRecord, createPrescription server actions
  - phase: 04-03
    provides: Patient profile tabs with visits/prescriptions/files placeholder content
provides:
  - Visit form (create/edit) with date + notes-only textarea and optional appointment link
  - Visit card displaying visit record with edit dialog and add-prescription dialog
  - Visit list with chronological ordering, empty state, and new-visit dialog
  - Prescription form with dynamic medication rows via useFieldArray
  - Prescription card displaying grouped medications with print trigger
  - Prescription list grouped by visit
  - Printable A4 RTL prescription layout with clinic header, patient info, medication table, signature
  - Print CSS: @media print rules isolating .prescription-print
affects:
  - 04-05 (files tab already wired; visits data available for linking files to visits)
  - 05-xx (patient-facing records view has placeholder page)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useFieldArray from react-hook-form for dynamic medication rows with append/remove
    - zodResolver validates multi-item array schemas client-side
    - Dialog pattern for all create/edit actions (no page navigation needed)
    - PrescriptionPrint uses inline styles for print fidelity (CSS vars not reliable in print)
    - window.print() triggered from client component; @media print isolates .prescription-print
    - canPrescribe prop pattern: doctor gets true, secretary gets false

key-files:
  created:
    - components/medical-records/visit-form.tsx
    - components/medical-records/visit-card.tsx
    - components/medical-records/visit-list.tsx
    - components/prescriptions/prescription-form.tsx
    - components/prescriptions/prescription-card.tsx
    - components/prescriptions/prescription-list.tsx
    - components/prescriptions/prescription-print.tsx
    - app/[locale]/patient/records/page.tsx
  modified:
    - app/[locale]/doctor/patients/[id]/page.tsx
    - app/[locale]/secretary/patients/[id]/page.tsx
    - app/globals.css

key-decisions:
  - "canPrescribe prop on VisitList/VisitCard: true for doctor, false for secretary — controls Add Prescription button visibility"
  - "Prescription form uses react-hook-form + zodResolver (not FormData) because useFieldArray requires controlled form state"
  - "PrescriptionPrint uses inline styles (not Tailwind classes) for print layout — CSS custom properties not reliable in print media"
  - "PrescriptionList receives visits array (not flat prescriptions) — groups by filtering visits with prescriptions.length > 0"
  - "Empty patient/records page stub fixed to resolve TypeScript build error from Next.js type generation"

patterns-established:
  - "Dialog-first for create/edit: no route-change needed, all mutations in Dialog components"
  - "Client components use useTransition for async server action calls with loading state"
  - "Prescription grouping: query medical_records with prescriptions(*) at page level, pass visits[] to list components"

# Metrics
duration: 5min
completed: 2026-02-13
---

# Phase 4 Plan 04: Visit Records and Prescriptions UI Summary

**Visit form/card/list with Dialog-based create/edit, prescription form with useFieldArray dynamic rows, A4 RTL printable prescription layout with clinic branding, all wired into patient profile tabs for doctor and secretary**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-13T16:07:44Z
- **Completed:** 2026-02-13T16:12:51Z
- **Tasks:** 2
- **Files modified:** 11 created/modified

## Accomplishments

- VisitForm handles both create (patient_id + date + notes + optional appointment) and edit (record_id + date + notes) modes via a single component
- VisitCard opens edit dialog inline and exposes "Add Prescription" button that opens PrescriptionForm dialog (hidden for secretary via canPrescribe=false)
- VisitList sorts visits newest-first and shows empty state with ClipboardList icon
- PrescriptionForm uses useFieldArray for dynamic add/remove medication rows with per-row validation via zodResolver
- PrescriptionPrint renders A4 RTL clinic header (name, doctor, specialty, phone, address), patient name + date, medication table with alternating row colors, and signature area
- @media print CSS hides all body content and shows only .prescription-print element
- Prescriptions tab in both doctor and secretary profiles shows PrescriptionList grouped by visit
- Empty `app/[locale]/patient/records/page.tsx` blocking TypeScript build fixed with valid stub

## Task Commits

Each task was committed atomically:

1. **Task 1: Create visit record components and wire into patient profile** - `fdbd835` (feat)
2. **Task 2: Create prescription components with printable layout and print CSS** - `59af307` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `components/medical-records/visit-form.tsx` - Create/edit visit record form with date, notes textarea, optional appointment Select
- `components/medical-records/visit-card.tsx` - Visit card with edit Dialog and add-prescription Dialog (canPrescribe gate)
- `components/medical-records/visit-list.tsx` - Chronological visit list with new-visit Dialog and empty state
- `components/prescriptions/prescription-form.tsx` - Multi-medication form using useFieldArray + zodResolver
- `components/prescriptions/prescription-card.tsx` - Medication group display card with print dialog trigger
- `components/prescriptions/prescription-list.tsx` - Groups visits by prescription existence, renders PrescriptionCard per group
- `components/prescriptions/prescription-print.tsx` - A4 RTL printable layout; inline styles for print fidelity
- `app/[locale]/doctor/patients/[id]/page.tsx` - Wired VisitList, PrescriptionList, FileUpload, FileList into tabs
- `app/[locale]/secretary/patients/[id]/page.tsx` - Wired VisitList, PrescriptionList, FileUpload, FileList into tabs
- `app/globals.css` - Added @media print rules for prescription-print isolation and @page A4 portrait
- `app/[locale]/patient/records/page.tsx` - Fixed empty module causing Next.js TypeScript type generation failure

## Decisions Made

- **canPrescribe prop pattern:** Doctor profile page passes `canPrescribe={true}`, secretary passes `canPrescribe={false}`. Hides the "Add Prescription" button on VisitCard for secretary users. The secretary can still view prescriptions but cannot create them.

- **react-hook-form for prescription form (not FormData):** The `createPrescription` server action takes a plain JS object `{ medical_record_id, patient_id, medications[] }` rather than FormData. This allows useFieldArray to manage the dynamic medication rows naturally. FormData can't represent nested arrays without serialization.

- **Inline styles in PrescriptionPrint:** Tailwind CSS custom properties (`--color-*`) are resolved by the browser's CSS engine and may not be honored in print media on all browsers. Inline styles with literal hex/px values guarantee consistent print rendering across Chrome, Firefox, and Safari.

- **PrescriptionList receives `visits[]` not flat prescriptions:** The query `medical_records.select('*, prescriptions(*)')` already groups prescriptions under their visit. Passing this to PrescriptionList avoids N+1 data joins and keeps component props simple.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed empty `app/[locale]/patient/records/page.tsx` causing TypeScript build failure**
- **Found during:** Task 2 (running pnpm build for verification)
- **Issue:** The file existed but was completely empty (0 bytes). Next.js type generation emits `import * as entry from 'page.js'` for every page route — importing an empty module is a TypeScript error: "File is not a module"
- **Fix:** Added a valid placeholder Server Component exporting a default async function with heading and Supabase client init
- **Files modified:** `app/[locale]/patient/records/page.tsx`
- **Verification:** `pnpm build` passes after fix
- **Committed in:** `59af307` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for build to pass. The patient/records page was already untracked (Plan 05 scope) but needed a valid module stub.

## Issues Encountered

None beyond the auto-fixed build blocker. Build passed clean on first attempt after fixing the empty page.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Visit records: doctor and secretary can create/edit notes-only visit records via Dialog
- Prescriptions: doctor can add multi-medication prescriptions via Dialog on VisitCard
- Printable prescription opens in Dialog with print button calling window.print()
- Files tab already wired in both doctor and secretary profile pages (Plan 04-05 work can focus on file-specific functionality)
- `patient/records` page stub ready for patient-facing view (Phase 5/6)
- All 4 tabs in patient profile are populated: info (PatientInfoForm), visits (VisitList), prescriptions (PrescriptionList), files (FileUpload + FileList)

---
*Phase: 04-medical-records-prescriptions*
*Completed: 2026-02-13*

## Self-Check: PASSED
