# Roadmap: Dr. Fadi Women's Health Clinic

## Overview

This roadmap takes the clinic management system from zero to production in 6 phases. We start with security foundation (database schema with RLS, authentication, i18n framework), build the public landing page and UI shell, add appointment scheduling, then layer in medical records and prescriptions. Pregnancy tracking (the primary differentiator) gets its own phase after core workflows are established. Finally, we add the doctor dashboard and email notifications for operational visibility.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Security** - Database schema with RLS, authentication, role system, i18n framework
- [x] **Phase 2: Landing Page & UI Shell** - Public landing page, app layout, navigation, RTL support
- [ ] **Phase 3: Appointments & Scheduling** - Doctor schedule management, time slot booking, calendar view
- [ ] **Phase 4: Medical Records & Prescriptions** - Patient profiles, visit records, prescriptions, file management
- [x] **Phase 5: Pregnancy Tracking** - Pregnancy timeline, measurements, due date tracking, growth charts
- [x] **Phase 6: Dashboard & Notifications** - Doctor dashboard, alerts, email reminders

## Phase Details

### Phase 1: Foundation & Security
**Goal**: Security and data foundation are correct before any patient data entry begins
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-04, AUTH-05, AUTH-06, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. Database schema exists with all tables, relationships, and constraints for medical data
  2. Row-Level Security (RLS) policies enforce patient data isolation (patients see only their records, doctor sees all, secretary manages limited scope)
  3. User can log in with email or phone and session persists across browser refresh
  4. System enforces three roles (Patient read-only, Doctor full access, Secretary manage appointments/patients)
  5. Interface switches between Arabic (RTL) and English (LTR) with proper layout
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold with Next.js 15, deps, Tailwind, shadcn/ui
- [x] 01-02-PLAN.md — Database schema with RLS policies and performance indexes
- [x] 01-03-PLAN.md — i18n framework (Arabic/English RTL) and Supabase client utilities
- [x] 01-04-PLAN.md — Auth middleware, login page, auth callback, language toggle
- [x] 01-05-PLAN.md — Role portal layouts, dashboards, account creation, logout

### Phase 2: Landing Page & UI Shell
**Goal**: Public-facing site and authenticated application shell are ready for feature development
**Depends on**: Phase 1
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, UI-04
**Success Criteria** (what must be TRUE):
  1. Visitor can view landing page with Dr. Fadi's bio, credentials, services, clinic address, and contact info
  2. Visitor can navigate to login from landing page
  3. Landing page displays in Arabic-first with English toggle
  4. Authenticated users see role-appropriate navigation (patient vs doctor vs secretary views)
  5. Application has clean medical aesthetic (light blues/greens, professional design)
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Medical theme, i18n translations, public layout with responsive navigation and footer
- [x] 02-02-PLAN.md — Landing page content (hero, services, contact) with SEO metadata

### Phase 3: Appointments & Scheduling
**Goal**: Patients and secretary can book appointments from doctor's available time slots, and doctor can manage schedule
**Depends on**: Phase 2
**Requirements**: APPT-01, APPT-02, APPT-03, APPT-04, APPT-05, APPT-06
**Success Criteria** (what must be TRUE):
  1. Doctor can define working days, hours, and holidays
  2. Patient or secretary can book appointment from available (unbooked) time slots
  3. System prevents double-booking through database constraints
  4. Patient or secretary can cancel appointment with 24-hour advance policy enforced
  5. Doctor and secretary see all appointments in calendar view
  6. Patient sees their own upcoming and past appointments
**Plans**: 5 plans

Plans:
- [ ] 03-01-PLAN.md — Fix database types, install shadcn/ui components, add schedule/appointment translations
- [ ] 03-02-PLAN.md — Doctor schedule management (server actions + UI for working days and holidays)
- [ ] 03-03-PLAN.md — Time slot generation utility and appointment server actions (book, cancel, list)
- [ ] 03-04-PLAN.md — Secretary booking page and doctor/secretary appointment list views
- [ ] 03-05-PLAN.md — Patient appointments read-only view (upcoming and past)

### Phase 4: Medical Records & Prescriptions
**Goal**: Doctor can complete patient visits with clinical notes, prescriptions, and file attachments
**Depends on**: Phase 3
**Requirements**: MEDR-01, MEDR-02, MEDR-03, MEDR-04, PRSC-01, PRSC-02, PRSC-03, PRSC-04, FILE-01, FILE-02, FILE-03
**Success Criteria** (what must be TRUE):
  1. Doctor or secretary can create patient accounts with demographics and contact information
  2. Doctor can create visit record with clinical notes for each patient visit
  3. Doctor can create prescription linked to visit with medication name, dosage, duration, instructions
  4. Prescription prints with clinic branding (logo, doctor info, contact) in proper Arabic RTL format
  5. Doctor or secretary can upload images and PDFs to patient record with proper access control
  6. Patient can view their own visit history, prescriptions, and files (read-only)
  7. Doctor and secretary can search patients by name, phone number, or date
**Plans**: 5 plans

Plans:
- [ ] 04-01-PLAN.md — DB migration (RLS fixes, schema changes), types, config, i18n translations
- [ ] 04-02-PLAN.md — Server actions for visits, prescriptions, files, and patient search
- [ ] 04-03-PLAN.md — Patient list with search, patient profile page with tabs
- [ ] 04-04-PLAN.md — Visit records UI, prescription form, printable prescription layout
- [ ] 04-05-PLAN.md — File upload/management UI, patient read-only records portal

### Phase 5: Pregnancy Tracking
**Goal**: Doctor can track pregnancies with gestational age calculations, measurements, and patient can view timeline
**Depends on**: Phase 4
**Requirements**: PREG-01, PREG-02, PREG-03, PREG-04
**Success Criteria** (what must be TRUE):
  1. Doctor can record pregnancy with LMP date, system auto-calculates gestational weeks and expected due date
  2. Doctor can record per-visit measurements (weight, blood pressure, fetal heartbeat)
  3. Patient can view their pregnancy timeline showing current week, due date, and measurement history
  4. Dashboard shows alerts for patients approaching due date (within 2 weeks)
  5. Pregnancy tracking handles edge cases (multiple pregnancies per patient, pregnancy status lifecycle)
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — Server actions, pregnancy utilities, and bilingual i18n translations
- [x] 05-02-PLAN.md — Pregnancy components and doctor patient profile tab integration
- [x] 05-03-PLAN.md — Patient pregnancy timeline page and dashboard due-date alerts

### Phase 6: Dashboard & Notifications
**Goal**: Doctor sees daily overview on login and patients receive appointment reminders
**Depends on**: Phase 5
**Requirements**: DASH-01, DASH-02, DASH-03, NOTF-01, NOTF-02
**Success Criteria** (what must be TRUE):
  1. Doctor sees today's appointments on login
  2. Dashboard shows urgent alerts (recent cancellations, patients near due date)
  3. Dashboard provides quick access to patient search
  4. System sends email reminder before scheduled appointment
  5. System sends email notification when appointment is cancelled
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Install deps (resend, shadcn command), DB migration, types, i18n translations
- [x] 06-02-PLAN.md — Doctor dashboard UI (stat cards, day-navigable appointments, autocomplete search, due-date alerts sidebar)
- [x] 06-03-PLAN.md — Email integration (reminder scheduling in bookAppointment, cancellation emails in cancelAppointment)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Security | 5/5 | ✅ Complete | 2026-02-10 |
| 2. Landing Page & UI Shell | 2/2 | ✅ Complete | 2026-02-10 |
| 3. Appointments & Scheduling | 0/5 | Planning complete | - |
| 4. Medical Records & Prescriptions | 0/5 | Planning complete | - |
| 5. Pregnancy Tracking | 3/3 | ✅ Complete | 2026-02-15 |
| 6. Dashboard & Notifications | 3/3 | ✅ Complete | 2026-02-16 |

---
*Roadmap created: 2026-02-07*
*Last updated: 2026-02-16 (Phase 6 complete — all phases done)*
