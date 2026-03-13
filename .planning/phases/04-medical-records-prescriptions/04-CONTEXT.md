# Phase 4: Medical Records & Prescriptions - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Doctor can complete patient visits with clinical notes, prescriptions, and file attachments. Patients view their own records read-only. Doctor and secretary can search patients by name, phone, or date. This phase covers visit records, prescriptions (with printable output), file uploads, patient profiles, and patient search.

</domain>

<decisions>
## Implementation Decisions

### Visit record structure
- Notes only: single free-text area for doctor to write clinical notes — maximum flexibility, no structured fields
- Visit optionally links to an appointment (supports walk-ins and phone consultations)
- Both doctor and secretary can create visit records
- Visit records are always editable (no time lock)

### Prescription print layout
- Paper size: A4 (full page)
- Header includes clinic logo (if available), clinic name, doctor name, specialty, phone, address
- Patient info on prescription: patient name + prescription date only (no age)
- Medications displayed as a structured table: medication name | dosage | duration | instructions
- Arabic RTL formatting for print

### File management
- Files displayed as a file list (name, upload date, type) — not gallery view
- Files are linked to a specific visit (not patient-level uploads)
- No file categories/labels — filename and date are sufficient
- Both doctor and secretary can delete uploaded files

### Patient search and list
- Patient list displayed as cards (not table)
- Patient profile page uses tabs: info | visits | prescriptions | files
- Both doctor and secretary can edit patient personal information after account creation
- Default sort: alphabetical by patient name
- Search by name, phone number, or date

### Claude's Discretion
- Search implementation details (debounce, server-side vs client-side)
- Patient card information density and layout
- File upload UI interaction pattern
- Visit record form layout
- Prescription print CSS / print media query approach
- Empty state messages and illustrations
- Pagination or infinite scroll for patient list

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-medical-records-prescriptions*
*Context gathered: 2026-02-11*
