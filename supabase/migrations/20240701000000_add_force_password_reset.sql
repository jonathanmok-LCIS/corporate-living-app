-- Add force_password_reset flag to profiles table
-- When true, user must change their password on next login
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN NOT NULL DEFAULT false;
