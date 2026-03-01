-- 016_fix_rls_for_roles_array.sql
-- Fix RLS policies to use the new 'roles' array column instead of deprecated 'role' column
-- This is needed after migration 014 changed profiles from single role to roles array

-- ============================================================================
-- ADD HOUSE_ID COLUMN TO INSPECTIONS FIRST (before policies reference it)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspections' AND column_name = 'house_id'
  ) THEN
    ALTER TABLE inspections ADD COLUMN house_id UUID REFERENCES houses(id) ON DELETE RESTRICT;
    CREATE INDEX idx_inspections_house_id ON inspections(house_id);
  END IF;
END
$$;

-- Make room_id and tenancy_id nullable if they aren't
DO $$
BEGIN
  ALTER TABLE inspections ALTER COLUMN room_id DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE inspections ALTER COLUMN tenancy_id DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
END
$$;

-- Add notes column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspections' AND column_name = 'notes'
  ) THEN
    ALTER TABLE inspections ADD COLUMN notes TEXT;
  END IF;
END
$$;

-- ============================================================================
-- FIX MOVE_OUT_INTENTIONS ADMIN POLICY
-- ============================================================================

-- Drop the old admin policy that uses role = 'ADMIN'
DROP POLICY IF EXISTS "Admins can manage all move-out intentions" ON move_out_intentions;

-- Create new admin policy using roles array
CREATE POLICY "Admins can manage all move-out intentions"
ON move_out_intentions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'ADMIN' = ANY(profiles.roles)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'ADMIN' = ANY(profiles.roles)
  )
);

COMMENT ON POLICY "Admins can manage all move-out intentions" ON move_out_intentions IS
'Allows admins (users with ADMIN in roles array) full access to all move-out intentions';

-- ============================================================================
-- FIX TENANCIES ADMIN POLICY (if not already fixed)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all tenancies" ON tenancies;

CREATE POLICY "Admins can manage all tenancies"
ON tenancies
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'ADMIN' = ANY(profiles.roles)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'ADMIN' = ANY(profiles.roles)
  )
);

-- ============================================================================
-- ENSURE INSPECTION_AREAS TABLE EXISTS AND HAS CORRECT POLICIES
-- ============================================================================

-- If inspection_areas table doesn't exist, create it
CREATE TABLE IF NOT EXISTS inspection_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  description TEXT,
  action_items TEXT,
  action_completed BOOLEAN DEFAULT FALSE,
  action_completed_at TIMESTAMPTZ,
  action_completed_by UUID REFERENCES profiles(id),
  completion_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(inspection_id, area_name)
);

CREATE INDEX IF NOT EXISTS idx_inspection_areas_inspection_id ON inspection_areas(inspection_id);

-- Ensure RLS is enabled
ALTER TABLE inspection_areas ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to use roles array
DROP POLICY IF EXISTS "Users can view inspection areas" ON inspection_areas;
DROP POLICY IF EXISTS "Admins can manage inspection areas" ON inspection_areas;
DROP POLICY IF EXISTS "Coordinators can manage inspection areas" ON inspection_areas;

-- View policy - anyone who can view the inspection can view areas
CREATE POLICY "Users can view inspection areas" ON inspection_areas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM inspections i
    WHERE i.id = inspection_areas.inspection_id
  )
);

-- Manage policy for admins using roles array
CREATE POLICY "Admins can manage inspection areas" ON inspection_areas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles)
  )
);

-- Coordinators can manage areas for houses they coordinate
CREATE POLICY "Coordinators can manage inspection areas" ON inspection_areas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM inspections i
    JOIN house_coordinators hc ON hc.house_id = i.house_id
    WHERE i.id = inspection_areas.inspection_id
      AND hc.user_id = auth.uid()
  )
);

-- ============================================================================
-- FIX INSPECTIONS POLICIES TO USE ROLES ARRAY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view relevant inspections" ON inspections;
DROP POLICY IF EXISTS "Admins can manage inspections" ON inspections;
DROP POLICY IF EXISTS "Coordinators can manage their house inspections" ON inspections;

-- Anyone can view inspections (for their house or tenancy)
CREATE POLICY "Users can view relevant inspections" ON inspections
FOR SELECT
USING (
  -- Admin can view all
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
  OR
  -- Coordinator can view inspections for houses they coordinate
  EXISTS (
    SELECT 1 FROM house_coordinators hc 
    WHERE hc.house_id = inspections.house_id AND hc.user_id = auth.uid()
  )
  OR
  -- Tenant can view their own room/tenancy inspections
  (inspections.tenancy_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM tenancies t 
    WHERE t.id = inspections.tenancy_id AND t.tenant_user_id = auth.uid()
  ))
);

-- Admins can manage all inspections
CREATE POLICY "Admins can manage inspections" ON inspections
FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
);

-- Coordinators can manage inspections for their houses
CREATE POLICY "Coordinators can manage their house inspections" ON inspections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM house_coordinators hc
    WHERE hc.house_id = inspections.house_id AND hc.user_id = auth.uid()
  )
);

-- ============================================================================
-- ADD AREA_ID TO INSPECTION_PHOTOS IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspection_photos' AND column_name = 'area_id'
  ) THEN
    ALTER TABLE inspection_photos ADD COLUMN area_id UUID REFERENCES inspection_areas(id) ON DELETE CASCADE;
    CREATE INDEX idx_inspection_photos_area_id ON inspection_photos(area_id);
  END IF;
END
$$;

-- ============================================================================
-- FIX INSPECTION_PHOTOS RLS POLICIES
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view relevant photos" ON inspection_photos;
DROP POLICY IF EXISTS "Coordinators can manage photos for draft inspections" ON inspection_photos;
DROP POLICY IF EXISTS "Coordinators and admins can manage photos" ON inspection_photos;
DROP POLICY IF EXISTS "Users can view photos for accessible inspections" ON inspection_photos;
DROP POLICY IF EXISTS "Users can view inspection photos" ON inspection_photos;
DROP POLICY IF EXISTS "Admins can manage inspection photos" ON inspection_photos;
DROP POLICY IF EXISTS "Coordinators can manage inspection photos" ON inspection_photos;

-- View policy - anyone can view photos from inspections they can access
CREATE POLICY "Users can view inspection photos" ON inspection_photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM inspections i
    WHERE i.id = inspection_photos.inspection_id
  )
);

-- Admins can manage all inspection photos
CREATE POLICY "Admins can manage inspection photos" ON inspection_photos
FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
);

-- Coordinators can manage photos for inspections on their houses
CREATE POLICY "Coordinators can manage inspection photos" ON inspection_photos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM inspections i
    JOIN house_coordinators hc ON hc.house_id = i.house_id
    WHERE i.id = inspection_photos.inspection_id
      AND hc.user_id = auth.uid()
  )
);

-- ============================================================================
-- ADD CLOSED FIELDS TO MOVE_OUT_INTENTIONS IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'move_out_intentions' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE move_out_intentions ADD COLUMN closed_at TIMESTAMPTZ;
    ALTER TABLE move_out_intentions ADD COLUMN closed_by UUID REFERENCES profiles(id);
    ALTER TABLE move_out_intentions ADD COLUMN admin_notes TEXT;
  END IF;
END
$$;

-- Add coordinator review fields (check each individually)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'move_out_intentions' AND column_name = 'coordinator_reviewed'
  ) THEN
    ALTER TABLE move_out_intentions ADD COLUMN coordinator_reviewed BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'move_out_intentions' AND column_name = 'coordinator_reviewed_at'
  ) THEN
    ALTER TABLE move_out_intentions ADD COLUMN coordinator_reviewed_at TIMESTAMPTZ;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'move_out_intentions' AND column_name = 'coordinator_reviewed_by'
  ) THEN
    ALTER TABLE move_out_intentions ADD COLUMN coordinator_reviewed_by UUID REFERENCES profiles(id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'move_out_intentions' AND column_name = 'coordinator_notes'
  ) THEN
    ALTER TABLE move_out_intentions ADD COLUMN coordinator_notes TEXT;
  END IF;
END
$$;

-- Add admin approval fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'move_out_intentions' AND column_name = 'admin_approved'
  ) THEN
    ALTER TABLE move_out_intentions ADD COLUMN admin_approved BOOLEAN;
    ALTER TABLE move_out_intentions ADD COLUMN admin_approved_at TIMESTAMPTZ;
    ALTER TABLE move_out_intentions ADD COLUMN admin_approved_by UUID REFERENCES profiles(id);
  END IF;
END
$$;

-- ============================================================================
-- CREATE STORAGE BUCKET FOR INSPECTION PHOTOS
-- ============================================================================
-- Create bucket if not exists (1MB limit since images are compressed to ~500KB WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('inspection-photos', 'inspection-photos', false, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = 1048576;

-- Storage policies for inspection-photos bucket
DROP POLICY IF EXISTS "Admin and coordinators can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin and coordinators can view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin and coordinators can delete inspection photos" ON storage.objects;

CREATE POLICY "Admin and coordinators can upload inspection photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-photos' AND
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
    OR
    EXISTS (SELECT 1 FROM house_coordinators WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Admin and coordinators can view inspection photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-photos' AND
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
    OR
    EXISTS (SELECT 1 FROM house_coordinators WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Admin and coordinators can delete inspection photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-photos' AND
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
    OR
    EXISTS (SELECT 1 FROM house_coordinators WHERE user_id = auth.uid())
  )
);

-- ============================================================================
-- UPDATE MOVE-OUT-PHOTOS BUCKET SIZE LIMIT (since images are compressed)
-- ============================================================================
UPDATE storage.buckets
SET file_size_limit = 1048576, -- 1MB (compressed target is 500KB)
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'move-out-photos';

-- Also update inspection-photos bucket to 1MB
UPDATE storage.buckets
SET file_size_limit = 1048576 -- 1MB
WHERE id = 'inspection-photos';

-- ============================================================================
-- LIFECYCLE CLEANUP FUNCTION FOR OLD PHOTOS (2+ years)
-- Call this via pg_cron or Supabase scheduled function
-- ============================================================================

-- Function to clean up old inspection photos (older than 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_inspection_photos()
RETURNS TABLE(deleted_count INTEGER, freed_bytes BIGINT) AS $$
DECLARE
  _deleted_count INTEGER := 0;
  _photo RECORD;
  _cutoff_date TIMESTAMPTZ := NOW() - INTERVAL '2 years';
BEGIN
  -- Find and delete old photos from inspections that are finalized and old
  FOR _photo IN
    SELECT ip.id, ip.url
    FROM inspection_photos ip
    JOIN inspections i ON i.id = ip.inspection_id
    WHERE i.finalised_at IS NOT NULL
      AND i.finalised_at < _cutoff_date
  LOOP
    -- Delete from storage (via API, can't delete directly from here)
    -- This marks for deletion - actual cleanup happens in app
    DELETE FROM inspection_photos WHERE id = _photo.id;
    _deleted_count := _deleted_count + 1;
  END LOOP;
  
  deleted_count := _deleted_count;
  freed_bytes := _deleted_count * 500000; -- Estimate ~500KB per photo
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get storage usage stats
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS TABLE(
  bucket_name TEXT,
  total_photos BIGINT,
  oldest_photo TIMESTAMPTZ,
  newest_photo TIMESTAMPTZ,
  photos_over_2_years BIGINT
) AS $$
BEGIN
  -- Inspection photos stats
  RETURN QUERY
  SELECT 
    'inspection-photos'::TEXT,
    COUNT(*)::BIGINT,
    MIN(ip.created_at),
    MAX(ip.created_at),
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM inspections i 
        WHERE i.id = ip.inspection_id 
        AND i.finalised_at < NOW() - INTERVAL '2 years'
      )
    )::BIGINT
  FROM inspection_photos ip;
  
  -- Move-out photos stats
  RETURN QUERY
  SELECT 
    'move-out-photos'::TEXT,
    COUNT(*)::BIGINT,
    MIN(mop.created_at),
    MAX(mop.created_at),
    COUNT(*) FILTER (WHERE mop.created_at < NOW() - INTERVAL '2 years')::BIGINT
  FROM move_out_photos mop;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENHANCE MOVE_IN_ACKNOWLEDGEMENTS TABLE
-- ============================================================================

-- Make inspection_id nullable (previous tenant may not have inspection)
ALTER TABLE move_in_acknowledgements 
  ALTER COLUMN inspection_id DROP NOT NULL;

-- Add fields for condition review and defect photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'move_in_acknowledgements' AND column_name = 'condition_accepted'
  ) THEN
    ALTER TABLE move_in_acknowledgements ADD COLUMN condition_accepted BOOLEAN DEFAULT TRUE;
    ALTER TABLE move_in_acknowledgements ADD COLUMN defect_photos TEXT[] DEFAULT '{}';
    ALTER TABLE move_in_acknowledgements ADD COLUMN defect_notes TEXT;
    ALTER TABLE move_in_acknowledgements ADD COLUMN previous_move_out_id UUID REFERENCES move_out_intentions(id);
  END IF;
END
$$;

COMMENT ON COLUMN move_in_acknowledgements.condition_accepted IS 
  'Whether tenant confirms the photos accurately represent room condition';
COMMENT ON COLUMN move_in_acknowledgements.defect_photos IS 
  'Additional photos uploaded by new tenant highlighting defects';
COMMENT ON COLUMN move_in_acknowledgements.defect_notes IS 
  'Notes about defects or discrepancies noted by new tenant';
COMMENT ON COLUMN move_in_acknowledgements.previous_move_out_id IS 
  'Reference to previous tenant move-out intention for tracking';

-- Make signature_image_url nullable (in case we store signature differently)
ALTER TABLE move_in_acknowledgements 
  ALTER COLUMN signature_image_url DROP NOT NULL;

-- Create storage bucket for move-in defect photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('move-in-photos', 'move-in-photos', false, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = 1048576;

-- Storage policies for move-in-photos bucket
DROP POLICY IF EXISTS "Tenants can upload move-in photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view move-in photos" ON storage.objects;

CREATE POLICY "Tenants can upload move-in photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'move-in-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view move-in photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'move-in-photos' AND
  (
    -- Tenant can view their own photos
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admin can view all
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
    OR
    -- Coordinator can view photos for their houses
    EXISTS (SELECT 1 FROM house_coordinators WHERE user_id = auth.uid())
  )
);
