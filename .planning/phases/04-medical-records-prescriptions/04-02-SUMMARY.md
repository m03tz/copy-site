---
phase: 04-medical-records-prescriptions
plan: 02
subsystem: api
tags: [supabase, server-actions, zod, typescript, file-upload, pagination]

# Dependency graph
requires:
  - phase: 04-01
    provides: database migration (medical_records, prescriptions, patient_files tables), FileType type, i18n namespaces
  - phase: 03-01
    provides: database types (Database, Profile, Patient, PatientFile, Prescription, MedicalRecord)
  - phase: 01-03
    provides: Supabase server client pattern (createClient from @/lib/supabase/server)
provides:
  - createVisitRecord server action (notes-only, optional appointment_id for walk-ins)
  - updateVisitRecord server action (always editable)
  - createPrescription server action (multi-medication, one row per medication)
  - uploadFile server action (Supabase Storage with DB record and rollback)
  - deleteFile server action (storage + DB cleanup)
  - getFileUrl server action (signed URL, 1-hour expiry)
  - searchPatients server action (ilike search, pagination, patients!inner join)
  - updatePatientInfo server action (updates profiles + patients tables)
affects:
  - 04-03 (UI forms for visit records)
  - 04-04 (UI for prescriptions)
  - 04-05 (UI for file management)
  - 04-06 (patient profile/search UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - getDoctorId helper duplicated in each action file (same as appointments.ts pattern)
    - Per-medication row pattern for prescriptions (one DB row per medication in batch)
    - Storage-first upload with DB rollback on insert failure
    - patients!inner join syntax for Supabase inner join via relationship
    - ilike search via .or() with comma-separated filter string

key-files:
  created:
    - lib/actions/medical-records.ts
    - lib/actions/prescriptions.ts
    - lib/actions/files.ts
    - lib/actions/patients.ts
  modified: []

key-decisions:
  - "notes-only visit records: no chief_complaint, diagnosis, treatment_plan, vital_signs fields populated"
  - "appointment_id is optional in createVisitRecord to support walk-in patients"
  - "prescriptions stored as one row per medication, all sharing same medical_record_id"
  - "file upload rollback: if DB insert fails after storage upload, file is removed from storage"
  - "searchPatients uses patients!inner join to only return users with patient records"
  - "updatePatientInfo updates two tables: profiles (identity) and patients (clinical/admin fields)"

patterns-established:
  - "getDoctorId helper: each action file defines its own copy (same pattern as appointments.ts)"
  - "Storage rollback pattern: upload first, insert DB, on DB failure call .remove() on storage path"
  - "ilike search: .or('field.ilike.%query%,field2.ilike.%query%') comma-separated in single string"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 4 Plan 02: Medical Records & Prescriptions Server Actions Summary

**Four server action files providing notes-only visit records, per-medication prescription rows, Supabase Storage upload/delete with rollback, and paginated patient search via ilike across Arabic/English name and phone fields.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T16:36:44Z
- **Completed:** 2026-02-11T16:40:55Z
- **Tasks:** 2
- **Files modified:** 4 (all created)

## Accomplishments
- Visit record CRUD: `createVisitRecord` (walk-in support via optional `appointment_id`) and `updateVisitRecord` (always editable, notes + date only)
- Prescription creation: `createPrescription` inserts one DB row per medication, all sharing `medical_record_id`
- File management: `uploadFile` uploads to Supabase Storage bucket `patient-files` with DB record and automatic rollback; `deleteFile` removes from both storage and DB; `getFileUrl` returns 1-hour signed URL
- Patient operations: `searchPatients` with `ilike` across `full_name_ar`, `full_name_en`, `phone` with server-side pagination; `updatePatientInfo` updates both `profiles` and `patients` tables

## Task Commits

Each task was committed atomically:

1. **Task 1: Create visit record and prescription server actions** - `8f501f0` (feat)
2. **Task 2: Create file management and patient search server actions** - `4d27655` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `lib/actions/medical-records.ts` - createVisitRecord and updateVisitRecord server actions
- `lib/actions/prescriptions.ts` - createPrescription server action (multi-medication batch insert)
- `lib/actions/files.ts` - uploadFile (Storage + DB + rollback), deleteFile, getFileUrl
- `lib/actions/patients.ts` - searchPatients (ilike + pagination), updatePatientInfo (profiles + patients)

## Decisions Made
- notes-only visit records: no clinical assessment fields (chief_complaint, diagnosis, treatment_plan, vital_signs) are populated from forms — matches user decision from STATE.md
- `appointment_id` is optional in createVisitRecord to support walk-in patients without a prior appointment
- Prescriptions stored as individual rows per medication — a batch of 3 medications = 3 rows in `prescriptions` table, all sharing `medical_record_id`
- File upload uses storage-first with DB rollback: if the DB insert fails after storage upload succeeds, the storage file is immediately deleted to prevent orphaned files

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all four files compiled cleanly on first attempt. Build passed.

## User Setup Required
None - no external service configuration required (storage bucket and RLS policies are tracked in STATE.md pending todos from 04-01).

## Next Phase Readiness
- All 8 server actions are ready for UI components to call
- Forms for visit records, prescriptions, file upload/delete, and patient search/edit can now be built
- The `patient-files` storage bucket must still be created in Supabase Dashboard (tracked as pending todo from 04-01) before file upload will work end-to-end

---
*Phase: 04-medical-records-prescriptions*
*Completed: 2026-02-11*

## Self-Check: PASSED
