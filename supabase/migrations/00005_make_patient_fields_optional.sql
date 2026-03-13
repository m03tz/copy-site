-- Make patient fields optional for quick patient creation
ALTER TABLE profiles ALTER COLUMN full_name_ar DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE patients ALTER COLUMN date_of_birth DROP NOT NULL;
