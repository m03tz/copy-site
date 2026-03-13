---
phase: 01-foundation-security
plan: 01
subsystem: infra
tags: [nextjs, tailwind, shadcn-ui, supabase, typescript, pnpm, i18n]

# Dependency graph
requires:
  - phase: none
    provides: "Initial empty project"
provides:
  - Next.js 15 app with TypeScript and App Router
  - Tailwind CSS 4 with @tailwindcss/postcss
  - shadcn/ui component library configured
  - Supabase client libraries installed
  - i18n setup with next-intl (Arabic default)
  - Form libraries (react-hook-form, zod)
  - Environment variable template
affects: [all subsequent phases - provides foundation]

# Tech tracking
tech-stack:
  added:
    - next@15.5.12
    - react@19.2.4
    - tailwindcss@4.1.18
    - @tailwindcss/postcss@4.1.18
    - @supabase/ssr@0.8.0
    - @supabase/supabase-js@2.95.3
    - next-intl@4.8.2
    - zod@4.3.6
    - react-hook-form@7.71.1
    - @hookform/resolvers@5.2.2
    - date-fns-tz@3.2.0
    - tailwindcss-animate@1.0.7
  patterns:
    - "Next.js App Router with root-level app/ directory (no src/)"
    - "pnpm for package management"
    - "shadcn/ui for component library"
    - "Arabic (ar) as default locale"

key-files:
  created:
    - package.json
    - next.config.ts
    - tsconfig.json
    - tailwind.config.ts
    - postcss.config.mjs
    - app/layout.tsx
    - app/page.tsx
    - app/globals.css
    - components.json
    - lib/utils.ts
    - i18n/request.ts
    - messages/ar.json
    - messages/en.json
    - .env.example
    - components/ui/button.tsx
    - components/ui/input.tsx
    - components/ui/label.tsx
    - components/ui/card.tsx
  modified: []

key-decisions:
  - "Use pnpm instead of npm/yarn for faster installs and disk efficiency"
  - "Tailwind CSS 4 with new @tailwindcss/postcss plugin architecture"
  - "Arabic (ar) as default locale for i18n per project requirements"
  - "Root-level app/ directory (no src/) following Next.js conventions"

patterns-established:
  - "Pattern 1: shadcn/ui components installed on-demand via CLI"
  - "Pattern 2: cn() utility function in lib/utils.ts for className merging"
  - "Pattern 3: Environment variables documented in .env.example"

# Metrics
duration: 11min
completed: 2026-02-09
---

# Phase 01 Plan 01: Project Scaffold Summary

**Next.js 15 app with Tailwind CSS 4, shadcn/ui, Supabase libraries, and Arabic-first i18n configured and building successfully**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-09T18:24:29Z
- **Completed:** 2026-02-09T21:35:31Z
- **Tasks:** 2
- **Files modified:** 24

## Accomplishments
- Working Next.js 15 development environment with TypeScript
- Tailwind CSS 4 configured with new PostCSS architecture
- shadcn/ui component library initialized with 4 base components
- All 7 required dependencies installed (Supabase, i18n, forms, validation)
- Arabic-first internationalization configured with next-intl
- Production build passes without errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 15 app and install all dependencies** - `858eacc` (feat)
2. **Task 2: Configure shadcn/ui and environment variables template** - `95193dc` (feat)

## Files Created/Modified
- `package.json` - Project dependencies and scripts
- `next.config.ts` - Next.js configuration with next-intl plugin
- `tsconfig.json` - TypeScript configuration with @/* path alias
- `app/layout.tsx` - Root layout component
- `app/page.tsx` - Homepage component
- `app/globals.css` - Global styles with Tailwind directives and shadcn/ui theme variables
- `components.json` - shadcn/ui configuration
- `lib/utils.ts` - cn() utility for className merging
- `i18n/request.ts` - next-intl configuration with Arabic default
- `messages/ar.json` - Arabic translations file
- `messages/en.json` - English translations file
- `.env.example` - Environment variable template for Supabase
- `components/ui/button.tsx` - shadcn Button component
- `components/ui/input.tsx` - shadcn Input component
- `components/ui/label.tsx` - shadcn Label component
- `components/ui/card.tsx` - shadcn Card component

## Decisions Made

**1. Manual Next.js initialization due to directory name**
- Directory contains space ("test calude"), causing create-next-app to fail
- Manually created all config files (package.json, tsconfig.json, next.config.ts, etc.)
- Rationale: Unblocks development while preserving existing directory structure

**2. Tailwind CSS 4 PostCSS plugin**
- Used @tailwindcss/postcss instead of legacy tailwindcss plugin
- Rationale: Tailwind v4 moved PostCSS functionality to separate package

**3. Arabic as default locale**
- Configured next-intl with Arabic (ar) as default locale
- Rationale: Per project decision "Arabic-first bilingual" for primary Arabic-speaking audience

**4. i18n configuration files created**
- Created i18n/request.ts and messages/{ar,en}.json for next-intl
- Rationale: Required by next-intl plugin to function; will be enhanced in Phase 6

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @tailwindcss/postcss package**
- **Found during:** Task 1 (First build attempt)
- **Issue:** Tailwind CSS 4 requires @tailwindcss/postcss plugin, build failed with "PostCSS plugin has moved to separate package"
- **Fix:** Installed @tailwindcss/postcss and updated postcss.config.mjs to use new plugin
- **Files modified:** package.json, pnpm-lock.yaml, postcss.config.mjs
- **Verification:** Build passes without errors
- **Committed in:** 858eacc (Task 1 commit)

**2. [Rule 3 - Blocking] Created i18n configuration for next-intl**
- **Found during:** Task 1 (Dev server start attempt)
- **Issue:** next-intl plugin requires i18n/request.ts configuration file, dev server failed to start
- **Fix:** Created i18n/request.ts with Arabic default locale and messages/{ar,en}.json translation files
- **Files modified:** i18n/request.ts, messages/ar.json, messages/en.json
- **Verification:** Dev server starts successfully
- **Committed in:** 858eacc (Task 1 commit)

**3. [Rule 3 - Blocking] Installed @eslint/eslintrc dependency**
- **Found during:** Task 1 (Build lint warnings)
- **Issue:** ESLint config tried to import @eslint/eslintrc but package was missing
- **Fix:** Installed @eslint/eslintrc as dev dependency
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** Lint warnings resolved
- **Committed in:** 858eacc (Task 1 commit)

**4. [Rule 3 - Blocking] Installed tailwindcss-animate and fixed globals.css**
- **Found during:** Task 2 (Build after shadcn init)
- **Issue:** shadcn init added @plugin "tailwindcss-animate" and @import "tw-animate-css" but package wasn't installed
- **Fix:** Installed tailwindcss-animate package and removed invalid @import line from globals.css
- **Files modified:** package.json, pnpm-lock.yaml, app/globals.css
- **Verification:** Build passes cleanly
- **Committed in:** 95193dc (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (4 blocking)
**Impact on plan:** All auto-fixes were necessary to unblock development. Tailwind CSS 4 and next-intl have different configuration requirements than anticipated. No scope creep - all changes support planned functionality.

## Issues Encountered

**1. Directory name with space**
- Problem: "test calude" directory name caused create-next-app to reject project name
- Solution: Manually created all Next.js configuration files instead of using CLI scaffolding
- Outcome: Functional Next.js project with identical structure to create-next-app output

**2. Tailwind CSS 4 architecture change**
- Problem: Tailwind v4 moved PostCSS plugin to separate package (@tailwindcss/postcss)
- Solution: Installed new package and updated postcss.config.mjs
- Outcome: Build works with Tailwind CSS 4.1.18

**3. shadcn/ui CSS import**
- Problem: shadcn init added invalid @import "tw-animate-css" to globals.css
- Solution: Removed invalid import, kept @plugin directive
- Outcome: Build passes, animations work via @plugin directive

## User Setup Required

**External services require manual configuration.** The following environment variables need to be set:

### Supabase Setup

1. Create a new Supabase project at https://supabase.com/dashboard
2. Go to Project Settings → API
3. Copy the following values to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` - Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` - service_role secret key

Template available in `.env.example`

**Verification:**
After adding environment variables, run `pnpm dev` and confirm no environment variable errors.

## Next Phase Readiness

**Ready for next phase:**
- Development environment fully functional
- All required dependencies installed
- Build and dev server working
- Component library available for UI development

**No blockers.**

Next phase (01-02) can proceed with Supabase database schema and authentication implementation.

## Self-Check: PASSED

All files and commits verified.

---
*Phase: 01-foundation-security*
*Completed: 2026-02-09*
