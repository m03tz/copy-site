---
phase: 01-foundation-security
plan: 02
subsystem: database
tags: [supabase, postgresql, rls, security, schema]

requires:
  - phase: 01-foundation-security
    plan: 01
    provides: Research foundation for RLS patterns and security best practices

provides:
  - Complete database schema with 10 tables covering all v1 requirements
  - Row-Level Security policies enforcing three-role access control
  - Performance indexes on all RLS policy columns
  - Database-level data integrity constraints

affects:
  - All future phases that interact with the database
  - Authentication implementation (uses profiles table for role storage)
  - All application features (appointments, medical records, prescriptions, pregnancy tracking)

tech-stack:
  added:
    - PostgreSQL with Row Level Security (RLS)
    - btree_gist extension for exclusion constraints
  patterns:
    - Three-role RBAC (patient, doctor, secretary) enforced at database level
    - get_user_role() helper function for cached role lookups in RLS policies
    - Wrap role checks in (SELECT ...) pattern for PostgreSQL query-level caching
    - Exclusion constraints for preventing appointment overlaps
    - Generated columns for auto-calculated fields (pregnancy due date)
    - Composite indexes for RLS performance optimization

key-files:
  created:
    - supabase/migrations/00001_initial_schema.sql
  modified: []

decisions:
  - decision: Store roles in profiles table, not user_metadata
    rationale: user_metadata can be modified by users, creating privilege escalation vulnerability
    impact: All RLS policies reference profiles table for role checks

  - decision: Secretary has NO access to medical_records, prescriptions, or pregnancies
    rationale: Medical data should only be accessible to doctor and patient
    impact: Secretary can manage appointments and patient administrative data only

  - decision: Use exclusion constraint for appointment overlap prevention
    rationale: Database-level enforcement is more reliable than application-level checks
    impact: Impossible to double-book appointments even if application has bugs

  - decision: Index every column used in RLS policy USING clauses
    rationale: RLS performance degrades 100x+ without proper indexes on large tables
    impact: All patient_id, doctor_id, role lookups will use index scans instead of sequential scans

metrics:
  duration: 2.5 minutes
  completed: 2026-02-09
---

# Phase 01 Plan 02: Database Schema with RLS Summary

**One-liner:** Complete PostgreSQL schema with 10 tables, Row-Level Security policies, and performance indexes enforcing patient data isolation at the database level.

## What Was Built

Created the foundational database schema for Dr. Fadi's clinic management system with comprehensive Row-Level Security (RLS) policies. The schema supports all v1 requirements including patient profiles, appointments, medical records, prescriptions, file management, and pregnancy tracking.

### Database Tables (10)

1. **profiles** - Extends auth.users with role and personal info
2. **patients** - Additional patient-specific data (DOB, blood type, emergency contacts)
3. **doctor_schedule** - Doctor's working hours per day of week
4. **doctor_holidays** - Days the doctor is off
5. **appointments** - Scheduled appointments with overlap prevention
6. **medical_records** - Visit records with clinical notes
7. **prescriptions** - Medications linked to medical records
8. **patient_files** - Image and PDF uploads
9. **pregnancies** - Pregnancy tracking with auto-calculated due dates
10. **pregnancy_measurements** - Per-visit measurements (weight, BP, fetal heartbeat)

### Security Implementation

**Row-Level Security Policies (29 policies):**

- **Patient role:** Can only view their own data (SELECT on own records)
- **Doctor role:** Full access to all medical data (ALL operations)
- **Secretary role:** Administrative access only (appointments, patient profiles) - NO access to medical_records, prescriptions, or pregnancies

**Performance Optimization (18 indexes):**

All columns referenced in RLS policies have indexes to prevent sequential scans. Key indexes:
- `idx_profiles_id_role` - Composite index for role lookups
- `idx_appointments_patient_id`, `idx_appointments_doctor_id` - Foreign key indexes
- `idx_medical_records_patient_id` - Critical for patient record isolation
- `idx_pregnancies_patient_id` - Pregnancy data access

**Data Integrity Constraints:**

- Appointment overlap prevention using `EXCLUDE USING gist` constraint
- Role validation with `CHECK (role IN ('patient', 'doctor', 'secretary'))`
- Status enums for appointments, prescriptions, pregnancies
- Foreign key cascades for data cleanup
- Auto-calculated pregnancy due date (LMP + 280 days) as generated column

## Deviations from Plan

None - plan executed exactly as written.

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1-2 | Create database schema with RLS and indexes | fcf6dcb | supabase/migrations/00001_initial_schema.sql |

**Note:** Tasks 1 and 2 were combined into a single commit since they modify the same file (RLS policies and indexes are appended to the schema file).

## Verification Results

All verification criteria met:

- [x] SQL migration file exists at `supabase/migrations/00001_initial_schema.sql`
- [x] File starts with `CREATE EXTENSION IF NOT EXISTS btree_gist;`
- [x] All 10 tables created with proper constraints
- [x] RLS enabled on ALL tables (10/10)
- [x] Policies follow the three-role access pattern (29 policies)
- [x] Secretary explicitly excluded from medical_records, prescriptions, pregnancies
- [x] Performance indexes cover all RLS policy columns (18 indexes)
- [x] updated_at triggers on profiles, appointments, medical_records, pregnancies
- [x] Appointment overlap prevention constraint exists (EXCLUDE USING gist)
- [x] Pregnancy expected_due_date is auto-calculated from LMP (GENERATED ALWAYS AS)

**File metrics:**
- Total lines: 452 (exceeds 200-line minimum)
- Tables: 10
- RLS policies: 29
- Indexes: 18
- Triggers: 4

## Success Criteria Met

- [x] Single SQL migration file covers entire schema
- [x] RLS policies enforce: patients see own data only, doctor sees all, secretary sees administrative data
- [x] No table has RLS enabled without at least one policy
- [x] Performance indexes exist for every column referenced in RLS policies
- [x] Appointment double-booking prevented by database constraint
- [x] Schema supports all v1 requirements

## Technical Implementation Details

### RLS Policy Pattern

Used the cached role lookup pattern for performance:

```sql
-- Wrap in SELECT for query-level caching
(SELECT get_user_role()) = 'doctor'

-- get_user_role() function is STABLE SECURITY DEFINER
-- Result is cached per transaction, not evaluated per row
```

### Appointment Overlap Prevention

```sql
EXCLUDE USING gist (
  doctor_id WITH =,
  tstzrange(scheduled_start, scheduled_end) WITH &&
) WHERE (status != 'cancelled')
```

This constraint makes it **impossible** to create overlapping appointments for the same doctor, even if application code has bugs.

### Pregnancy Due Date Calculation

```sql
expected_due_date DATE GENERATED ALWAYS AS (lmp_date + INTERVAL '280 days') STORED
```

Auto-calculated field that updates whenever LMP date changes. No manual calculation needed.

## Next Phase Readiness

**Ready for Phase 1 Plan 3 (Authentication):**
- Profiles table exists with role column
- RLS policies reference auth.uid() from Supabase Auth
- get_user_role() helper function ready for use in application code

**Blockers:** None

**Concerns:** None - schema is production-ready

## Self-Check: PASSED

Created files verified:
- [x] supabase/migrations/00001_initial_schema.sql exists

Commit hash verified:
- [x] fcf6dcb exists in git history
