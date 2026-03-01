-- supabase/migrations/011_update_storage_rls_private_bucket.sql
-- Purpose: Keep move-out-photos bucket PRIVATE (no public access) and enforce RLS:
-- - Authenticated users can INSERT only into their own folder
-- - Authenticated users can SELECT/DELETE only their own files
-- - NO public SELECT policy (coordinators/admins must use signed URLs server-side)

-- ============================================================================
-- 1) Ensure bucket exists and is private
-- ============================================================================

-- Create bucket if missing, default to private (public = false)
INSERT INTO storage.buckets (id, name, public)
VALUES ('move-out-photos', 'move-out-photos', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

-- ============================================================================
-- 2) Remove any public read access policies
-- ============================================================================

-- Remove the known public policy name from the earlier migration (if present)
DROP POLICY IF EXISTS "Public can view all files in move-out-photos" ON storage.objects;

-- Safety: remove ANY policy on storage.objects that grants SELECT to public
-- (This catches cases where policy names differ.)
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', p.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- 3) Recreate authenticated-only policies for move-out-photos (idempotent)
-- ============================================================================

-- Drop old versions by name (safe if they don't exist)
DROP POLICY IF EXISTS "Users can upload to own folder in move-out-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files in move-out-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in move-out-photos" ON storage.objects;

-- INSERT: authenticated users may upload only into {auth.uid()}/... in move-out-photos
CREATE POLICY "Users can upload to own folder in move-out-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'move-out-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: authenticated users may read/list only their own files in move-out-photos
CREATE POLICY "Users can view own files in move-out-photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'move-out-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: authenticated users may delete only their own files in move-out-photos
CREATE POLICY "Users can delete own files in move-out-photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'move-out-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- Notes
-- ============================================================================
-- Store only the storage path in DB (e.g. "userId/timestamp-random-safeName.webp").
-- Coordinators/admins should view images via server-side signed URLs using the service role:
--   supabaseAdmin.storage.from('move-out-photos').createSignedUrl(path, 60 * 10)
