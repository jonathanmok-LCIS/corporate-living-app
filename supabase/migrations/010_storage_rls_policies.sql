-- Migration: Storage RLS Policies for move-out-photos bucket
-- Purpose: Fix "new row violates row-level security policy" errors when uploading photos
-- 
-- Problem: Direct uploads to Supabase Storage require RLS policies on storage.objects
-- Solution: Create policies that allow authenticated users to upload to their own folder
--
-- Folder structure: {userId}/{timestamp}-{random}-{filename}.webp
-- RLS check: First folder in path must match auth.uid()

-- ============================================================================
-- STEP 1: Create the move-out-photos bucket (if not exists)
-- ============================================================================
-- Make bucket public so images can be viewed by coordinators/admins
-- without requiring signed URLs for every image
INSERT INTO storage.buckets (id, name, public)
VALUES ('move-out-photos', 'move-out-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Enable RLS on storage.objects (should already be enabled)
-- ============================================================================
-- This is typically already enabled by default, but we include it for safety
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create RLS Policies for move-out-photos bucket
-- ============================================================================

-- Policy 1: INSERT - Users can upload files only to their own folder
-- This policy ensures that the first folder in the path equals the user's ID
-- Example: User with ID 'abc-123' can only upload to 'abc-123/file.webp'
CREATE POLICY "Users can upload to own folder in move-out-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'move-out-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: SELECT (authenticated) - Users can view their own files
-- This allows users to see files they've uploaded (for display/confirmation)
CREATE POLICY "Users can view own files in move-out-photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'move-out-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: DELETE - Users can delete their own files
-- This allows users to remove/replace photos before final submission
CREATE POLICY "Users can delete own files in move-out-photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'move-out-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: SELECT (public) - Anyone can view files for review
-- This allows coordinators and admins to view photos during move-out review
-- Since bucket is public, this policy allows read access to all files
-- Note: This works because bucket.public = true, making getPublicUrl() work
CREATE POLICY "Public can view all files in move-out-photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'move-out-photos');

-- ============================================================================
-- EXPLANATION
-- ============================================================================
-- 
-- Why these policies work:
-- 
-- 1. UPLOAD PATH in app: ${userId}/${timestamp}-${random}-${safeName}.webp
--    Example: "abc-123-def/1708617234567-a3f9k2m-photo.webp"
--
-- 2. storage.foldername(name) extracts folder array from path
--    Example: ["abc-123-def", "file.webp"] for path "abc-123-def/file.webp"
--
-- 3. [1] gets first element (the user ID folder)
--    Example: "abc-123-def"
--
-- 4. auth.uid()::text gets authenticated user's ID as text
--    Example: "abc-123-def"
--
-- 5. Policy checks: folder[1] = auth.uid() → "abc-123-def" = "abc-123-def" ✓
--
-- If user tries to upload to someone else's folder:
-- - Upload path: "xyz-789/file.webp" 
-- - Policy check: "xyz-789" = "abc-123-def" ✗
-- - Result: INSERT blocked by RLS
--
-- ============================================================================
-- TESTING
-- ============================================================================
--
-- After running this migration:
-- 1. Users should be able to upload files to their own folder
-- 2. Users should be able to view their own files
-- 3. Users should be able to delete their own files
-- 4. Coordinators/admins should be able to view all files (public SELECT)
-- 5. Users should NOT be able to upload to other users' folders
--
-- ============================================================================
