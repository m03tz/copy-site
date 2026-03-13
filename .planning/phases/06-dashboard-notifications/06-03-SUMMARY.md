---
phase: 06-dashboard-notifications
plan: 03
subsystem: api
tags: [resend, email, notifications, appointments, arabic, rtl]

# Dependency graph
requires:
  - phase: 06-01
    provides: Resend SDK installed, reminder_24h_email_id/reminder_2h_email_id columns on appointments table, i18n keys
  - phase: 03-appointments-scheduling
    provides: bookAppointment and cancelAppointment server actions to modify

provides:
  - lib/actions/email.ts with buildReminderHtml, buildCancellationHtml, scheduleReminders, cancelReminders, sendCancellationEmail
  - bookAppointment schedules 24h+2h reminders via Resend scheduledAt API and stores email IDs
  - cancelAppointment cancels scheduled reminders and sends immediate cancellation notification
  - NOTF-01 satisfied: email reminders sent before scheduled appointments
  - NOTF-02 satisfied: email notification sent on appointment cancellation

affects: [future-testing, deployment-checklist]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Email-at-booking pattern: schedule reminders at booking time via Resend scheduledAt (no cron)"
    - "Cancel-by-ID pattern: store Resend email IDs on appointments row for later cancellation"
    - "Resilient email integration: try/catch wrapping ensures email failures never break core flows"
    - "Promise.allSettled for bulk email operations (schedule/cancel) — partial failure tolerated"

key-files:
  created:
    - lib/actions/email.ts
  modified:
    - lib/actions/appointments.ts

key-decisions:
  - "Resend v6.x uses scheduledAt (camelCase) not scheduled_at (snake_case) — fixed from plan spec"
  - "email.ts is NOT 'use server' — pure helper module imported by server actions"
  - "From address: onboarding@resend.dev (Resend dev sender, TODO for production domain)"
  - "Clinic phone placeholder 07XXXXXXXX with TODO comment"
  - "bookAppointment stores email IDs only when at least one succeeds (reminder24hId || reminder2hId)"

patterns-established:
  - "Pattern: Email helper module (lib/actions/email.ts) — not a server action, imported by server actions"
  - "Pattern: scheduleReminders returns null IDs for skipped/failed reminders (never throws)"
  - "Pattern: cancelAppointment select expanded to include patient_id and email ID columns"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 6 Plan 03: Email Notifications Summary

**Resend-based appointment email system: Arabic RTL reminder scheduling (24h+2h via scheduledAt API) and immediate cancellation notifications, integrated into booking/cancellation flows with full resilience**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T01:50:29Z
- **Completed:** 2026-02-16T01:53:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `lib/actions/email.ts` with 5 exported functions: HTML template builders (reminder + cancellation), reminder scheduler, reminder canceller, and cancellation sender
- Arabic RTL HTML email templates with clinic branding — inline CSS only for email client compatibility
- Integrated email scheduling into `bookAppointment` (schedules 24h+2h reminders, stores Resend IDs) and `cancelAppointment` (cancels reminders + sends immediate notification)
- All email operations wrapped in try/catch — core booking/cancellation flows are never broken by email failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Email helper functions with Arabic HTML templates** - `f67589d` (feat)
2. **Task 2: Integrate email scheduling into bookAppointment and cancelAppointment** - `4e7ac12` (feat)

**Plan metadata:** (pending — final docs commit)

## Files Created/Modified

- `lib/actions/email.ts` — Email helper module with buildReminderHtml, buildCancellationHtml, scheduleReminders, cancelReminders, sendCancellationEmail
- `lib/actions/appointments.ts` — Modified bookAppointment (email scheduling + ID storage) and cancelAppointment (reminder cancellation + cancellation notification)

## Decisions Made

- **Resend v6.x API difference:** The plan spec used `scheduled_at` (snake_case) but Resend v6.9.2 SDK requires `scheduledAt` (camelCase). Fixed immediately during Task 1 TypeScript compile. [Rule 1 - Bug]
- **email.ts without 'use server':** Pure helper module pattern, not a Next.js server action file — imported by server actions which carry their own 'use server' directive
- **From address kept as onboarding@resend.dev:** Development sender per plan specification; TODO comments left for production domain verification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resend v6.x API uses `scheduledAt` not `scheduled_at`**
- **Found during:** Task 1 (Email helper functions), TypeScript compilation
- **Issue:** Plan spec showed `scheduled_at` (snake_case) but Resend v6.9.2 SDK types only accept `scheduledAt` (camelCase). TypeScript error TS2561 on two lines.
- **Fix:** Replaced both `scheduled_at` occurrences with `scheduledAt` in `scheduleReminders` function
- **Files modified:** lib/actions/email.ts
- **Verification:** `npx tsc --noEmit` passes cleanly after fix
- **Committed in:** f67589d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — API naming difference)
**Impact on plan:** Necessary correction for TypeScript compilation. No scope change.

## Issues Encountered

None beyond the auto-fixed Resend API naming difference above.

## User Setup Required

**External services require manual configuration:**

1. **Resend account:** Create account at https://resend.com/signup (free tier: 100 emails/day)
2. **API key:** Copy from Resend Dashboard -> API Keys -> Create API Key
3. **Environment variable:** Add `RESEND_API_KEY=re_...` to `.env.local`
4. **Production (future):** Verify clinic domain in Resend Dashboard, replace `onboarding@resend.dev` sender
5. **Clinic phone (future):** Replace `07XXXXXXXX` placeholder in `sendCancellationEmail`

Note: Without RESEND_API_KEY, all email calls will fail gracefully (caught by try/catch), and booking/cancellation flows continue normally.

## Next Phase Readiness

- NOTF-01 (appointment reminders) and NOTF-02 (cancellation notifications) are fully implemented
- Phase 6 is complete: foundation (06-01), dashboard UI (06-02), email notifications (06-03)
- Database migration `00003_phase6_email_columns.sql` must still be applied to Supabase before live testing
- Resend API key setup required before email functionality is active in production

---
*Phase: 06-dashboard-notifications*
*Completed: 2026-02-16*

## Self-Check: PASSED
