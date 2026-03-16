-- Phase 7: Fix RLS infinite recursion, add doctor/secretary update policies,
-- add delete policies for patients
-- Created: 2026-02-16

-- =============================================================================
-- FIX 1: Profiles UPDATE policy infinite recursion
-- The old policy used a sub-select on profiles inside WITH CHECK, causing
-- infinite recursion. Replace with get_user_role() which is SECURITY DEFINER.
-- =============================================================================

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT get_user_role()));

-- Doctor and secretary can update any profile (for editing patient/staff info)
DROP POLICY IF EXISTS "Doctor and secretary update profiles" ON profiles;
CREATE POLICY "Doctor and secretary update profiles"
  ON profiles FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor', 'secretary'));

-- =============================================================================
-- FIX 2: Add DELETE policies for patients (cascade from auth.users via admin)
-- =============================================================================

-- Doctor can delete patients
DROP POLICY IF EXISTS "Doctor deletes patients" ON patients;
CREATE POLICY "Doctor deletes patients"
  ON patients FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- Doctor can delete profiles (for staff deletion)
DROP POLICY IF EXISTS "Doctor deletes profiles" ON profiles;
CREATE POLICY "Doctor deletes profiles"
  ON profiles FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'doctor');

-- =============================================================================
-- FIX 3: Secretary policies for medical records (if not already applied)
-- =============================================================================

DROP POLICY IF EXISTS "Secretary views all medical records" ON medical_records;
CREATE POLICY "Secretary views all medical records"
  ON medical_records FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) = 'secretary');

DROP POLICY IF EXISTS "Secretary inserts medical records" ON medical_records;
CREATE POLICY "Secretary inserts medical records"
  ON medical_records FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) = 'secretary');

DROP POLICY IF EXISTS "Secretary updates medical records" ON medical_records;
CREATE POLICY "Secretary updates medical records"
  ON medical_records FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) = 'secretary');

-- =============================================================================
-- Note: Apply via Supabase Dashboard SQL Editor
-- =============================================================================
