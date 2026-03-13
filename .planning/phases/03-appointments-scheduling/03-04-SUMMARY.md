---
phase: 03-appointments-scheduling
plan: 04
subsystem: ui
tags: [react, next-intl, shadcn, tailwind, supabase, appointments, rtl, typescript]

# Dependency graph
requires:
  - phase: 03-03
    provides: bookAppointment, cancelAppointment, getAvailableSlots, getAppointments server actions
  - phase: 03-01
    provides: TimeSlot interface, AppointmentType enum, database types
  - phase: 01-03
    provides: Supabase server client, i18n routing (Link from @/i18n/routing)
provides:
  - StatusBadge component (color-coded appointment status)
  - SlotPicker component (responsive time slot grid)
  - CancelDialog component (confirmation dialog with reason + 24hr policy error)
  - BookingForm component (multi-step: patient + type + notes + date + slot + confirm)
  - AppointmentsTabs component (upcoming/past tabs with status badges and cancel actions)
  - Secretary booking page at /secretary/appointments/book
  - Secretary appointments list page at /secretary/appointments
  - Doctor appointments list page at /doctor/appointments
affects:
  - 03-05 (patient appointments page will reuse StatusBadge and AppointmentsTabs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component pages fetching data, delegating to client components for interactivity
    - AppointmentsTabs client component splits upcoming/past with filter logic on client
    - Multi-step form flow managed entirely with React useState (no router steps)
    - Supabase join via profiles!appointments_patient_id_fkey for patient name lookup

key-files:
  created:
    - components/appointments/status-badge.tsx
    - components/appointments/slot-picker.tsx
    - components/appointments/cancel-dialog.tsx
    - components/appointments/booking-form.tsx
    - components/appointments/appointments-tabs.tsx
    - app/[locale]/secretary/appointments/book/page.tsx
    - app/[locale]/secretary/appointments/page.tsx
    - app/[locale]/doctor/appointments/page.tsx
  modified: []

key-decisions:
  - "AppointmentsTabs client component created beyond plan spec to keep page files as server components and enable tab interactivity"
  - "Upcoming/past split done client-side in AppointmentsTabs: upcoming = non-cancelled/completed with future date; past = cancelled/completed OR past date"
  - "BookingForm uses useState for multi-step flow; date picker triggers immediate slot fetch via getAvailableSlots"

patterns-established:
  - "Server page fetches data, passes typed array to client tab component"
  - "Supabase join syntax: profiles!appointments_patient_id_fkey for foreign key joins"
  - "CancelDialog holds open/loading/error/success/reason state; resets all on dialog close"
  - "BookingForm refreshes slots automatically on slotTaken error"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 3 Plan 4: Appointment Booking UI & List Views Summary

**Multi-step booking form plus appointment list pages for doctor and secretary with status badges, slot picker, and cancel dialog — all server-component pages delegating to client components for interactivity**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T20:50:31Z
- **Completed:** 2026-02-10T20:53:25Z
- **Tasks:** 2
- **Files modified:** 8 created, 0 modified

## Accomplishments
- BookingForm: multi-step client component (patient select + type + notes + calendar date picker + SlotPicker grid + confirm summary) calling `getAvailableSlots` on date change and `bookAppointment` on confirm, with `slotTaken` error causing automatic slot refresh
- CancelDialog: confirmation dialog with reason textarea, handles `cancel24HourPolicy` error from server action with translated message, resets state on close
- StatusBadge: color-coded badge using custom Tailwind classes for all four appointment statuses
- AppointmentsTabs: reusable client component splitting appointments into upcoming/past tabs with full table (patient name, date, time, type, status badge, cancel button)
- Secretary can navigate `/secretary/appointments` to see all appointments and click "Book Appointment" to `/secretary/appointments/book`
- Doctor can navigate `/doctor/appointments` to see all appointments with cancel actions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared appointment components** - `397b5ff` (feat)
2. **Task 2: Create secretary booking page and doctor/secretary appointment list pages** - `ac85ec8` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `components/appointments/status-badge.tsx` - Color-coded badge for scheduled/confirmed/completed/cancelled
- `components/appointments/slot-picker.tsx` - Responsive grid of time slot buttons with selection state
- `components/appointments/cancel-dialog.tsx` - Dialog with reason textarea, 24hr policy error handling, loading state
- `components/appointments/booking-form.tsx` - Multi-step booking: patient + type + notes + date + slot + confirm
- `components/appointments/appointments-tabs.tsx` - Client tab component: upcoming/past split, table with status and cancel
- `app/[locale]/secretary/appointments/book/page.tsx` - Secretary booking page rendering BookingForm
- `app/[locale]/secretary/appointments/page.tsx` - Secretary appointments list with Book button
- `app/[locale]/doctor/appointments/page.tsx` - Doctor appointments list (no book link)

## Decisions Made
- **AppointmentsTabs extra component:** The plan specified a "client component wrapper for tabs" but didn't name it. Created `appointments-tabs.tsx` as a dedicated reusable component shared by both doctor and secretary pages. This keeps page files as pure server components and avoids duplicating the table rendering logic.
- **Upcoming/past filter logic:** Done client-side in AppointmentsTabs rather than separate Supabase queries. Upcoming = non-cancelled, non-completed, future date. Past = cancelled/completed OR past date (regardless of status).
- **Multi-step flow:** BookingForm uses a flat state machine with `useState` rather than separate route segments or `useReducer`. Date selection immediately triggers slot fetch. Slot selection shows the confirm panel.

## Deviations from Plan

None - plan executed exactly as written. The `appointments-tabs.tsx` component was added as an implementation detail to keep server/client boundaries clean, as the plan described it as a "client component wrapper" without specifying a filename.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Appointment booking UI is complete and connects to all server actions from 03-03
- `StatusBadge` and `AppointmentsTabs` are reusable for the patient appointments view in 03-05
- `CancelDialog` is standalone and can be dropped into any page that needs cancel functionality
- TypeScript compiles with zero errors across all new files
- No blockers for 03-05

---
*Phase: 03-appointments-scheduling*
*Completed: 2026-02-10*

## Self-Check: PASSED
