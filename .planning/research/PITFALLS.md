# Pitfalls Research

**Domain:** Clinic Management System (OB/GYN)
**Researched:** 2026-02-06
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Inadequate Row-Level Security (RLS) on Supabase

**What goes wrong:** Medical records leak between patients. Secretary sees doctor's private notes. Patient A can query patient B's data through direct database access or API manipulation.

**Why it happens:**
- Relying solely on application-level permissions
- Assuming Supabase client libraries provide automatic isolation
- Not testing with different user roles using actual database credentials
- Copy-pasting RLS policies without understanding the security context

**How to avoid:**
- Write RLS policies BEFORE any application code
- Every table must have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- Test by generating Supabase tokens for each role and attempting cross-user queries
- Never trust `user_id` from client payload; always use `auth.uid()` in policies
- For medical_records: Patients see only their records, doctor sees all, secretary sees non-clinical fields only

**Warning signs:**
- RLS policies written after routes/components exist
- Policies using `current_user` instead of `auth.uid()`
- No role-based testing in development
- "We'll add security later" mentality

**Phase to address:** Foundation (Database Schema) - RLS must be in place before any data entry

---

### Pitfall 2: Appointment Collision and Race Conditions

**What goes wrong:** Two patients book the same time slot simultaneously. Secretary schedules over an existing appointment. Calendar shows free slots that are actually taken.

**Why it happens:**
- Client-side validation only (checking availability in browser)
- No database-level uniqueness constraints
- Optimistic UI updates without server confirmation
- Long-running transactions or stale reads

**How to avoid:**
- Database constraint: `UNIQUE(doctor_id, appointment_date, start_time)` with exclusion constraints for time ranges
- Use Supabase real-time subscriptions to update calendar availability instantly
- Implement optimistic locking with version columns or timestamp checks
- Transaction: check availability + insert appointment atomically
- Queue system for high-concurrency booking scenarios

**Warning signs:**
- Appointment conflicts in testing with concurrent users
- "First come first served" logic in application code only
- No unique constraints on appointment times in schema
- Calendar doesn't refresh automatically

**Phase to address:** Foundation (Database Schema) for constraints, Core Features (Appointments) for real-time sync

---

### Pitfall 3: Pregnancy Tracking Data Model Inflexibility

**What goes wrong:** System can't handle twins/multiples, miscarriages, or pregnancies spanning multiple years. Historical pregnancy data becomes orphaned when patients create "new" pregnancies.

**Why it happens:**
- Assuming one active pregnancy per patient
- Not modeling pregnancy as a lifecycle with states (active, completed, terminated)
- Hardcoding 40-week gestational assumptions
- Not planning for historical record-keeping

**How to avoid:**
- Pregnancy table with status field: active, delivered, miscarried, terminated
- Support multiple concurrent pregnancies (twins = one pregnancy record with multiple babies)
- Store both LMP (last menstrual period) and EDD (estimated due date) with manual override capability
- Archive completed pregnancies but maintain relationships to appointments/records
- Design for edge cases: IVF (no LMP), surrogacy, adoption records

**Warning signs:**
- Boolean `is_pregnant` field on patient table
- No pregnancy history beyond current pregnancy
- Gestational age calculated only, never stored
- No status field for pregnancy lifecycle

**Phase to address:** Foundation (Database Schema) - data model must support edge cases from day one

---

### Pitfall 4: Prescription Generation Without Print/PDF Verification

**What goes wrong:** Prescriptions print with cut-off text, wrong language direction (RTL/LTR issues), missing doctor signature, or illegible formatting. Doctor discovers issues only when printing for patient.

**Why it happens:**
- Testing prescriptions only on screen
- CSS print media queries added as afterthought
- RTL text breaking in PDF libraries
- Assuming browser print = PDF export quality

**How to avoid:**
- Design prescription template with print-first mindset
- Use dedicated PDF generation library (react-pdf, pdfmake) with RTL support
- Test every prescription on actual printer (not just PDF viewer)
- Include preview mode showing exact print output before generating
- Store generated PDFs (not regenerate on demand) to ensure consistency
- Legal requirements: doctor signature/stamp space, pharmacy sections, controlled substance fields

**Warning signs:**
- No print stylesheet or PDF library chosen yet
- "We'll handle printing later"
- Preview button missing from prescription UI
- No physical printer testing in acceptance criteria

**Phase to address:** Core Features (Prescriptions) - must be print-ready, not just screen-ready

---

### Pitfall 5: File Upload Security and Medical Record Attachment Chaos

**What goes wrong:** Patients upload 50MB uncompressed images. Malicious files uploaded. No way to find "that ultrasound from March." Files stored without encryption. BLOB storage costs explode.

**Why it happens:**
- No file size/type validation
- Storing original filenames without sanitization
- No tagging/categorization system for medical files
- Missing virus scanning integration
- No compression pipeline

**How to avoid:**
- Supabase Storage with bucket policies: strict MIME type validation (images, PDFs only)
- Client-side compression before upload (browser-image-compression library)
- Server-side file size limits (5MB for images, 10MB for PDFs)
- Metadata schema: file_type (lab_result, ultrasound, prescription, insurance), date, associated_appointment_id
- Generate UUIDs for filenames, store original name in metadata only
- RLS on storage buckets matching database RLS policies
- Antivirus integration (ClamAV or cloud service) for uploads

**Warning signs:**
- Direct file upload to Supabase without validation
- No categorization beyond folders
- Original filenames used as storage keys
- "Upload any file" functionality
- No compression or size limits

**Phase to address:** Core Features (Medical Records) + Infrastructure (Storage Security)

---

### Pitfall 6: Timezone and Date Handling for Appointments

**What goes wrong:** Appointment scheduled at 3 PM shows as 6 PM for secretary in different timezone. Daylight saving time causes missed appointments. Pregnancy tracking shows wrong gestational week.

**Why it happens:**
- Storing JavaScript Date objects directly
- Using local time instead of UTC
- Not specifying clinic's operational timezone
- Date arithmetic without timezone libraries

**How to avoid:**
- Store all timestamps in UTC in database
- Define clinic timezone explicitly (likely Asia/Damascus or similar)
- Use date-fns-tz or Luxon for timezone conversions
- Display times in clinic timezone for all users (ignore user's device timezone)
- For pregnancy tracking: use date-only fields (not timestamps) for LMP/EDD
- Supabase stores timestamps with timezone by default - use `timestamptz` type

**Warning signs:**
- Using `new Date()` without timezone conversion
- Appointment times drift during DST changes
- No timezone configuration in environment variables
- Gestational age calculations using `Date.now()`

**Phase to address:** Foundation (Technical Setup) - establish timezone patterns before any date handling

---

### Pitfall 7: Bilingual Content Strategy Failure (Arabic/English)

**What goes wrong:** Mixing Arabic and English in same field breaks UI. Medical terms have no Arabic equivalents. RTL CSS fights with LTR content. Search doesn't work across languages.

**Why it happens:**
- Not deciding on content storage strategy upfront (separate fields vs. single field with language tags)
- Assuming all content translates 1:1
- Not planning for medical terminology that must stay in English
- Missing bidi (bidirectional text) handling

**How to avoid:**
- Content strategy decision: Store medical terms in English + display translations from dictionary, or store both languages in separate columns?
- Recommended: `diagnosis_code` (English), `diagnosis_display_ar`, `diagnosis_display_en`
- Use `dir="auto"` or explicit `dir="rtl"/"ltr"` on text containers
- Never concatenate RTL and LTR strings without markup
- Test with real Arabic medical content (not Lorem Ipsum)
- Consider hybrid approach: UI translated, medical content stays English with Arabic glossary

**Warning signs:**
- No decision on translation architecture
- Single `name` field expected to hold both languages
- No RTL testing until late development
- Assuming Google Translate is sufficient for medical terms

**Phase to address:** Foundation (Technical Setup) - decide translation architecture; UI Phase (Components) - implement RTL properly

---

### Pitfall 8: Email Notification Failure Without Fallback

**What goes wrong:** Appointment reminders never sent. Patient misses appointment. No audit trail of communications. Email provider rate limits hit. Arabic text displays as garbage in email clients.

**Why it happens:**
- Fire-and-forget email sending without confirmation
- No retry mechanism for failed sends
- Not testing email rendering across clients (Gmail, Outlook, mobile)
- Missing notification_status tracking

**How to avoid:**
- Use Supabase Edge Functions + Resend/SendGrid with webhook confirmations
- Store notification log: `notifications` table (type, recipient, status, sent_at, delivered_at, error)
- Implement retry queue with exponential backoff
- Test Arabic email rendering in major clients (RTL in email is notoriously broken)
- Fallback strategy: if email fails, show in-app notification
- Never block user actions waiting for email confirmation
- Content-Type: text/html; charset=utf-8 for Arabic support

**Warning signs:**
- Email sending in same request as appointment creation
- No notification history table
- "It works on my machine" email testing
- No error handling for SMTP failures

**Phase to address:** Core Features (Appointments) + Infrastructure (Email Service)

---

### Pitfall 9: Audit Trail and Data History Blindness

**What goes wrong:** Patient disputes appointment time change. No record of who modified medical record. Deleted data is gone forever. Can't answer "who changed this prescription?"

**Why it happens:**
- Not implementing audit logging from start
- Believing soft deletes are sufficient
- Performance concerns about history tables
- "We'll add auditing later"

**How to avoid:**
- Every critical table needs audit triggers or application-level logging
- Track: user_id, action (INSERT/UPDATE/DELETE), timestamp, old_values, new_values
- Supabase approach: Use `audit_log` table with triggers or implement in application
- For soft deletes: `deleted_at` timestamp + `deleted_by` user_id
- Consider: pg_audit extension or temporal tables for full history
- GDPR compliance: audit log survives patient data deletion (anonymized)

**Warning signs:**
- No `updated_at`, `updated_by` columns
- Hard deletes in database (DELETE without WHERE clause safety)
- No logging infrastructure
- "Version history" not in requirements

**Phase to address:** Foundation (Database Schema) - add audit columns; Infrastructure - implement logging

---

### Pitfall 10: Performance Degradation with Patient History Growth

**What goes wrong:** Loading patient profile takes 10 seconds after 2 years. Appointment list times out. Pregnancy tracking query scans entire database.

**Why it happens:**
- No pagination on medical records list
- Missing database indexes on foreign keys and date columns
- N+1 queries loading related data
- Not using Supabase's query optimization features

**How to avoid:**
- Index strategy from day one: `CREATE INDEX idx_appointments_patient_date ON appointments(patient_id, appointment_date DESC)`
- Pagination: load last 20 records by default, "Load More" for history
- Use Supabase `.select()` with joins to avoid N+1: `.select('*, medical_records(*)')`
- Lazy-load tabs (don't load all patient data on profile open)
- Consider partitioning for appointment/medical_records tables (by year)
- Monitor Supabase slow query logs regularly

**Warning signs:**
- No `.limit()` or pagination in queries
- Missing indexes on foreign keys
- Loading full patient history on every page
- No query performance testing with realistic data (1000+ patients, 5+ years)

**Phase to address:** Foundation (Database Schema) - indexes; Core Features - pagination implementation

---

### Pitfall 11: Secretary Permission Scope Creep

**What goes wrong:** Secretary accidentally modifies diagnosis. Secretary sees doctor's private clinical notes. Role becomes "admin lite" with excessive permissions.

**Why it happens:**
- Vague role definition ("manage appointments and patients")
- Not distinguishing between patient demographics vs. medical data
- UI doesn't reflect permission boundaries
- Pressure to "just give access" during development

**How to avoid:**
- Explicit permission matrix:
  - Secretary CAN: view patient demographics, create/edit/cancel appointments, manage patient contact info
  - Secretary CANNOT: view/edit medical records, diagnoses, prescriptions, clinical notes, pregnancy tracking
- Implement field-level RLS or separate tables for clinical vs. administrative data
- UI enforces permissions: hide inaccessible sections entirely (not just disable)
- Test with actual secretary persona (not developer with override)

**Warning signs:**
- Single "staff" role for both doctor and secretary
- No permission matrix document
- Secretary UI mockups showing medical data
- "We'll restrict it later" comments

**Phase to address:** Foundation (Access Control Design) - define before schema; Core Features - enforce in every feature

---

### Pitfall 12: Pregnancy Tracking Without Medical Validation

**What goes wrong:** System allows 50-week pregnancies. LMP date is in the future. Twins marked as separate pregnancies. Gestational age calculations are medically incorrect.

**Why it happens:**
- Developers unfamiliar with obstetric standards
- No medical validation rules in requirements
- Trusting user input without constraints
- Not consulting medical professional during design

**How to avoid:**
- Constraints: LMP must be in past, gestational age capped at 42 weeks, EDD calculated using Naegele's rule (LMP + 280 days)
- Warning system: flag pregnancies >40 weeks for review
- Support corrections: allow manual EDD adjustment (IVF, ultrasound dating)
- Multiple babies = single pregnancy record with count field
- Edge case handling: molar pregnancy, ectopic (still track in system)
- Validation: work with Dr. Fadi to define business rules

**Warning signs:**
- No medical constraints in schema
- Gestational age without upper bounds
- No doctor review of pregnancy tracking logic
- Calculator built without medical reference

**Phase to address:** Foundation (Requirements) - get medical validation rules; Core Features (Pregnancy Tracking) - implement constraints

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip RLS, use app-level auth only | Faster initial development | Major security vulnerability, expensive retrofit | NEVER acceptable for medical data |
| Use browser localStorage for medical data | Simple caching | HIPAA/privacy violation, XSS risk | NEVER acceptable |
| Generic "notes" field instead of structured diagnosis | Easy to implement | Impossible to query, report, or analyze | Acceptable for truly unstructured comments only |
| Store files in database BLOBs | No separate storage service | Database bloat, poor performance | Not acceptable beyond small profile images |
| Hard-code Arabic translations in components | No i18n library needed | Impossible to maintain, translator can't help | NEVER - use i18n from start |
| Skip email delivery confirmation | Simpler email code | No proof of notification, legal risk | Not acceptable for appointment reminders |
| Client-side only form validation | Better UX, instant feedback | Security hole, data integrity risk | Acceptable only WITH server-side validation |
| Single "active" pregnancy per patient | Simpler data model | Can't handle twins, history, edge cases | Not acceptable for OB/GYN system |
| No audit logging initially | Faster development | Can't trace changes, compliance issue | Acceptable for non-critical tables only (config, etc.) |
| Load all patient data at once | Simpler queries | Performance collapse over time | Not acceptable beyond first prototype |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS policies reference client-provided user_id | Patient A accesses patient B's records | Always use `auth.uid()` in RLS, never trust client payload |
| Storing API keys in client code | Keys exposed in bundle, unauthorized access | Environment variables server-side only, Supabase anon key for client |
| No file type validation on uploads | Malware upload, XSS via SVG | Whitelist MIME types: image/jpeg, image/png, application/pdf only |
| Logging sensitive medical data | PII in logs, compliance violation | Sanitize logs, use audit tables instead, never log full records |
| Missing rate limiting on appointments | Spam bookings, DoS | Supabase Edge Function rate limits, per-user booking throttle |
| Sharing database credentials across roles | Privilege escalation | Supabase RLS + role-based auth tokens, never reuse credentials |
| No session timeout for doctor account | Unattended workstation access | Implement auto-logout after 15 min inactivity, require re-auth for prescriptions |
| Public storage bucket for medical files | Google-indexable patient data | Private buckets with signed URLs, RLS on storage, short-lived tokens |
| SQL injection via search fields | Database compromise | Use Supabase parameterized queries, never string concatenation |
| Missing HTTPS enforcement | MITM attacks on medical data | Supabase forces HTTPS, verify all custom domains use TLS 1.3+ |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Calendar shows availability in patient's timezone | Doctor and patient book different times | Display all times in clinic timezone with explicit label |
| Pregnancy tracking requires LMP even for IVF | Can't track IVF pregnancies | Allow direct EDD entry with "calculated from" dropdown (LMP, IVF, ultrasound) |
| Arabic UI uses English date formats (MM/DD/YYYY) | Confusing for Arabic users | Use locale-aware formatting: DD/MM/YYYY for Arabic regions |
| "Delete" button without confirmation | Accidental data loss | Confirmation modal + soft delete with undo option |
| Prescription form in single long page | Overwhelming, scroll fatigue | Wizard steps: medication selection → dosage → duration → preview → print |
| Search requires exact spelling | Frustration finding "Ahmad" vs "Ahmed" | Fuzzy search, autocomplete, handle Arabic name variations |
| No indication prescription is printing | User clicks print 5 times | Show loading state, disable button, confirm generation |
| Appointment conflicts discovered after form submission | Wasted time, frustration | Real-time availability check while selecting time slot |
| Medical records sorted chronologically only | Hard to find specific type (labs, prescriptions) | Filter tabs: All / Lab Results / Prescriptions / Notes / Files |
| No mobile optimization for patient portal | Unusable on phones (primary device for many patients) | Mobile-first design, responsive tables, touch-friendly calendars |
| Error messages in English only | Arabic-speaking patients lost | All user-facing errors in both languages with clear resolution steps |
| Required fields not marked | Form submission fails unexpectedly | Asterisk + "Required" label in current language, validate on blur |

---

## "Looks Done But Isn't" Checklist

- [ ] Appointments can be booked but no duplicate prevention at database level
- [ ] Prescription prints on screen but breaks on actual printer or PDF export
- [ ] Arabic text displays but RTL layout breaks with mixed content
- [ ] File upload works but no size limits, virus scanning, or encryption
- [ ] Patient can view records but secretary can too (RLS not enforced)
- [ ] Email notifications send but no retry on failure or delivery confirmation
- [ ] Pregnancy tracking calculates gestational age but allows impossible dates
- [ ] Search works but performance degrades with >100 patients
- [ ] Password authentication works but no session timeout or auto-logout
- [ ] Data can be deleted but no audit trail of who deleted what
- [ ] UI looks good in Chrome but broken in Safari/Firefox mobile
- [ ] Appointment reminders schedule but timezone handling is wrong
- [ ] Medical records display but no pagination (will break with 1000+ records)
- [ ] Form validation works client-side but can be bypassed with direct API calls
- [ ] Prescription generated but not stored (regeneration shows different timestamp/version)
- [ ] Patient demographics editable but changes not logged
- [ ] Backup strategy "planned" but not implemented or tested
- [ ] Translations exist but medical terms are machine-translated incorrectly
- [ ] Storage works but no cleanup of orphaned files when records deleted
- [ ] Reports generate but timeout with realistic data volumes

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Inadequate RLS | Foundation (Database Schema) | Attempt cross-user data access with test tokens |
| Appointment collisions | Foundation (Schema) + Core Features (Appointments) | Concurrent booking simulation, check for unique constraints |
| Pregnancy data model inflexibility | Foundation (Database Schema) | Create twin pregnancy, miscarriage, IVF scenarios |
| Prescription print failures | Core Features (Prescriptions) | Print test prescription on physical printer, export PDF |
| File upload security gaps | Core Features (Medical Records) + Infrastructure | Upload 50MB file, attempt .exe upload, check encryption |
| Timezone handling bugs | Foundation (Technical Setup) | Schedule appointment during DST transition, verify UTC storage |
| Bilingual content strategy failure | Foundation (Technical Setup) + UI Phase | Display mixed Arabic/English, check RTL rendering |
| Email notification failures | Core Features (Appointments) + Infrastructure | Force email failure, verify retry and logging |
| Missing audit trail | Foundation (Database Schema) + Infrastructure | Modify record, verify change log with user and timestamp |
| Performance degradation | Foundation (Schema - indexes) + All Features | Load patient with 500+ appointments, measure query time |
| Secretary permission creep | Foundation (Access Control Design) | Log in as secretary, attempt to view clinical notes |
| Pregnancy tracking without validation | Foundation (Requirements) + Core Features | Enter LMP in future, 50-week pregnancy, verify rejection |

---

## Phase-Specific Pitfall Priorities

### Foundation Phase - MUST ADDRESS
1. RLS policies (Pitfall #1) - Cannot retrofit security
2. Appointment constraints (Pitfall #2) - Database design issue
3. Pregnancy data model (Pitfall #3) - Schema change is painful later
4. Timezone strategy (Pitfall #6) - Architectural decision
5. Bilingual architecture (Pitfall #7) - Framework choice
6. Audit columns (Pitfall #9) - Add them now or never
7. Database indexes (Pitfall #10) - Performance foundation
8. Permission matrix (Pitfall #11) - Security design
9. Medical validation rules (Pitfall #12) - Requirements gathering

### Core Features Phase - MUST ADDRESS
10. Prescription printing (Pitfall #4) - Feature definition
11. File upload security (Pitfall #5) - Feature complete means secure
12. Email with fallback (Pitfall #8) - Reliability requirement

### Polish Phase - NICE TO HAVE BUT IMPORTANT
- UX pitfalls (most can be refined iteratively)
- Performance optimization beyond basics
- Advanced audit reporting

---

## Red Flags in Development

These indicate you're about to fall into a pitfall:

- "We'll add security later" - No, RLS is foundational
- "It works on my machine" - Test on actual devices, printers, email clients
- "Users won't do that" - They will; add constraints
- "Just use a notes field" - Structure beats flexibility for medical data
- "Translation is just find/replace" - RTL and medical terminology need strategy
- "Soft delete is enough" - You need audit trails
- "Performance is fine with test data" - Load 1000+ patients, 5 years of records
- "Secretary needs full access for now" - Permissions are hard to take away
- "We'll handle edge cases later" - Twins, IVF, miscarriages are not edge cases in OB/GYN
- "Email always works" - It doesn't; plan for failures

---

## Questions to Ask Before Marking Features "Done"

**Appointments:**
- Can two users book the same slot simultaneously? (Race condition test)
- Does the database prevent overlapping appointments? (Constraint verification)
- Are all times displayed in clinic timezone? (Timezone audit)
- What happens if email reminder fails? (Failure mode test)

**Medical Records:**
- Can patient A access patient B's records with direct API call? (RLS penetration test)
- Can secretary view clinical notes? (Permission boundary test)
- Who changed this record and when? (Audit trail verification)
- What happens with 500 records? (Performance test)

**Prescriptions:**
- Does Arabic text render correctly in PDF? (Print verification)
- Is the prescription stored or regenerated? (Data integrity check)
- Can patient edit prescription after doctor creates it? (Permission test)
- Does it print correctly on actual printer? (Physical hardware test)

**Pregnancy Tracking:**
- Can I enter a future LMP date? (Validation test)
- How does system handle twins? (Data model test)
- What if gestational age is 50 weeks? (Boundary test)
- Can I track pregnancy history after delivery? (Lifecycle test)

**File Uploads:**
- Can I upload a 100MB file? (Size limit test)
- Can I upload an .exe file? (Type validation test)
- Are files encrypted at rest? (Security audit)
- Can patient A see patient B's files? (RLS storage test)

---

*Pitfalls research for: Clinic Management System*
*Researched: 2026-02-06*
*Use this document to inform ROADMAP.md and prevent costly mistakes*
