---
phase: 02-landing-page-ui-shell
plan: 01
subsystem: ui
tags: [next-intl, tailwind-css, oklch, responsive, navigation, i18n, arabic, rtl]

# Dependency graph
requires:
  - phase: 01-foundation-security
    provides: "next-intl routing, app/[locale] structure, LanguageToggle component, globals.css, message files"
provides:
  - "Medical color palette (10 oklch CSS variables) via globals.css"
  - "Tailwind theme mappings for medical-blue, medical-green, medical-teal color scales"
  - "Arabic + English landing page translations (26 keys each) in messages/"
  - "Responsive public navigation bar (sticky, desktop links, mobile hamburger)"
  - "Footer with clinic name and copyright"
  - "(public) route group layout wrapping navigation + footer around public pages"
  - "Login page relocated under (public)/(auth)/ inheriting public layout"
affects:
  - "02-02: Landing page sections (hero, about, services, contact) use these translations and components"
  - "All future public-facing pages use (public) layout"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route group (public) for shared navigation/footer across public pages"
    - "oklch color values for medical palette in :root CSS custom properties"
    - "Tailwind 4 @theme inline block for custom color scale mappings"
    - "Server Component footer using getTranslations from next-intl/server"
    - "Client Component navigation using useTranslations + useState hamburger"

key-files:
  created:
    - "components/landing/navigation.tsx"
    - "components/landing/footer.tsx"
    - "app/[locale]/(public)/layout.tsx"
    - "app/[locale]/(public)/(auth)/login/page.tsx"
  modified:
    - "app/globals.css"
    - "messages/ar.json"
    - "messages/en.json"

key-decisions:
  - "Login page moved under (public)/(auth)/ so it inherits navigation - consistent UX without layout duplication"
  - "Navigation as 'use client' component (needs useState for hamburger) while footer stays Server Component"
  - "Medical colors defined in :root as CSS custom properties, mapped to Tailwind via @theme inline"
  - "Logical CSS properties (ms/me/ps/pe, text-start) used in navigation for RTL/LTR compatibility"

patterns-established:
  - "Public layout pattern: (public) route group with shared nav/footer wrapping children"
  - "Medical color naming: medical-blue-{50|100|500|600|700}, medical-green-{50|100|500}, medical-teal-{50|500}"
  - "Landing translations under 'landing' namespace in both ar.json and en.json"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 2 Plan 01: Medical Theme, Translations & Public Layout Summary

**Medical oklch color palette, 26-key Arabic/English landing translations, and responsive (public) route group layout with sticky navigation and footer**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T05:09:18Z
- **Completed:** 2026-02-10T05:12:27Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added 10 medical color CSS variables in oklch format (blue/green/teal palette) with Tailwind 4 theme mappings enabling classes like `bg-medical-blue-600`
- Added 26 landing page translation keys in both ar.json and en.json covering hero, about, services, contact, footer, and nav labels
- Created responsive PublicNavigation component (sticky header, clinic name, anchor section links, login button, language toggle, hamburger menu on mobile)
- Created Footer Server Component with clinic name and copyright using next-intl/server getTranslations
- Created (public) route group layout, relocated login page under (public)/(auth)/ so it inherits navigation — login URL unchanged at /login

## Task Commits

Each task was committed atomically:

1. **Task 1: Add medical color palette and landing page translations** - `9dfcc97` (feat)
2. **Task 2: Create (public) route group layout with responsive navigation and footer** - `3d5e4a2` (feat)

## Files Created/Modified

- `app/globals.css` - Added 10 medical color CSS custom properties in :root, 10 Tailwind theme mappings in @theme inline
- `messages/ar.json` - Added "landing" section with 26 Arabic translation keys
- `messages/en.json` - Added "landing" section with 26 English translation keys
- `components/landing/navigation.tsx` - Responsive sticky navigation: clinic name link, 3 anchor links, login button, language toggle, hamburger+drawer on mobile
- `components/landing/footer.tsx` - Server Component footer with clinic name and copyright year
- `app/[locale]/(public)/layout.tsx` - Route group layout rendering PublicNavigation + main + Footer
- `app/[locale]/(public)/(auth)/login/page.tsx` - Login page relocated under (public) to inherit navigation (content unchanged)

## Decisions Made

- Login relocated under `(public)/(auth)/` so it inherits the public navigation and footer, providing a consistent visual shell without duplicating layout code. URL path remains `/login` and `/en/login` because Next.js route groups use parentheses and don't affect URLs.
- Navigation is `'use client'` because the hamburger toggle requires useState. Footer is a Server Component since it only reads translations.
- Medical colors use oklch values matching the calm, desaturated blue/green/teal aesthetic appropriate for women's healthcare.
- Logical CSS properties (`text-start`, `ms-`, `me-`) used throughout navigation for correct RTL/LTR rendering.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Medical color system ready: `bg-medical-blue-600`, `text-medical-green-500`, `bg-medical-teal-50`, etc. all usable
- All 26 landing translation keys available in both languages for Plan 02 landing page sections
- (public) layout with navigation and footer active for all pages under `app/[locale]/(public)/`
- Plan 02 can now create the landing page sections (hero, about, services, contact) at `app/[locale]/(public)/page.tsx`

---
*Phase: 02-landing-page-ui-shell*
*Completed: 2026-02-10*

## Self-Check: PASSED
