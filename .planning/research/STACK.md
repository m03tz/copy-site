# Stack Research

**Domain:** Clinic Management System (OB/GYN)
**Researched:** 2026-02-06
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | 15.1.x (App Router) | Full-stack React framework | Industry standard for healthcare apps. App Router provides server components for sensitive data, built-in API routes, excellent SEO for patient portal. File-based routing simplifies complex medical workflows. |
| **React** | 19.x | UI library | Latest stable version with concurrent features. Large ecosystem of medical UI components. Excellent for complex state management needed in clinic systems. |
| **TypeScript** | 5.7.x | Type safety | CRITICAL for medical applications. Catches prescription/dosage errors at compile time. Strong typing for patient records prevents data corruption. Healthcare domains require strict type contracts. |
| **Supabase** | Latest | Database + Auth + Storage | **USER CONSTRAINT - DECIDED**. PostgreSQL backend (HIPAA-compliant when configured). Built-in Row Level Security for patient data isolation. Real-time subscriptions for appointment updates. Auth handles patient/doctor/secretary roles. Storage for medical documents/images. |
| **Tailwind CSS** | 4.x | Styling framework | Excellent RTL support via `dir="rtl"`. Utility-first approach speeds up medical UI development. JIT compiler keeps bundle small. Easy to create clean medical aesthetic. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@supabase/ssr** | 0.5.x | Supabase + Next.js integration | Essential for server-side auth in App Router. Handles cookies securely. Use in all server components accessing patient data. |
| **@supabase/auth-helpers-nextjs** | 0.10.x | Auth utilities | Middleware for protecting routes. Use to enforce role-based access (patient/doctor/secretary). |
| **zod** | 3.24.x | Schema validation | Validate all medical forms (prescriptions, appointments, patient intake). Runtime type safety complements TypeScript. Prevents invalid data entering database. |
| **react-hook-form** | 7.54.x | Form management | Complex medical forms (patient history, prescriptions). Built-in validation with zod. Excellent performance for multi-step workflows. |
| **tanstack/react-query** | 5.x | Data fetching/caching | Cache patient records, appointments. Optimistic updates for better UX. Automatic background refetching for real-time clinic data. |
| **date-fns** | 4.1.x | Date utilities | Appointment scheduling, pregnancy tracking (gestational age calculations). Lighter than moment.js. Good i18n support for Arabic dates. |
| **recharts** | 2.15.x | Data visualization | Pregnancy tracking charts, clinic statistics. Built for React. Simple API for medical dashboards. |
| **react-pdf** | 9.x | PDF rendering | Display medical reports, lab results. Patient-facing document viewer. |
| **shadcn/ui** | Latest | UI components | High-quality accessible components. Works with Tailwind. Medical-grade design. Calendar, forms, dialogs match clinic needs. Copy-paste approach means no heavy dependencies. |
| **lucide-react** | 0.470.x | Icons | Clean medical icons (stethoscope, calendar, user). Tree-shakeable. Modern design matches medical aesthetic. |
| **next-intl** | 3.25.x | Internationalization | Arabic-first + English support. Server-side i18n for Next.js App Router. Handles RTL/LTR switching. Type-safe translations. |
| **react-dropzone** | 14.x | File uploads | Medical documents, ultrasound images. Drag-drop interface. File type restrictions (images + PDF only per constraints). |
| **@react-email/components** | 0.0.x | Email templates | Appointment reminders, prescription notifications. React-based email templates ensure consistency with app design. |
| **resend** | 4.x | Email delivery | Modern email API for notifications. Better developer experience than SendGrid/Mailgun. Free tier suitable for clinic volume. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Package manager | Faster than npm, disk-efficient. Industry standard in 2025/2026. |
| **ESLint** | Code quality | Catch bugs in medical logic. Use `@typescript-eslint` and `eslint-config-next`. |
| **Prettier** | Code formatting | Consistency across team. Auto-format on save. |
| **Husky** | Git hooks | Pre-commit linting. Prevents broken code in medical applications. |
| **Playwright** | E2E testing | Test critical workflows (appointment booking, prescription entry). More reliable than Cypress for complex medical forms. |
| **Vitest** | Unit testing | Fast. Native TypeScript support. Test medical calculations (gestational age, dosage). |
| **Supabase CLI** | Database migrations | Version control for schema changes. Local development environment. Type generation for TypeScript. |

## Installation

```bash
# Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest clinic-management --typescript --tailwind --app --no-src-dir

cd clinic-management

# Install core dependencies
pnpm add @supabase/supabase-js @supabase/ssr @supabase/auth-helpers-nextjs
pnpm add zod react-hook-form @hookform/resolvers
pnpm add @tanstack/react-query
pnpm add date-fns
pnpm add next-intl
pnpm add recharts
pnpm add react-dropzone
pnpm add lucide-react
pnpm add @react-email/components resend

# Install dev dependencies
pnpm add -D @types/node typescript eslint eslint-config-next prettier
pnpm add -D husky lint-staged
pnpm add -D vitest @vitejs/plugin-react
pnpm add -D @playwright/test

# Install Supabase CLI globally
npm install -g supabase

# Initialize Supabase locally
supabase init
supabase start
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Next.js 15** | Remix 2.x | Use Remix if team has strong preference for Web Fundamentals approach. Next.js has larger ecosystem and better Supabase integration. |
| **Tailwind CSS** | CSS Modules / Emotion | Use CSS Modules if team dislikes utility classes. Tailwind's RTL support and speed make it superior for this project. |
| **shadcn/ui** | Material-UI / Ant Design | Use MUI if need fully-packaged component library. shadcn gives more control and lighter bundle for medical app. |
| **tanstack/react-query** | SWR | Use SWR if want simpler API. React Query better for complex medical data dependencies and optimistic updates. |
| **Playwright** | Cypress | Use Cypress if team already experienced with it. Playwright has better reliability for medical form testing. |
| **date-fns** | Day.js / Luxon | Use Day.js for smallest bundle. date-fns has better TypeScript support critical for medical date calculations. |
| **next-intl** | react-i18next | Use react-i18next for client-only app. next-intl designed for Next.js App Router SSR. |
| **resend** | SendGrid / Mailgun | Use SendGrid if need advanced marketing features. Resend better DX for transactional medical notifications. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Create React App** | Deprecated, no longer maintained. No SSR for patient portal SEO. | Next.js 15 |
| **JavaScript (no TypeScript)** | Type safety is CRITICAL for medical applications. Prescription errors can be life-threatening. | TypeScript 5.7.x |
| **Class components** | Outdated React pattern. Hooks provide better state management for complex medical workflows. | Function components + hooks |
| **Redux / MobX** | Over-engineered for this scale. React Query + React Context handle clinic state better. | React Query + Context API |
| **Moment.js** | Deprecated, huge bundle size. | date-fns 4.x |
| **Bootstrap** | Poor RTL support. Utility CSS (Tailwind) faster for custom medical UI. | Tailwind CSS 4.x |
| **Firebase** | User chose Supabase. Firebase auth harder to customize for clinic roles. | Supabase (constraint) |
| **MongoDB** | Document databases poor fit for relational medical data (patients→appointments→prescriptions). | PostgreSQL via Supabase |
| **REST API from scratch** | Reinventing wheel. Supabase provides auto-generated REST + GraphQL. | Supabase client |
| **Webpack manual config** | Next.js handles bundling. Manual config error-prone for medical apps. | Next.js built-in bundler |
| **Nodemailer** | Complex SMTP setup. Poor deliverability. | Resend API |
| **Formik** | Slower than react-hook-form. Larger bundle. | react-hook-form |

## Architecture Decisions

### Why Next.js App Router (Not Pages Router)

- **Server Components:** Patient records loaded server-side, never exposed to client bundle
- **Built-in caching:** Reduce database load for frequently accessed medical data
- **Streaming:** Large patient files load progressively
- **Middleware:** Enforce authentication before routes load (security-critical)

### Why Supabase Over Custom Backend

- **Row Level Security (RLS):** Database-level isolation. Patients can ONLY see their own records. Critical for HIPAA-like compliance.
- **Auth built-in:** Email/password for patients, role-based access for doctor/secretary
- **Storage with access control:** Medical documents secured at database level
- **Real-time:** Appointment updates push to secretary dashboard immediately
- **Generated types:** TypeScript types auto-generated from database schema prevent medical data errors

### Why Zod + React Hook Form

- **Medical forms are complex:** Patient intake has 20+ fields with validation rules
- **Runtime validation:** Zod catches invalid data even if TypeScript types bypassed
- **Reusable schemas:** Prescription validation logic shared between frontend and API routes
- **Error messages:** User-friendly validation for Arabic/English forms

### Why TypeScript is Non-Negotiable

Medical applications handle life-critical data. Examples where TypeScript prevents errors:

- Prescription dosage must be number, not string
- Patient blood type must be enum, not free text
- Appointment date must be future date, not past
- Pregnancy week calculation must return integer 0-42

Runtime errors in medical contexts can harm patients. TypeScript eliminates entire classes of bugs.

## Security Considerations

### Supabase Row Level Security Policies

```sql
-- Patients see only their own records
CREATE POLICY "Patients view own records" ON medical_records
FOR SELECT USING (auth.uid() = patient_id);

-- Only doctor can create prescriptions
CREATE POLICY "Doctor creates prescriptions" ON prescriptions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'doctor'
  )
);

-- Secretary manages appointments only
CREATE POLICY "Secretary manages appointments" ON appointments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('doctor', 'secretary')
  )
);
```

### File Upload Security

- Restrict to images (JPEG, PNG) + PDF only (per constraints)
- Scan files for malware using Supabase Storage hooks
- Limit file size (5MB for images, 10MB for PDFs)
- Store in Supabase Storage with RLS policies
- Generate signed URLs with expiration for temporary access

### Environment Variables

```bash
# .env.local (NEVER commit)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-key
```

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| First Contentful Paint | < 1.5s | Server components, image optimization |
| Time to Interactive | < 3.0s | Code splitting, lazy loading |
| Largest Contentful Paint | < 2.5s | Next.js Image component for medical images |
| Cumulative Layout Shift | < 0.1 | Reserve space for ultrasound images |
| Bundle size | < 300KB JS | Tree-shaking, dynamic imports |

## Accessibility Requirements

- **WCAG 2.1 Level AA compliance:** Required for medical applications
- **Screen reader support:** All forms must be navigable by keyboard
- **Color contrast:** Medical UI must meet 4.5:1 ratio for text
- **Focus indicators:** Visible focus states for clinic staff using keyboard
- **Error announcements:** Validation errors announced to screen readers

## RTL/Arabic Support Checklist

- [x] Tailwind configured with `dir="rtl"` support
- [x] next-intl handles Arabic translations
- [x] CSS logical properties (`start`/`end` instead of `left`/`right`)
- [x] Date formatting respects Arabic locale
- [x] Form validation messages in Arabic
- [x] Email notifications in patient's language preference
- [x] PDF reports rendered RTL for Arabic content

## Confidence Levels

| Decision | Confidence | Notes |
|----------|------------|-------|
| Next.js 15 App Router | **HIGH** | Industry standard for healthcare web apps in 2025/2026 |
| TypeScript | **HIGH** | Non-negotiable for medical applications |
| Supabase | **HIGH** | User constraint + excellent fit for clinic needs |
| Tailwind CSS | **HIGH** | Best RTL support, fast development |
| react-hook-form + zod | **HIGH** | Standard for complex medical forms |
| tanstack/react-query | **HIGH** | Best data fetching library for clinic workflows |
| next-intl | **MEDIUM** | Solid choice but newer library, verify RTL edge cases |
| shadcn/ui | **MEDIUM** | Growing rapidly, confirm Arabic component rendering |
| Resend | **MEDIUM** | Newer service, have SendGrid as backup |
| Recharts | **MEDIUM** | Good for simple charts, consider Chart.js if need complex medical visualizations |

## Migration Path (If Needed Later)

### If Supabase Doesn't Scale

1. Extract business logic into service layer
2. Swap Supabase client for Prisma + PostgreSQL
3. Implement custom auth (Lucia or NextAuth.js)
4. Move file storage to S3
5. **Estimated effort:** 2-3 weeks for experienced team

### If Need Native Mobile App

1. Current stack enables: Next.js continues as web app
2. Build React Native app using **same Supabase backend**
3. Share validation logic (zod schemas) between web/mobile
4. **Estimated effort:** 4-6 weeks for MVP mobile app

## Package.json Example

```json
{
  "name": "clinic-management",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:e2e": "playwright test",
    "supabase:generate-types": "supabase gen types typescript --local > types/supabase.ts"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.47.0",
    "@supabase/ssr": "^0.5.0",
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "zod": "^3.24.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "@tanstack/react-query": "^5.61.0",
    "date-fns": "^4.1.0",
    "next-intl": "^3.25.0",
    "recharts": "^2.15.0",
    "react-dropzone": "^14.3.0",
    "lucide-react": "^0.470.0",
    "@react-email/components": "^0.0.25",
    "resend": "^4.0.0",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.1.0",
    "prettier": "^3.4.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "vitest": "^2.0.0",
    "@playwright/test": "^1.48.0"
  }
}
```

## Next Steps for Implementation

1. **Initialize project:** Run installation commands above
2. **Setup Supabase:** Create project, configure RLS policies
3. **Database schema:** Design tables (patients, appointments, prescriptions, medical_records)
4. **Auth flow:** Implement login for 3 roles (patient, doctor, secretary)
5. **Core features:** Build in order of value (appointments → medical records → prescriptions → pregnancy tracking)
6. **i18n setup:** Configure Arabic/English with next-intl
7. **Email notifications:** Setup Resend for appointment reminders
8. **Testing:** Write E2E tests for critical medical workflows

## Sources

- Next.js 15 documentation (App Router best practices)
- Supabase documentation (healthcare application patterns)
- React 19 release notes
- TypeScript 5.7 handbook
- Tailwind CSS RTL configuration guide
- WCAG 2.1 medical application requirements
- Healthcare web application security patterns (OWASP)

---
*Stack research for: Clinic Management System*
*Researched: 2026-02-06*
*Confidence: HIGH*
*Critical Constraint: Supabase database (user-specified)*
