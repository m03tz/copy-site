# Dr. Fadi Women's Health Clinic

## What This Is

A web application for Dr. Fadi's obstetrics and gynecology clinic. It serves as a complete clinic management system where patients can view their appointments, medical records, and prescriptions, while the doctor and secretary manage appointments, patient records, pregnancy tracking, and prescriptions. The site includes a public-facing landing page introducing the clinic.

## Core Value

Patients can easily track their appointments and medical history, and the doctor can efficiently manage his clinic's daily operations — all in one place.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Public landing page (doctor bio, clinic address, contact info, login access)
- [ ] Three user roles: Patient (read-only), Doctor (full access), Secretary (manage appointments & patients)
- [ ] Doctor/secretary create patient accounts (no self-registration)
- [ ] Authentication with email/phone login
- [ ] Appointment booking by selecting available time slots
- [ ] Flexible work schedule management (doctor sets days, hours, holidays)
- [ ] Appointment cancellation with 24-hour policy
- [ ] Patient medical record (visit history with doctor notes)
- [ ] Prescription system (medication name, dosage, duration, instructions, printable prescription with clinic branding)
- [ ] File management (images + PDF uploads by doctor/secretary, viewable by patient)
- [ ] Pregnancy tracking (week calculation from LMP, expected due date, per-visit measurements: weight, blood pressure, fetal heartbeat)
- [ ] Doctor dashboard (today's appointments, urgent alerts — cancellations, patients near due date)
- [ ] Patient search (by name, phone number, date filter)
- [ ] Email notifications (appointment reminders)
- [ ] Arabic + English bilingual UI with RTL support
- [ ] Responsive design (mobile + desktop)

### Out of Scope

- Online payment / e-payment — Payment is handled at the clinic in person
- Video uploads — Storage/bandwidth concerns, only images and PDFs for now
- Real-time chat between doctor and patient — Out of scope for v1
- Mobile native app — Web responsive is sufficient
- Pregnancy exam schedule reminders — May add in v2
- Patient filtering by pregnancy status — May add in v2

## Current Milestone: v1.0 Clinic Management System

**Goal:** Build the complete clinic management web application with patient portal, doctor dashboard, appointment booking, medical records, prescriptions, and pregnancy tracking.

**Target features:**
- Authentication & role-based access (Patient, Doctor, Secretary)
- Public landing page
- Appointment booking & schedule management
- Patient medical records & prescriptions
- Pregnancy tracking
- Doctor dashboard with daily overview
- File management (images + PDFs)
- Email notifications
- Arabic + English bilingual UI with RTL support

## Context

- **Doctor:** Dr. Fadi Nadi Al-Sahleh — OB/GYN, infertility, and laparoscopic surgery specialist
- **Education:** Bachelor of Medicine & Surgery, Jordan University of Science & Technology (JUST)
- **Certifications:** Jordanian Board in OB/GYN, British Board Part 1
- **Experience:** Previously worked at King Abdullah University Hospital
- **Location:** Private clinic in Jerash, Jordan
- **Services:** OB/GYN consultations, infertility, laparoscopic surgery
- Target users are Arabic-speaking patients in a clinical setting
- Secretary handles front-desk operations (scheduling, patient registration)
- Medical records are sensitive — proper access control is critical
- Prescription printing needs clinic branding (logo, doctor info, contact)
- Pregnancy tracking is a core differentiator for OB/GYN clinics
- The doctor needs a quick daily overview when opening the site

## Constraints

- **Language**: Arabic-first with English support — RTL layout is primary
- **Design**: Clean, calm medical aesthetic (light blues/greens, professional)
- **Security**: Patient medical data must be properly secured with role-based access
- **Tech Stack**: Next.js 15 + Supabase (user choice) + TypeScript + Tailwind + shadcn/ui
- **Hosting**: To be determined
- **File Storage**: Images and PDFs only (no video)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No online payment | Doctor prefers in-clinic payment | — Pending |
| 24-hour cancellation policy | Prevents last-minute no-shows | — Pending |
| No self-registration | Doctor/secretary create all patient accounts for security | — Pending |
| Patient role is read-only | Patients view but don't modify their records | — Pending |
| Arabic-first bilingual | Primary audience is Arabic-speaking | — Pending |

---
*Last updated: 2026-02-06 after milestone v1.0 started*
