-- Allow duplicate phone numbers in profiles
-- Patients may share a family phone number, so uniqueness is not required

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;
