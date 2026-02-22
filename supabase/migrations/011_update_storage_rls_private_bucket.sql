-- Migration: Update move-out-photos bucket to private with signed URLs
-- Purpose: Improve security by using private bucket + temporary signed URLs instead of public access
--
-- Changes:
-- 1. Update bucket to private (public = false)
-- 2. Remove public SELECT policy
-- 3. Keep authenticated user policies (INSERT/SELECT/DELETE own files only)
--
-- Why private + signed URLs is better:
-- - URLs expire after 10 minutes (configurable)
-- - Cannot be shared permanently
-- - Access can be revoked
-- - Better audit trail
-- - Follows principle of least privilege
-- ============================================================================

-- Update bucket to private (no public access)
UPDATE storage.buckets
SET public = false
WHERE id = 'move-out-photos';

-- Drop the public SELECT policy (no longer needed)
DROP POLICY IF EXISTS "Public can view all files in move-out-photos" ON storage.objects;

-- Keep existing authenticated user policies:
-- 1. INSERT: Users can upload to their own folder only
-- 2. SELECT: Users can view their own files only
-- 3. DELETE: Users can delete their own files only
--
-- These policies remain unchanged and continue to work as before.
-- Coordinators/admins will use server-side signed URLs to view images.

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
--
-- Storage paths (not URLs) are now stored in the database:
--   Example: "abc-123/1708617234567-a3f9k2m-photo.webp"
--
-- To view images, generate signed URLs server-side:
--   const { data, error } = await supabaseAdmin.storage
--     .from('move-out-photos')
--     .createSignedUrl(path, 600); // 10 minutes
--
-- Signed URLs are temporary and expire automatically.
-- This provides better security than permanent public URLs.
-- ============================================================================
