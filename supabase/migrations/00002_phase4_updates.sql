-- Phase 4 Updates: Medical Records, Prescriptions, Patient Files
-- Phase 04-01: Foundation - RLS policy fixes and schema changes
-- Created: 2026-02-11

-- =============================================================================
-- SCHEMA CHANGES
-- =============================================================================

-- Add medical_record_id to patient_files for visit-linked file uploads
ALTER TABLE patient_files
  ADD COLUMN medical_record_id UUID REFERENCES medical_records(id);

-- Index for efficient lookup of files by medical record
CREATE INDEX idx_patient_files_medical_record_id
  ON patient_files(medical_record_id);

-- =============================================================================
-- RLS POLICY FIXES: medical_records - Secretary Access
-- =============================================================================
-- User decision: "Both doctor and secretary can create visit records"
-- User decision: "Visit records are always editable"
-- The initial schema had a comment "Secretary has NO access to medical records"
-- This migration corrects that based on the final product decision.

-- Secretary can view all medical records
CREATE POLICY "Secretary views all medical records"
  ON medical_records FOR SELECT
  TO authenticated
  USING ((SELECT get_user_role()) = 'secretary');

-- Secretary can insert medical records
CREATE POLICY "Secretary inserts medical records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT get_user_role()) = 'secretary');

-- Secretary can update medical records
CREATE POLICY "Secretary updates medical records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING ((SELECT get_user_role()) = 'secretary');

-- =============================================================================
-- RLS POLICY FIXES: patient_files - Secretary Delete Access
-- =============================================================================
-- User decision: "Both doctor and secretary can delete uploaded files"
-- The initial schema only allowed doctor to delete files.

-- Drop the existing doctor-only delete policy
DROP POLICY "Doctor deletes files" ON patient_files;

-- Create new policy allowing both doctor and secretary to delete files
CREATE POLICY "Doctor and secretary delete files"
  ON patient_files FOR DELETE
  TO authenticated
  USING ((SELECT get_user_role()) IN ('doctor', 'secretary'));

-- =============================================================================
-- STORAGE RLS POLICIES (documentation reference only)
-- =============================================================================
-- Bucket name: patient-files
-- These policies must be applied manually via Supabase Dashboard or CLI.
-- Bucket creation is a manual step; SQL alone cannot create storage buckets.
--
-- -- Allow doctor and secretary to upload files
-- CREATE POLICY "Doctor and secretary upload to storage"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'patient-files'
--     AND (SELECT get_user_role()) IN ('doctor', 'secretary')
--   );
--
-- -- Allow doctor, secretary, and patient (own folder) to view files
-- CREATE POLICY "Doctor secretary and patient view storage files"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (
--     bucket_id = 'patient-files'
--     AND (
--       (SELECT get_user_role()) IN ('doctor', 'secretary')
--       OR (
--         (SELECT get_user_role()) = 'patient'
--         AND (storage.foldername(name))[1] = auth.uid()::text
--       )
--     )
--   );
--
-- -- Allow doctor and secretary to delete files from storage
-- CREATE POLICY "Doctor and secretary delete from storage"
--   ON storage.objects FOR DELETE
--   TO authenticated
--   USING (
--     bucket_id = 'patient-files'
--     AND (SELECT get_user_role()) IN ('doctor', 'secretary')
--   );
