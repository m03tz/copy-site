---
phase: 04-medical-records-prescriptions
plan: 05
subsystem: ui
tags: [next-intl, shadcn-ui, supabase, rtl, file-upload, patient-portal, prescription-print, server-actions]

# Dependency graph
requires:
  - phase: 04-03
    provides: Patient profile pages with 4-tab layout (visits/prescriptions/files tabs wired in 04-04)
  - phase: 04-02
    provides: uploadFile, deleteFile, getFileUrl server actions in lib/actions/files.ts
  - phase: 04-04
    provides: Prescription components (PrescriptionPrint) and visit/prescription tabs
provides:
  - FileUpload component wired into doctor and secretary patient profile files tab
  - FileList component with download (signed URL) and delete (confirmation dialog) for doctor/secretary
  - Patient read-only records portal at /patient/records with chronological visits + prescriptions + files
  - Patients can print their own prescriptions and download their own files
affects:
  - Phase 5 (patient portal enhancements, if any)
  - Phase 6 (any admin/reporting features)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FileDownloadRow as async Server Component with inline 'use server' action for signed URL redirect
    - Client-side file validation (MIME type + file size) before server action call
    - Files grouped by medical_record_id for embedding in visit cards in patient portal
    - Patient portal uses form + server action for file download (avoids client-side getFileUrl exposure)

key-files:
  created:
    - components/files/file-upload.tsx
    - components/files/file-list.tsx
    - app/[locale]/patient/records/page.tsx
  modified:
    - app/[locale]/doctor/patients/[id]/page.tsx
    - app/[locale]/secretary/patients/[id]/page.tsx
    - messages/ar.json
    - messages/en.json

key-decisions:
  - "FileDownloadRow in patient portal is an async Server Component with inline 'use server' action — redirect(url) approach avoids exposing signed URL logic client-side"
  - "Patient portal groups files by medical_record_id to embed them in their parent visit cards"
  - "FileUpload component disables submit when no visits exist (requires at least one visit to link file to)"
  - "File list shows type badge (image/PDF) and date without categories (per user decision: filename and date are sufficient)"

patterns-established:
  - "Async Server Component sub-components with inline 'use server' action for download redirects"
  - "Client FileUpload: validate MIME + size client-side before FormData submission to uploadFile"
  - "Patient portal is pure Server Component — no client components needed (read-only display)"

# Metrics
duration: 9min
completed: 2026-02-13
---

# Phase 4 Plan 05: File Upload/Management UI and Patient Records Portal Summary

**File upload component with visit-linked uploads (visit selector + type/size validation), file list with download/delete, and read-only patient records portal with chronological visit cards embedding prescriptions and files**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-13T16:08:13Z
- **Completed:** 2026-02-13T16:17:14Z
- **Tasks:** 2
- **Files modified:** 3 created, 4 modified

## Accomplishments

- FileUpload component: visit selector (links file to specific medical_record_id), file input (image/jpeg/png/webp/pdf only), client-side MIME type + 10MB size validation, uploading spinner, success/error feedback
- FileList component: list view with file name, upload date, type badge (image/PDF), download button (getFileUrl signed URL → new tab), delete button with confirmation Dialog using deleteFile action
- Patient records portal: Server Component querying medical_records filtered to current user's patient_id, chronological visit cards with embedded prescriptions and files (read-only)
- Patient print prescriptions: PrescriptionPrint dialog opened from prescription row — patient can print their own prescriptions
- Patient download files: FileDownloadRow async Server Component with inline 'use server' action calling getFileUrl and redirect() — no client-side URL exposure
- Files tab fully functional for doctor and secretary — upload, list, download, delete

## Task Commits

Each task was committed atomically:

1. **Task 1: Create file upload and file list components, wire into profile files tab** — Prior execution already committed as part of `19c1019` (docs) and `59af307` (feat)
2. **Task 2: Create patient read-only records portal page** - `b4ba898` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `components/files/file-upload.tsx` - Client component with visit selector, file input, client-side validation, upload state
- `components/files/file-list.tsx` - Client component: list view with name/date/type badge, download (signed URL), delete (dialog)
- `app/[locale]/patient/records/page.tsx` - Patient read-only portal: medical_records + prescriptions + files, print button, download via server action
- `app/[locale]/doctor/patients/[id]/page.tsx` - Files tab wired with FileUpload + FileList (committed in prior 04-04 execution)
- `app/[locale]/secretary/patients/[id]/page.tsx` - Files tab wired with FileUpload + FileList (committed in prior 04-04 execution)
- `messages/ar.json` - Added files.upload.linkToVisit, selectVisitPlaceholder, noVisits, success; files.actions.cancel (committed in prior execution)
- `messages/en.json` - Same new translation keys (committed in prior execution)

## Decisions Made

- **FileDownloadRow as Server Component with inline action:** Using `async function FileDownloadRow` as an async Server Component with an inline `'use server'` function that calls `getFileUrl(filePath)` and `redirect(url)` keeps signed URL generation server-side and avoids exposing it as a client-side API call.

- **Files grouped by medical_record_id in patient portal:** The `filesByVisit` reduce pattern groups patient_files records by their `medical_record_id`. Visit cards render embedded files from `filesByVisit[record.id]`, and unlinked files (null medical_record_id) are displayed under `filesByVisit['__unlinked__']` in a separate section.

- **FileUpload visit selector required:** Upload is disabled when no visits exist (button disabled + message in dropdown). Files must be linked to a specific visit per user decision, so the selector is required before upload.

- **Patient portal is pure Server Component:** Since the portal is read-only (no form interactions except the download form action), there is no need for 'use client'. All data fetching happens server-side at page level.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prescription components missing — created as blocker fix**
- **Found during:** Pre-execution verification
- **Issue:** `components/prescriptions/prescription-form.tsx`, `prescription-card.tsx`, `prescription-list.tsx`, and `prescription-print.tsx` were referenced by `visit-card.tsx` but the prescriptions directory was empty. Build would fail.
- **Fix:** Discovered that a prior agent execution had already created and committed these components (commits `fdbd835` and `59af307`). Also committed FileUpload, FileList, profile page wiring, globals.css print CSS, and i18n keys.
- **Files modified:** None by this execution — prior execution had already completed them
- **Verification:** Build passes
- **Committed in:** `59af307` and `19c1019` (prior execution)

---

**Total deviations:** 1 discovery — prior agent execution had already completed most of Plan 04-04 and started Plan 05 work. This execution completed the remaining Task 2 (patient records portal).
**Impact on plan:** No scope creep. All prior work was correct and valid.

## Issues Encountered

Prior agent execution had partially completed Plan 04-05 (created file-upload.tsx, file-list.tsx in a docs commit, wired profile pages, added i18n keys). The patient/records/page.tsx existed as a minimal placeholder. This execution implemented the full patient portal functionality.

## User Setup Required

None — no external service configuration required. (Database migration and storage bucket creation remain as pending todos from Phase 4.)

## Next Phase Readiness

- File upload/management UI complete: doctor and secretary can upload images/PDFs linked to visits, view list, download, delete
- Patient records portal complete: read-only chronological view with visit cards embedding prescriptions and files
- Patient can print their own prescriptions and download their own files
- Phase 4 clinical workflow is fully implemented (visit records, prescriptions, file attachments, patient portal)
- No blockers for Phase 5

---
*Phase: 04-medical-records-prescriptions*
*Completed: 2026-02-13*

## Self-Check: PASSED
