-- 015_house_inspections.sql
-- Transform inspections from room/tenancy-based to house-based inspections
-- Add inspection areas for key areas of the house

-- 1. Add house_id to inspections and make room_id/tenancy_id optional
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id) ON DELETE RESTRICT;

-- Make room_id and tenancy_id nullable for house-level inspections
ALTER TABLE inspections
ALTER COLUMN room_id DROP NOT NULL,
ALTER COLUMN tenancy_id DROP NOT NULL;

-- Add notes field for general inspection notes
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for house-based inspection lookups
CREATE INDEX IF NOT EXISTS idx_inspections_house_id ON inspections(house_id);

-- 2. Create inspection_areas table for key areas of the house
-- Each area has: name, description, action items, and can have photos
CREATE TABLE IF NOT EXISTS inspection_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,  -- e.g., 'House Front', 'Entrance', 'Kitchen', etc.
  description TEXT,  -- Admin/coordinator notes about current condition
  action_items TEXT,  -- Required actions to address issues
  action_completed BOOLEAN DEFAULT FALSE,  -- Coordinator marks when done
  action_completed_at TIMESTAMPTZ,
  action_completed_by UUID REFERENCES profiles(id),
  completion_notes TEXT,  -- Notes when marking action as complete
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(inspection_id, area_name)
);

-- Create index for area lookups
CREATE INDEX IF NOT EXISTS idx_inspection_areas_inspection_id ON inspection_areas(inspection_id);

-- 3. Update inspection_photos to support area-specific photos
ALTER TABLE inspection_photos
ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES inspection_areas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inspection_photos_area_id ON inspection_photos(area_id);

-- 4. Add closed_at field to move_out_intentions for admin to mark as closed
ALTER TABLE move_out_intentions
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 5. RLS Policies for inspection_areas
ALTER TABLE inspection_areas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view inspection areas" ON inspection_areas;
DROP POLICY IF EXISTS "Admins and coordinators can manage inspection areas" ON inspection_areas;
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

-- Manage policy for admins
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

-- 6. Update inspections policies for house-based inspections
DROP POLICY IF EXISTS "Users can view relevant inspections" ON inspections;
DROP POLICY IF EXISTS "Coordinators and admins can manage inspections" ON inspections;
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

COMMENT ON TABLE inspection_areas IS 'Key areas for house inspections with descriptions, action items, and completion tracking';
COMMENT ON COLUMN inspection_areas.area_name IS 'Name of the area: House Front, Entrance, Hallway, Lounge, Second Lounge, Kitchen, Dining, Rooms, Second Level Common Area';
COMMENT ON COLUMN inspection_areas.action_items IS 'Required actions to address any issues found';
COMMENT ON COLUMN inspection_areas.action_completed IS 'Whether coordinator has confirmed actions are complete';
