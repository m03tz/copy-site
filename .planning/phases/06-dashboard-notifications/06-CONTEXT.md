# Phase 6: Dashboard & Notifications — Context

**Created:** 2026-02-15
**Phase goal:** Doctor sees daily overview on login and patients receive appointment reminders
**Requirements:** DASH-01, DASH-02, DASH-03, NOTF-01, NOTF-02

---

## Area 1: Dashboard Design

**Layout structure (top to bottom):**
1. **Stat cards row** — 3-4 small cards at the very top showing quick numbers (e.g., today's appointment count, total patients, upcoming due dates, cancellations)
2. **Main content: two-column layout**
   - **Primary column (wider):** Today's appointments list
   - **Secondary column (sidebar):** Alerts section (due-date alerts)
3. **Quick search** — Autocomplete search bar (positioned within dashboard, exact location TBD by planner)

**Today's appointments section:**
- Simple chronological list format: time + patient name + appointment type
- NOT a calendar grid — a straightforward list sorted by time
- **Day navigation:** Left/right arrows to browse yesterday ← today → tomorrow
  - Default view: today's date
  - Arrows shift the date by one day
  - Display the current date prominently between the arrows
- Each appointment row links to the patient profile page

**Stat cards:**
- 3-4 small cards with quick numbers
- Suggested cards (planner decides exact set):
  - Today's appointments count
  - Total registered patients
  - Active pregnancies approaching due date
  - Recent cancellations (optional)

## Area 2: Urgent Alerts & Notifications

**Alert types on dashboard:**
- **Due-date alerts ONLY** — reuse existing DueDateAlert component from Phase 5
- NO cancellation alerts, NO no-show tracking (not in scope)
- The existing Phase 5 component already handles this; Phase 6 just positions it in the sidebar layout

**Alert ordering:** By time (chronological, earliest due date first)

**Alert placement:** Sidebar column alongside the appointments list (not a separate section below, not within stat cards)

**Alert action:** Clicking an alert navigates directly to the patient's profile page (`/doctor/patients/{id}`)

**Note:** Due-date alerts component already exists (`components/pregnancy/due-date-alert.tsx`). Dashboard just needs to integrate it into the new sidebar layout.

## Area 3: Email Notifications

**Appointment reminders (NOTF-01):**
- **Two reminders per appointment:**
  1. 24 hours before the appointment
  2. 2 hours before the appointment
- **Content:** Simple — patient name, appointment date and time, clinic address
- **Language:** Arabic only (all patients are Arabic-speaking)
- **Template:** Clean, branded with clinic logo and doctor info (consistent with prescription print branding)

**Cancellation notification (NOTF-02):**
- Sent immediately when an appointment is cancelled
- Notifies the patient that their appointment has been cancelled
- Same simple format: date/time of cancelled appointment + clinic contact info

**Email service:** Researcher/planner should choose the best fit. Considerations:
- Resend is recommended (modern, easy Next.js integration, free tier 100/day)
- Must work with Next.js App Router (server actions or API routes)
- Needs scheduled sending capability (for the 24h and 2h reminders)
  - Options: Supabase pg_cron, Vercel Cron, or external scheduler
  - The scheduling mechanism is a technical decision for the planner

**Email template language:** Arabic only (no bilingual emails needed)

## Area 4: Quick Patient Search

**Search type:** Autocomplete search with dropdown results
- Input field on the dashboard
- As the doctor types, a dropdown appears showing matching patients
- Real-time filtering (debounced, ~300ms delay)

**Search criteria:** Name + phone number in the same field
- Searches both `full_name_ar` and `full_name_en` fields
- Also searches phone number
- Single input field handles all three (same as existing `searchPatients` server action from Phase 4)

**Search action:** Selecting a patient from the dropdown navigates directly to their profile page (`/doctor/patients/{id}`)

**Implementation note:** Phase 4 already has `searchPatients` in `lib/actions/patients.ts` — reuse that logic. The new part is the autocomplete UI component with dropdown on the dashboard.

---

## Deferred Ideas

None identified during discussion.

---

*Context gathered: 2026-02-15*
*Ready for: /gsd:plan-phase 6*
