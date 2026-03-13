---
phase: 01-foundation-security
plan: 05
subsystem: role-portals-and-accounts
tags: [auth, roles, layouts, account-creation, logout]
requires: [01-02, 01-04]
provides:
  - Three role-based portal layouts (doctor, secretary, patient)
  - Account creation server action (doctor/secretary only)
  - Logout functionality
  - Placeholder dashboards for all roles
affects: [02-*, 03-*, 04-*]
tech-stack:
  patterns:
    - Server-side role verification in layouts
    - Server actions for auth operations
    - Zod validation for account creation
    - Service role key for admin user creation
key-files:
  created:
    - app/[locale]/doctor/layout.tsx
    - app/[locale]/doctor/dashboard/page.tsx
    - app/[locale]/secretary/layout.tsx
    - app/[locale]/secretary/dashboard/page.tsx
    - app/[locale]/patient/layout.tsx
    - app/[locale]/patient/dashboard/page.tsx
    - lib/actions/auth.ts
    - lib/actions/accounts.ts
  modified:
    - messages/ar.json
    - messages/en.json
decisions:
  - id: auth-01
    what: Role verification at layout level (not just middleware)
    why: Double protection - middleware guards routes, layouts verify specific role
    impact: Even if middleware is bypassed, layouts enforce role access
  - id: auth-02
    what: Service role key for admin account creation
    why: No self-registration - only doctor/secretary can create patient accounts
    impact: Bypasses RLS intentionally for admin operations
  - id: auth-03
    what: Rollback on account creation failure
    why: If profile or patient record fails, clean up auth user to prevent orphans
    impact: Data consistency maintained
metrics:
  duration: 10 min
  completed: 2026-02-10
---

# Phase 01 Plan 05: Role Portals & Account Creation Summary

**One-liner:** Three role-based portal layouts with auth verification, placeholder dashboards, account creation server action, and logout functionality.

## What Was Built

### Role-Based Portal Layouts
1. **Doctor layout** (`app/[locale]/doctor/layout.tsx`): Full navigation - Dashboard, Patients, Appointments, Medical Records, Prescriptions, Schedule
2. **Secretary layout** (`app/[locale]/secretary/layout.tsx`): Limited navigation - Dashboard, Patients, Appointments (no medical records access)
3. **Patient layout** (`app/[locale]/patient/layout.tsx`): Read-only navigation - Dashboard, My Appointments, My Records

### Auth Server Actions
- **`lib/actions/auth.ts`**: `signOut()` for logout, `getAuthenticatedUser()` for profile fetching
- **`lib/actions/accounts.ts`**: `createPatientAccount()` with Zod validation, phone normalization, admin user creation, and rollback on failure

### Placeholder Dashboards
- Doctor, secretary, and patient each have a dashboard page ready for Phase 6 features

## Deviations

None.

## Verification

- Build passes cleanly
- All three role layouts render with correct navigation
- Role verification redirects unauthorized users
- Account creation validates input and creates auth user + profile + patient records
- Human checkpoint: Approved
