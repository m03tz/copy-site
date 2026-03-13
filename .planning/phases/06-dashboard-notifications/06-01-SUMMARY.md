---
phase: 06-dashboard-notifications
plan: 01
subsystem: infra
tags: [resend, cmdk, shadcn, email, i18n, database, typescript, supabase]

# Dependency graph
requires:
  - phase: 05-pregnancy-tracking
    provides: Completed pregnancy tracking feature set that dashboard will surface
  - phase: 03-appointments-scheduling
    provides: Appointments table schema this migration extends
provides:
  - resend package installed for email sending and scheduling
  - cmdk package installed as shadcn command dependency
  - components/ui/command.tsx shadcn Command component for autocomplete search
  - supabase/migrations/00003_phase6_email_columns.sql for reminder email ID columns
  - TypeScript types for appointments with reminder_24h_email_id and reminder_2h_email_id
  - Arabic and English i18n translations for all Phase 6 dashboard UI elements
affects:
  - 06-02 (dashboard UI plan that uses command component and i18n keys)
  - 06-03 (email integration plan that uses resend package and email ID columns)

# Tech tracking
tech-stack:
  added:
    - resend 6.9.2 (email API and scheduling)
    - cmdk 1.1.1 (command palette/autocomplete primitive)
  patterns:
    - Manual shadcn component creation when CLI cannot invoke pnpm (not on PATH)
    - Nullable TEXT columns on appointments for Resend email ID storage (cancel-by-ID pattern)

key-files:
  created:
    - components/ui/command.tsx
    - supabase/migrations/00003_phase6_email_columns.sql
  modified:
    - lib/types/database.ts
    - messages/ar.json
    - messages/en.json
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "shadcn CLI cannot invoke pnpm on PATH — command.tsx created manually using cmdk + shadcn standard implementation"
  - "Option A chosen: reminder email IDs stored as columns on appointments table (not separate table) for simplicity at clinic scale"
  - "reminder_24h_email_id and reminder_2h_email_id are nullable TEXT to allow NULL when no reminder scheduled"

patterns-established:
  - "Manual shadcn component creation: install underlying package (cmdk) via pnpm full path, then write component.tsx manually"
  - "Reminder email tracking: appointments table columns store Resend email IDs for cancel-by-ID cancellation"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 6 Plan 01: Foundation Setup Summary

**resend 6.9.2 + cmdk 1.1.1 installed, shadcn Command component created manually, SQL migration for reminder email ID columns, TypeScript types updated, and 11 new dashboard i18n keys added in Arabic and English**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T01:42:38Z
- **Completed:** 2026-02-16T01:45:56Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed resend (email API) and cmdk (command palette) packages via full pnpm path
- Manually created components/ui/command.tsx since shadcn CLI cannot invoke pnpm (not on PATH)
- Created SQL migration 00003_phase6_email_columns.sql adding reminder_24h_email_id and reminder_2h_email_id to appointments
- Updated TypeScript Database type for appointments Row/Insert/Update with two new nullable string columns
- Added 11 new dashboard keys to both ar.json and en.json (todayAppointments, totalPatients, approachingDueDate, searchPatients, previousDay, nextDay, appointmentsFor, etc.)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install resend package and shadcn command component** - `3845878` (feat)
2. **Task 2: Database migration, TypeScript types, and i18n translations** - `e67a592` (feat)

## Files Created/Modified
- `components/ui/command.tsx` - shadcn Command component using cmdk, supports CommandInput, CommandList, CommandItem, CommandDialog, etc.
- `supabase/migrations/00003_phase6_email_columns.sql` - ALTER TABLE adds reminder_24h_email_id and reminder_2h_email_id TEXT columns to appointments
- `lib/types/database.ts` - appointments Row/Insert/Update extended with reminder_24h_email_id and reminder_2h_email_id (string | null)
- `messages/ar.json` - dashboard section extended with 11 new Arabic translation keys
- `messages/en.json` - dashboard section extended with 11 matching English translation keys
- `package.json` - resend ^6.9.2 and cmdk ^1.1.1 added to dependencies
- `pnpm-lock.yaml` - updated lockfile

## Decisions Made
- **shadcn CLI workaround:** The shadcn CLI internally calls `pnpm` without the full path and fails on this machine. Solution: manually install underlying package (`cmdk`) via `/c/Users/computer/AppData/Roaming/npm/pnpm`, then write the `command.tsx` component manually following the standard shadcn implementation.
- **Option A for email tracking:** Reminder email IDs stored as columns on the appointments table rather than a separate table. Simpler for clinic scale; avoids JOIN complexity.
- **Nullable columns:** Both email ID columns are nullable TEXT. NULL means no reminder scheduled; a value means a Resend scheduled email ID that can be cancelled.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn CLI pnpm invocation fails — manual command.tsx creation**
- **Found during:** Task 1 (Install resend package and shadcn command component)
- **Issue:** `pnpm dlx shadcn@latest add command` attempted to run `pnpm add "@radix-ui/react-dialog" cmdk` internally, but `pnpm` is not on system PATH so it fails with "'pnpm' is not recognized as an internal or external command"
- **Fix:** Manually installed `cmdk` via full path pnpm, then created `components/ui/command.tsx` manually based on shadcn's standard implementation
- **Files modified:** components/ui/command.tsx, package.json, pnpm-lock.yaml
- **Verification:** component.tsx exists, cmdk in package.json, `npx tsc --noEmit` passes
- **Committed in:** `3845878` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary due to environment constraint (pnpm not on PATH). Result is identical — cmdk installed, command.tsx created with same shadcn implementation. No scope creep.

## Issues Encountered
- shadcn CLI internally calls bare `pnpm` command which fails since pnpm is only accessible via full path. This is a known environment constraint (documented in STATE.md as NEW 04-01). Resolved by manual installation + component creation.

## User Setup Required
None - no external service configuration required for this plan. (Supabase migration must be applied via Dashboard SQL Editor — tracked in existing Pending Todos.)

## Next Phase Readiness
- Phase 6 dependencies fully installed (resend, cmdk/command)
- SQL migration ready to apply via Supabase Dashboard SQL Editor
- TypeScript types ready for use in 06-02 and 06-03 plans
- All dashboard i18n keys available for dashboard UI components in 06-02
- No blockers for 06-02 (dashboard UI plan)

---
*Phase: 06-dashboard-notifications*
*Completed: 2026-02-16*

## Self-Check: PASSED
