---
phase: 04-medical-records-prescriptions
plan: 01
subsystem: database
tags: [supabase, rls, typescript, i18n, next.js, use-debounce, migration]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Initial schema (00001_initial_schema.sql) with all tables, RLS, and get_user_role() helper
  - phase: 03-appointments-scheduling
    provides: Appointments table and RLS patterns used as reference for Phase 4 changes

provides:
  - SQL migration 00002_phase4_updates.sql adding medical_record_id to patient_files
  - RLS policies granting secretary SELECT/INSERT/UPDATE on medical_records
  - RLS policy granting doctor+secretary DELETE on patient_files (replacing doctor-only)
  - Storage RLS policy documentation as SQL comments for manual dashboard application
  - Updated TypeScript types with medical_record_id on patient_files Row/Insert/Update
  - next.config.ts serverActions.bodySizeLimit: 10mb for medical file uploads
  - use-debounce 10.1.0 installed for patient search
  - i18n translations for patients, visits, prescriptions, files namespaces (AR + EN)

affects:
  - 04-02: Server actions for medical records (needs secretary RLS and medical_record_id)
  - 04-03: Patient files server actions (needs delete RLS fix and medical_record_id)
  - 04-04: Patient profile UI (needs patients/visits/prescriptions/files i18n keys)
  - 04-05+: All Phase 4 UI components (need i18n namespaces)

# Tech tracking
tech-stack:
  added:
    - use-debounce 10.1.0
  patterns:
    - Migration numbering: 00002_ prefix follows 00001_initial_schema.sql sequential naming
    - RLS policy pattern: (SELECT get_user_role()) = 'secretary' for secretary-specific policies
    - RLS policy pattern: (SELECT get_user_role()) IN ('doctor', 'secretary') for shared access
    - Storage RLS: documented as SQL comments for manual Supabase Dashboard application

key-files:
  created:
    - supabase/migrations/00002_phase4_updates.sql
  modified:
    - lib/types/database.ts
    - next.config.ts
    - messages/ar.json
    - messages/en.json
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Secretary access to medical_records added via 3 separate policies (SELECT/INSERT/UPDATE) not ALL to avoid granting DELETE"
  - "Storage RLS documented as comments not executed SQL since bucket creation requires Dashboard/CLI"
  - "bodySizeLimit set to 10mb string value (Next.js format, not bytes)"
  - "use-debounce 10.1.0 installed (latest stable) for patient search performance"

patterns-established:
  - "Phase 4 i18n: patients/visits/prescriptions/files are top-level namespaces alongside appointments"
  - "Print prescription keys nested under prescriptions.print for printable prescription layout"
  - "Profile tabs use patients.profile.tabs.* pattern for patient detail page navigation"

# Metrics
duration: 30min
completed: 2026-02-11
---

# Phase 4 Plan 01: Foundation Summary

**SQL migration granting secretary access to medical_records + patient_files delete, medical_record_id FK column, 10MB upload config, use-debounce, and complete Phase 4 i18n (AR + EN)**

## Performance

- **Duration:** 30 min
- **Started:** 2026-02-11T15:57:51Z
- **Completed:** 2026-02-11T16:28:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- SQL migration 00002 adds medical_record_id to patient_files, fixes 3 secretary RLS gaps on medical_records, updates patient_files delete policy to include secretary, and documents storage RLS as SQL comments
- TypeScript database types updated to include medical_record_id (string | null) on patient_files Row/Insert/Update — project compiles cleanly
- Next.js serverActions.bodySizeLimit set to 10mb, use-debounce 10.1.0 installed, both AR and EN translation files now have patients/visits/prescriptions/files namespaces with complete clinical terminology

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SQL migration and update TypeScript types** - `4fea757` (feat)
2. **Task 2: Update Next.js config, install use-debounce, and add i18n translations** - `fd9d663` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `supabase/migrations/00002_phase4_updates.sql` - RLS fixes + medical_record_id column + storage policy documentation
- `lib/types/database.ts` - Added medical_record_id to patient_files Row/Insert/Update
- `next.config.ts` - Added experimental.serverActions.bodySizeLimit: '10mb'
- `messages/en.json` - Added patients, visits, prescriptions, files namespaces (English)
- `messages/ar.json` - Added patients, visits, prescriptions, files namespaces (Arabic)
- `package.json` / `pnpm-lock.yaml` - use-debounce 10.1.0 added

## Decisions Made
- Secretary policies on medical_records are 3 separate statements (SELECT, INSERT, UPDATE) not one FOR ALL — intentional because secretary should not have DELETE access to visit records
- Storage RLS policies included as SQL comments only; Supabase storage bucket must be created manually via Dashboard, and storage.objects policies cannot be applied in advance without the bucket existing
- bodySizeLimit value uses '10mb' string format as required by Next.js (not numeric bytes)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- pnpm not on PATH in shell environment; resolved by using full path `/c/Users/computer/AppData/Roaming/npm/pnpm`
- npm install attempted first but failed with token expiry error; pnpm succeeded cleanly

## User Setup Required

**Storage bucket must be created manually.** Before Phase 4 file upload features can work:

1. Go to Supabase Dashboard > Storage
2. Create bucket named `patient-files` (private bucket)
3. Apply the storage RLS policies documented in `supabase/migrations/00002_phase4_updates.sql` (lines 56-83) via the Dashboard SQL Editor or Storage policy UI

The SQL migration (00002) must also be applied to the Supabase database via Dashboard > SQL Editor before Phase 4 server actions will work correctly.

## Next Phase Readiness
- Database migration file is ready to apply (not applied yet — file only)
- TypeScript types are in sync with the migration schema changes
- Next.js configured for 10MB file upload server actions
- All i18n keys exist for Phase 4 UI work — UI components can be built without translation gaps
- use-debounce installed for patient search component
- Ready for 04-02 (server actions for medical records/prescriptions) and 04-03 (file upload server actions)

---
*Phase: 04-medical-records-prescriptions*
*Completed: 2026-02-11*

## Self-Check: PASSED
