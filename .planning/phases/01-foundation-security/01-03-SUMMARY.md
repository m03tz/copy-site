---
phase: 01-foundation-security
plan: 03
subsystem: internationalization-and-database-layer
tags: [next-intl, i18n, rtl, supabase, typescript, client-utilities]
requires: [01-01]
provides:
  - Arabic/English i18n with RTL/LTR layout switching
  - Three Supabase client utilities (browser, server, middleware)
  - Complete TypeScript database types
affects: [01-04, 01-05, 02-*]
tech-stack:
  added:
    - next-intl with routing and server config
    - @supabase/ssr client utilities
  patterns:
    - Locale-based routing with [locale] directory
    - RTL/LTR switching via dir attribute on html element
    - Three-pattern Supabase client architecture
    - Type-safe database access with generated TypeScript types
key-files:
  created:
    - i18n/routing.ts
    - i18n/request.ts
    - messages/ar.json
    - messages/en.json
    - app/[locale]/layout.tsx
    - app/[locale]/page.tsx
    - middleware.ts
    - lib/supabase/client.ts
    - lib/supabase/server.ts
    - lib/supabase/middleware.ts
    - lib/types/database.ts
  modified:
    - next.config.ts
decisions:
  - id: i18n-01
    what: Use localePrefix 'as-needed' for routing
    why: Arabic (default) uses root path /, English uses /en/
    impact: Cleaner URLs for primary Arabic audience
  - id: i18n-02
    what: Use Tahoma/Arial font stack for Arabic
    why: Widely available, good Arabic rendering
    impact: Consistent Arabic text display across browsers
  - id: supabase-01
    what: Three separate Supabase client patterns
    why: Different execution contexts (browser, server, middleware) require different cookie handling
    impact: Correct auth behavior in all contexts
  - id: supabase-02
    what: Manual database type definitions
    why: Schema not yet deployed, types match Plan 02 schema
    impact: Type safety ready before actual database deployment
metrics:
  duration: 5 min
  completed: 2026-02-09
---

# Phase 01 Plan 03: i18n & Supabase Clients Summary

**One-liner:** Arabic/English i18n with RTL/LTR switching using next-intl, plus three Supabase client utilities with comprehensive TypeScript database types.

## What Was Built

### Internationalization Framework
- **Locale routing**: Arabic (default at `/`) and English (at `/en/`)
- **RTL/LTR layout switching**: `dir="rtl"` for Arabic, `dir="ltr"` for English on `<html>` element
- **Translation files**: Comprehensive Arabic and English translations for common terms, auth, navigation
- **next-intl configuration**: Server-side config with routing and message loading
- **Language toggle**: Link to switch between Arabic and English

### Supabase Client Utilities
1. **Browser client** (`lib/supabase/client.ts`): For Client Components using `createBrowserClient`
2. **Server client** (`lib/supabase/server.ts`): For Server Components using `createServerClient` with Next.js cookies
3. **Middleware client** (`lib/supabase/middleware.ts`): For middleware with session refresh using `updateSession`

### Database Types
- **Complete TypeScript types** for all tables from Plan 02 schema:
  - profiles, patients, appointments, medical_records
  - prescriptions, patient_files, pregnancies, pregnancy_measurements
- **Type aliases** for convenience: `Profile`, `Patient`, `Appointment`, etc.
- **Enum types**: `UserRole`, `AppointmentStatus`, `PregnancyStatus`

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Configure next-intl with Arabic/English and RTL locale layout | 61269ec | i18n/routing.ts, i18n/request.ts, messages/ar.json, messages/en.json, app/[locale]/layout.tsx, app/[locale]/page.tsx, middleware.ts, next.config.ts |
| 2 | Create Supabase client utilities and database types | 1face77 | lib/supabase/client.ts, lib/supabase/server.ts, lib/supabase/middleware.ts, lib/types/database.ts |

## Decisions Made

### i18n Configuration
- **localePrefix: 'as-needed'**: Arabic (default) uses root path `/`, English uses `/en/`
- **Font handling**: Tahoma/Arial stack for Arabic, system fonts for English
- **Translation structure**: Organized by domain (common, auth, nav, language)

### Supabase Architecture
- **Three-client pattern**: Separate utilities for browser, server, and middleware contexts
- **Cookie handling**: Each client properly handles cookies for its execution context
- **Type safety**: Generic `<Database>` type parameter ensures type-safe queries

### Code Organization
- **Locale-based routing**: Replaced root `app/layout.tsx` with `app/[locale]/layout.tsx`
- **Middleware composition**: Single middleware file handles both i18n and (future) Supabase auth
- **Type location**: Database types in `lib/types/` for easy import

## Technical Highlights

### RTL/LTR Switching
```tsx
const dir = locale === 'ar' ? 'rtl' : 'ltr'
<html lang={locale} dir={dir}>
```
Tailwind logical properties (ms/me/ps/pe) automatically respond to `dir` attribute.

### Supabase Client Patterns
```typescript
// Browser (Client Components)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Server (Server Components)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Middleware
import { updateSession } from '@/lib/supabase/middleware'
const { supabaseResponse, user } = await updateSession(request)
```

### Type-Safe Database Access
```typescript
const { data } = await supabase
  .from('patients')
  .select('*')
// data is typed as Patient[]
```

## Verification Results

- **Build status**: All builds pass with no TypeScript errors
- **i18n routing**: Arabic at `/`, English at `/en/`
- **RTL/LTR**: Correct `dir` and `lang` attributes on `<html>` element
- **Translations**: 14+ keys in common, 12+ in auth, 7 in nav, 2 in language
- **Supabase clients**: All three utilities export correct functions
- **Database types**: All 8 tables defined with Row/Insert/Update types

## Next Phase Readiness

### Enables
- **Phase 01 Plan 04**: Login page can use translations and RTL layout
- **Phase 01 Plan 05**: Auth logic can use Supabase server client
- **Future plans**: All pages can use i18n and type-safe database access

### Requires Before Production
- [ ] Actual Supabase project deployed (currently .env.local not committed)
- [ ] Database schema applied (currently types are pre-generated)
- [ ] Consider generating types from actual schema using Supabase CLI

### Known Limitations
- No runtime locale switching within the same page (requires navigation)
- Font selection is basic (could add Google Fonts for better Arabic typography)
- Database types are manual (should be regenerated after schema changes)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

All created files verified:
- i18n/routing.ts ✓
- i18n/request.ts ✓
- messages/ar.json ✓
- messages/en.json ✓
- app/[locale]/layout.tsx ✓
- app/[locale]/page.tsx ✓
- middleware.ts ✓
- lib/supabase/client.ts ✓
- lib/supabase/server.ts ✓
- lib/supabase/middleware.ts ✓
- lib/types/database.ts ✓

All commits verified:
- 61269ec ✓
- 1face77 ✓
