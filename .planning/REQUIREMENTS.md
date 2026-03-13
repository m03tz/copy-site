# Requirements: Dr. Fadi Women's Health Clinic

**Defined:** 2026-02-06
**Core Value:** Patients can easily track their appointments and medical history, and the doctor can efficiently manage his clinic's daily operations — all in one place.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Landing Page

- [ ] **LAND-01**: Visitor can view public landing page with doctor bio, credentials, and services
- [ ] **LAND-02**: Visitor can see clinic address (Jerash, Jordan) and contact information
- [ ] **LAND-03**: Visitor can navigate to login from landing page
- [ ] **LAND-04**: Landing page displays in Arabic-first with English toggle

### Authentication & Roles

- [ ] **AUTH-01**: Doctor or secretary can create patient accounts (no self-registration)
- [ ] **AUTH-02**: User can log in with email or phone number
- [ ] **AUTH-04**: User session persists across browser refresh
- [ ] **AUTH-05**: System enforces three roles: Patient (read-only), Doctor (full access), Secretary (manage appointments & patients)
- [ ] **AUTH-06**: Role-based access control restricts pages and actions per role

### Appointments

- [ ] **APPT-01**: Patient or secretary can book appointment by selecting from available time slots
- [ ] **APPT-02**: Doctor can define working days, hours, and holidays
- [ ] **APPT-03**: System shows only available (unbooked) time slots for booking
- [ ] **APPT-04**: Patient or secretary can cancel appointment with 24-hour advance policy enforced
- [ ] **APPT-05**: Doctor and secretary can view all appointments in calendar view
- [ ] **APPT-06**: Patient can view their own upcoming and past appointments

### Medical Records

- [ ] **MEDR-01**: Doctor can create visit record with clinical notes for each patient visit
- [ ] **MEDR-02**: Patient can view their own visit history (read-only)
- [ ] **MEDR-03**: Doctor and secretary can search patients by name, phone number, or date
- [ ] **MEDR-04**: Patient profile stores demographics and contact information

### Prescriptions

- [ ] **PRSC-01**: Doctor can create prescription (medication name, dosage, duration, instructions)
- [ ] **PRSC-02**: Prescription is printable with clinic branding (logo, doctor info, contact)
- [ ] **PRSC-03**: Patient can view their own prescriptions (read-only)
- [ ] **PRSC-04**: Prescriptions are linked to specific visits

### File Management

- [ ] **FILE-01**: Doctor or secretary can upload images and PDFs to patient record
- [ ] **FILE-02**: Patient can view their own uploaded files (read-only)
- [ ] **FILE-03**: Files are securely stored with role-based access control

### Pregnancy Tracking

- [ ] **PREG-01**: Doctor can record pregnancy with LMP date, auto-calculating gestational weeks and expected due date
- [ ] **PREG-02**: Doctor can record per-visit measurements (weight, blood pressure, fetal heartbeat)
- [ ] **PREG-03**: Patient can view their pregnancy timeline and measurements (read-only)
- [ ] **PREG-04**: Dashboard alerts for patients approaching due date

### Doctor Dashboard

- [x] **DASH-01**: Doctor sees today's appointments on login
- [x] **DASH-02**: Dashboard shows urgent alerts (cancellations, patients near due date)
- [x] **DASH-03**: Dashboard provides quick access to patient search

### Notifications

- [x] **NOTF-01**: System sends email reminder before scheduled appointment
- [x] **NOTF-02**: System sends email notification on appointment cancellation

### UI & Localization

- [ ] **UI-01**: Interface supports Arabic (primary) and English with language toggle
- [ ] **UI-02**: Full RTL layout support for Arabic
- [ ] **UI-03**: Responsive design works on mobile and desktop
- [ ] **UI-04**: Clean medical aesthetic (light blues/greens, professional design)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Pregnancy

- **PREG-V2-01**: Pregnancy exam schedule reminders
- **PREG-V2-02**: Patient filtering by pregnancy status
- **PREG-V2-03**: Growth charts for fetal development visualization
- **PREG-V2-04**: Prescription templates for common OB/GYN medications

### Advanced Features

- **ADV-V2-01**: SMS notifications (in addition to email)
- **ADV-V2-02**: Smart scheduling (different durations for first visit vs follow-up)
- **ADV-V2-03**: Patient education library (week-by-week pregnancy info)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Online payment / e-payment | Payment handled at clinic in person |
| Video uploads | Storage/bandwidth concerns |
| Real-time chat (doctor-patient) | Complexity too high for v1 |
| Mobile native app | Web responsive is sufficient |
| Risk assessment tools | Clinical decision support deferred |
| Vaccination schedule tracking | May add in v2+ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAND-01 | Phase 2 | Pending |
| LAND-02 | Phase 2 | Pending |
| LAND-03 | Phase 2 | Pending |
| LAND-04 | Phase 2 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| APPT-01 | Phase 3 | Pending |
| APPT-02 | Phase 3 | Pending |
| APPT-03 | Phase 3 | Pending |
| APPT-04 | Phase 3 | Pending |
| APPT-05 | Phase 3 | Pending |
| APPT-06 | Phase 3 | Pending |
| MEDR-01 | Phase 4 | Pending |
| MEDR-02 | Phase 4 | Pending |
| MEDR-03 | Phase 4 | Pending |
| MEDR-04 | Phase 4 | Pending |
| PRSC-01 | Phase 4 | Pending |
| PRSC-02 | Phase 4 | Pending |
| PRSC-03 | Phase 4 | Pending |
| PRSC-04 | Phase 4 | Pending |
| FILE-01 | Phase 4 | Pending |
| FILE-02 | Phase 4 | Pending |
| FILE-03 | Phase 4 | Pending |
| PREG-01 | Phase 5 | Complete |
| PREG-02 | Phase 5 | Complete |
| PREG-03 | Phase 5 | Complete |
| PREG-04 | Phase 5 | Complete |
| DASH-01 | Phase 6 | Complete |
| DASH-02 | Phase 6 | Complete |
| DASH-03 | Phase 6 | Complete |
| NOTF-01 | Phase 6 | Complete |
| NOTF-02 | Phase 6 | Complete |
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 1 | Pending |
| UI-03 | Phase 1 | Pending |
| UI-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39 (100%)
- Unmapped: 0

**Phase Distribution:**
- Phase 1 (Foundation & Security): 8 requirements
- Phase 2 (Landing Page & UI Shell): 5 requirements
- Phase 3 (Appointments & Scheduling): 6 requirements
- Phase 4 (Medical Records & Prescriptions): 11 requirements
- Phase 5 (Pregnancy Tracking): 4 requirements
- Phase 6 (Dashboard & Notifications): 5 requirements

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-16 — Phase 6 requirements marked Complete*
