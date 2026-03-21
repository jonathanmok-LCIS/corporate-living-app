-- Add legal/preferred name fields and archive lifecycle fields to profiles

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS preferred_name TEXT,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Backfill legal name fields from existing full-name values.
UPDATE profiles
SET
  first_name = COALESCE(first_name, split_part(trim(name), ' ', 1), ''),
  last_name = COALESCE(
    last_name,
    NULLIF(regexp_replace(trim(name), '^\\S+\\s*', ''), ''),
    ''
  )
WHERE first_name IS NULL OR last_name IS NULL;

-- Ensure legal names are always present going forward.
UPDATE profiles
SET first_name = COALESCE(first_name, ''),
    last_name = COALESCE(last_name, '')
WHERE first_name IS NULL OR last_name IS NULL;

ALTER TABLE profiles
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Keep archive timestamps in sync.
UPDATE profiles
SET archived_at = NOW()
WHERE is_archived = TRUE
  AND archived_at IS NULL;

UPDATE profiles
SET archived_at = NULL
WHERE is_archived = FALSE
  AND archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_archived ON profiles(is_archived);
