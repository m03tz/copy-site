# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Patients can easily track their appointments and medical history, and the doctor can efficiently manage his clinic's daily operations — all in one place.
**Current focus:** Phase 6 — Dashboard & Notifications (COMPLETE)

## Current Position

Phase: 6 of 6 — Dashboard & Notifications
Plan: 3 of 3 — Phase COMPLETE
Status: All phases complete
Last activity: 2026-02-16 — Completed 06-03-PLAN.md (email notifications: scheduleReminders, cancelReminders, sendCancellationEmail)

Progress: [████████████████████] 100% (24 plans completed)

## Performance Metrics

**Velocity:**
- Total plans completed: 24 (summaries)
- Average duration: ~7 min
- Total execution time: ~2.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 5 | 46 min | 9 min |
| 02 | 2 | 11 min | 6 min |
| 03 | 5 | ~14 min | ~3-5 min |
| 04 | 5 | 92 min | ~18 min |
| 05 | 3 | ~10 min | ~3-4 min |
| 06 | 3 | ~9 min | ~3 min |

**Recent Trend:**
- Last 5 plans: 3 min (05-03), 3 min (06-01), ~3 min (06-02), 3 min (06-03)
- Phase 6 complete — all 3 plans done

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- No self-registration: Doctor/secretary create all patient accounts for security
- Patient role is read-only: Patients view but don't modify their records
- Arabic-first bilingual: Primary audience is Arabic-speaking
- 24-hour cancellation policy: Prevents last-minute no-shows
- Tech stack: Next.js 15 (App Router) + Supabase + TypeScript + Tailwind + shadcn/ui
- **NEW (01-01):** Use pnpm instead of npm/yarn for faster installs and disk efficiency
- **NEW (01-01):** Tailwind CSS 4 with new @tailwindcss/postcss plugin architecture
- **NEW (01-01):** Arabic (ar) as default locale for i18n per project requirements
- **NEW (01-01):** Root-level app/ directory (no src/) following Next.js conventions
- **NEW (01-03):** localePrefix 'as-needed' - Arabic at /, English at /en/
- **NEW (01-03):** Three-pattern Supabase client architecture (browser, server, middleware)
- **NEW (01-03):** Manual database types matching Plan 02 schema (ready before deployment)
- **NEW (01-04):** Middleware chains: Supabase session refresh → route protection → i18n → cookie merge
- **NEW (01-04):** Login accepts email or Jordanian phone (+962) with password auth
- **NEW (01-04):** Authenticated users on /login redirect to role-specific dashboard
- **NEW (01-05):** Role verification at both middleware and layout level (double protection)
- **NEW (01-05):** Service role key used for admin account creation (server-side only)
- **NEW (01-05):** Account creation has rollback on failure (auth user + profile + patient)
- **NEW (02-01):** (public) route group pattern for shared nav/footer across public-facing pages
- **NEW (02-01):** Login relocated under (public)/(auth)/ — same URL, inherits public navigation
- **NEW (02-01):** Medical colors as oklch CSS variables in :root, mapped via @theme inline to Tailwind classes
- **NEW (02-01):** Logical CSS properties (ms/me/ps/pe, text-start) for RTL/LTR compatibility in navigation
- **NEW (02-02):** generateMetadata pattern for locale-based SEO (title, description, OpenGraph) in route pages
- **NEW (02-02):** Landing page as Server Component composing Client Component sections (each section owns its translations)
- **NEW (02-02):** Phone numbers wrapped in dir="ltr" anchor for correct digit order in RTL context
- **NEW (03-01):** Database types maintained as manual TypeScript mirror (not auto-generated from Supabase)
- **NEW (03-01):** AppointmentType and FileType as explicit union types (not DB enums)
- **NEW (03-01):** pregnancies.expected_due_date is GENERATED ALWAYS in SQL — Insert type has it optional
- **NEW (03-02):** Void wrapper server actions with inline 'use server' used for ID-bound delete form actions (TypeScript requires void return)
- **NEW (03-02):** existingDays prop on ScheduleForm disables already-configured days in day-of-week Select to prevent duplicate upsert conflicts
- **NEW (03-03):** Supabase v2.95 GenericTable requires Relationships: [] on all table types — manual Database type must include this
- **NEW (03-03):** generateAvailableSlots is pure function (no Supabase dependency) — schedule/appointments/holidays passed as args
- **NEW (03-03):** Error code 23P01 (exclusion_violation) maps to translation key slotTaken for double-booking UX
- **NEW (03-03):** Cancellation policy error returns cancel24HourPolicy translation key (i18n-compatible)
- **NEW (03-05):** Patient appointments page is pure Server Component; inner AppointmentList/AppointmentCard receive t as prop
- **NEW (03-05):** StatusBadge handles its own translations via useTranslations (client component pattern)
- **NEW (04-01):** Secretary policies on medical_records are 3 separate (SELECT/INSERT/UPDATE) not FOR ALL — secretary must not have DELETE on visit records
- **NEW (04-01):** Storage RLS documented as SQL comments only — Supabase storage bucket creation requires Dashboard, policies applied after bucket exists
- **NEW (04-01):** bodySizeLimit uses '10mb' string format (Next.js experimental.serverActions format, not numeric bytes)
- **NEW (04-01):** pnpm accessible via /c/Users/computer/AppData/Roaming/npm/pnpm (not on PATH in shell)
- **NEW (04-01):** Phase 4 i18n: patients/visits/prescriptions/files top-level namespaces; prescriptions.print.* for printable layout keys
- **NEW (04-02):** Visit records are notes-only; no chief_complaint, diagnosis, treatment_plan, or vital_signs populated from forms
- **NEW (04-02):** appointment_id is optional in createVisitRecord to support walk-in patients
- **NEW (04-02):** Prescriptions stored as one row per medication — a batch creates N rows sharing same medical_record_id
- **NEW (04-02):** File upload uses storage-first with DB rollback: if DB insert fails after storage upload, file is removed from storage
- **NEW (04-02):** searchPatients uses patients!inner join syntax to only return users with patient records in the patients table
- **NEW (04-03):** PatientCard uses next/link (not i18n Link) for dynamic ID paths — next-intl typed routing rejects template literal hrefs
- **NEW (04-03):** Supabase profiles join on patients(*) may return array or object — normalize with Array.isArray check
- **NEW (04-03):** PatientInfoForm uses controlled React state for blood type Select, injects into FormData before calling updatePatientInfo
- **NEW (04-03):** _prefixed variables for pre-fetched data not yet wired into UI (reserved for future plan population)
- **NEW (04-04):** canPrescribe prop controls prescription creation access: true for doctor, false for secretary
- **NEW (04-04):** PrescriptionForm uses react-hook-form + useFieldArray (not FormData) because createPrescription takes a plain JS object with medications array
- **NEW (04-04):** PrescriptionPrint uses inline styles (not Tailwind CSS vars) for reliable print media rendering across browsers
- **NEW (04-04):** PrescriptionList receives visits[] array, filters to visits with prescriptions — avoids flat prescription query
- **NEW (04-04):** Empty page.tsx stubs cause TypeScript build errors — Next.js type generation requires valid module export
- **NEW (04-05):** FileDownloadRow as async Server Component with inline 'use server' action — redirect(url) approach keeps signed URL generation server-side in patient portal
- **NEW (04-05):** Patient portal groups files by medical_record_id to embed them in visit cards (filesByVisit reduce pattern)
- **NEW (04-05):** FileUpload visit selector is required before upload (disabled when no visits exist) — files must be linked to a specific visit per user decision
- **NEW (04-05):** Patient portal is pure Server Component — read-only display requires no client interactivity except the download form action
- **NEW (05-01):** Pregnancy server actions are doctor-only (not doctor|secretary) — secretary cannot create/update pregnancies
- **NEW (05-01):** gestational_week in measurements is doctor-entered, NOT auto-calculated from LMP date
- **NEW (05-01):** blood_pressure stored as single TEXT field (e.g. "120/80"), not separate systolic/diastolic columns
- **NEW (05-01):** Optional numeric FormData fields use empty-string-to-undefined conversion before Zod coerce to avoid coercing "" to 0
- **NEW (05-01):** isApproachingDueDate window is 0–14 days inclusive (due today through 14 days out)
- **NEW (05-01):** Pregnancy utilities (getGestationalWeek, getDaysUntilDue, isApproachingDueDate) are pure functions — safe to call from any Server Component
- **NEW (05-02):** All-string Zod schema for react-hook-form with optional numeric inputs — z.string().refine() avoids zodResolver type mismatch caused by z.preprocess/z.union([z.coerce.number(), z.literal('')]) returning unknown type
- **NEW (05-02):** Pregnancy measurements sorted by measured_at desc in JS after fetch — Supabase select('*, pregnancy_measurements(*)') doesn't support nested .order()
- **NEW (05-02):** Status badge uses Badge variant=outline with className color overrides (green/blue/red) — gives full Tailwind color control
- **NEW (05-03):** Patient pregnancy page is fully read-only — pregnancy.notes not shown to patients (clinical notes hidden per research recommendation)
- **NEW (05-03):** Dashboard de-duplication uses Map<patient_id> keeping earliest due date when patient has multiple active pregnancies
- **NEW (05-03):** DueDateAlert urgency: 0-3 days = destructive (red), 4-7 days = default, 8-14 days = secondary
- **NEW (06-01):** shadcn CLI cannot invoke bare `pnpm` — install underlying package (cmdk) manually via full path, then create component.tsx manually
- **NEW (06-01):** Reminder email IDs stored as nullable TEXT columns on appointments table (Option A) — simpler than separate table for clinic scale
- **NEW (06-01):** Resend cancel-by-ID pattern: reminder_24h_email_id and reminder_2h_email_id store Resend email IDs for cancellation on appointment cancel
- **NEW (06-02):** Supabase profiles join type bypass: (query) as unknown as Promise<{data: TypedRow[], error: ...}> for !foreign-key joins unresolvable from Relationships: []
- **NEW (06-02):** Dashboard page uses Promise.all for 4 parallel queries (today appointments, patient count, pregnancy count, pregnancy data for alerts)
- **NEW (06-02):** AppointmentDayList uses RTL-aware chevron icons via useLocale() — ChevronRight for prev and ChevronLeft for next in Arabic locale
- **NEW (06-02):** PatientAutocomplete Popover open gated by results.length > 0 — avoids empty dropdown flash before search results arrive
- **NEW (06-03):** Resend v6.x uses scheduledAt (camelCase) not scheduled_at (snake_case) — plan spec had snake_case; fixed during TypeScript compilation
- **NEW (06-03):** email.ts is NOT 'use server' — pure helper module imported by server actions (no directive needed)
- **NEW (06-03):** Email-at-booking pattern: schedule reminders at booking time via scheduledAt (no cron infrastructure needed)

### Pending Todos

- Apply supabase/migrations/00002_phase4_updates.sql to Supabase database (via Dashboard SQL Editor)
- Create 'patient-files' storage bucket in Supabase Dashboard
- Apply storage RLS policies (documented in 00002 as SQL comments) via Dashboard
- Apply supabase/migrations/00003_phase6_email_columns.sql to Supabase database (via Dashboard SQL Editor)
- Configure RESEND_API_KEY in .env.local (Resend Dashboard -> API Keys)

### Blockers/Concerns

None for code work. All 6 phases are complete. Database migrations and external service setup (Supabase storage bucket, Resend API key) required before production testing.

## Session Continuity

Last session: 2026-02-16T01:53:10Z
Stopped at: Completed 06-03-PLAN.md — email notifications (scheduleReminders, cancelReminders, sendCancellationEmail)
Resume file: None
Next action: All plans complete. Pending: database migrations, Resend API key setup, production testing.
