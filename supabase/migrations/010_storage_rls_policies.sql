-- ============================================================================
-- Migration: Storage RLS Policies for move-out-photos bucket
-- Purpose: Fix "new row violates row-level security policy" errors when uploading photos
--
-- This migration is IDEMPOTENT.
-- It safely drops existing policies before recreating them.
-- ============================================================================


-- ============================================================================
-- STEP 1: Create the move-out-photos bucket (if not exists)
-- ============================================================================
-- Bucket is created as PUBLIC initially (011 will convert to private if needed)

INSERT INTO storage.buckets (id, name, public)
VALUES ('move-out-photos', 'move-out-photos', true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- STEP 2: Ensure RLS is enabled on storage.objects
-- ============================================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- STEP 3: Drop Existing Policies (Required for Idempotency)
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload to own folder in move-out-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files in move-out-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in move-out-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view all files in move-out-photos" ON storage.objects;


-- ============================================================================
-- STEP 4: Create RLS Policies
-- ============================================================================

-- Policy 1: INSERT
-- Users can upload only to their own folder
CREATE POLICY "Users can upload to own folder in move-out-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'move-out-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- Policy 2: SELECT (Own Files)
-- Users can view their own uploaded files
CREATE POLICY "Users can view own files in move-out-photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'move-out-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- Policy 3: DELETE
-- Users can delete their own uploaded files
CREATE POLICY "Users can delete own files in move-out-photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'move-out-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. This migration does NOT recreate public SELECT access.
-- 2. If bucket is made private (migration 011),
--    access should be via signed URLs.
-- 3. Folder structure expected:
--    {userId}/{timestamp}-{random}-{filename}.webp
--
-- 4. RLS rule logic:
--    First folder in file path must equal auth.uid()
--
-- 5. Safe to re-run.
-- ============================================================================
