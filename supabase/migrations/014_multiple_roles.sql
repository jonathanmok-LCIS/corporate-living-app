-- Migration: Convert single role to multiple roles (array)
-- This allows users to have multiple roles (e.g., ADMIN and COORDINATOR)

-- Step 1: Drop ALL existing policies that depend on the 'role' column FIRST
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Everyone can view active houses" ON houses;
DROP POLICY IF EXISTS "Admins can manage houses" ON houses;
DROP POLICY IF EXISTS "Everyone can view active rooms" ON rooms;
DROP POLICY IF EXISTS "Admins can manage rooms" ON rooms;
DROP POLICY IF EXISTS "Everyone can view house coordinators" ON house_coordinators;
DROP POLICY IF EXISTS "Admins can manage house coordinators" ON house_coordinators;
DROP POLICY IF EXISTS "Users can view relevant tenancies" ON tenancies;
DROP POLICY IF EXISTS "Admins can manage tenancies" ON tenancies;
DROP POLICY IF EXISTS "Tenants can update own tenancy status" ON tenancies;
DROP POLICY IF EXISTS "Users can view relevant move out intentions" ON move_out_intentions;
DROP POLICY IF EXISTS "Tenants can create move out intentions" ON move_out_intentions;
DROP POLICY IF EXISTS "Admins can manage move out intentions" ON move_out_intentions;
DROP POLICY IF EXISTS "Admins can manage all move-out intentions" ON move_out_intentions;
DROP POLICY IF EXISTS "Users can view relevant inspections" ON inspections;
DROP POLICY IF EXISTS "Coordinators and admins can manage inspections" ON inspections;
DROP POLICY IF EXISTS "Users can view relevant checklist items" ON inspection_checklist_items;
DROP POLICY IF EXISTS "Coordinators and admins can manage checklist items" ON inspection_checklist_items;
DROP POLICY IF EXISTS "Users can view relevant photos" ON inspection_photos;
DROP POLICY IF EXISTS "Coordinators and admins can manage photos" ON inspection_photos;
DROP POLICY IF EXISTS "Users can view relevant acknowledgements" ON move_in_acknowledgements;
DROP POLICY IF EXISTS "Tenants can create acknowledgements" ON move_in_acknowledgements;
DROP POLICY IF EXISTS "Admins can manage acknowledgements" ON move_in_acknowledgements;

-- Step 2: Add new roles column as array (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'roles'
  ) THEN
    ALTER TABLE profiles ADD COLUMN roles user_role[] DEFAULT ARRAY['TENANT']::user_role[];
    
    -- Step 3: Migrate existing data from role to roles (only if role column still exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
      UPDATE profiles SET roles = ARRAY[role]::user_role[];
    END IF;
    
    -- Step 4: Make roles NOT NULL after migration
    ALTER TABLE profiles ALTER COLUMN roles SET NOT NULL;
  END IF;
END
$$;

-- Step 5: Now we can safely drop the old role column (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles DROP COLUMN role;
  END IF;
END
$$;

-- Step 6: Update the get_user_role function to work with array
-- Returns the first/primary role for backwards compatibility
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT roles[1] FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Step 7: Create helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, check_role user_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND check_role = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Step 8: Recreate all RLS policies using the new roles array

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Houses policies
CREATE POLICY "Everyone can view active houses" ON houses
  FOR SELECT USING (active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND (
      'ADMIN' = ANY(roles) OR 'COORDINATOR' = ANY(roles)
    )
  ));

CREATE POLICY "Admins can manage houses" ON houses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
  );

-- Rooms policies
CREATE POLICY "Everyone can view active rooms" ON rooms
  FOR SELECT USING (active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND (
      'ADMIN' = ANY(roles) OR 'COORDINATOR' = ANY(roles)
    )
  ));

CREATE POLICY "Admins can manage rooms" ON rooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
  );

-- House coordinators policies
CREATE POLICY "Everyone can view house coordinators" ON house_coordinators
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage house coordinators" ON house_coordinators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
  );

-- Tenancies policies
CREATE POLICY "Users can view relevant tenancies" ON tenancies
  FOR SELECT USING (
    tenant_user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles)) OR
    EXISTS (
      SELECT 1 FROM house_coordinators hc
      JOIN rooms r ON r.house_id = hc.house_id
      WHERE hc.user_id = auth.uid() AND r.id = tenancies.room_id
    )
  );

CREATE POLICY "Admins can manage tenancies" ON tenancies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
  );

CREATE POLICY "Tenants can update own tenancy status" ON tenancies
  FOR UPDATE USING (tenant_user_id = auth.uid())
  WITH CHECK (tenant_user_id = auth.uid());

-- Move out intentions policies
CREATE POLICY "Users can view relevant move out intentions" ON move_out_intentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.id = move_out_intentions.tenancy_id
      AND (
        t.tenant_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles)) OR
        EXISTS (
          SELECT 1 FROM house_coordinators hc
          JOIN rooms r ON r.house_id = hc.house_id
          WHERE hc.user_id = auth.uid() AND r.id = t.room_id
        )
      )
    )
  );

CREATE POLICY "Tenants can create move out intentions" ON move_out_intentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.id = move_out_intentions.tenancy_id
      AND t.tenant_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage move out intentions" ON move_out_intentions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
  );

-- Inspections policies
CREATE POLICY "Users can view relevant inspections" ON inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.id = inspections.tenancy_id
      AND (
        t.tenant_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles)) OR
        EXISTS (
          SELECT 1 FROM house_coordinators hc
          JOIN rooms r ON r.house_id = hc.house_id
          WHERE hc.user_id = auth.uid() AND r.id = t.room_id
        )
      )
    )
  );

CREATE POLICY "Coordinators and admins can manage inspections" ON inspections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles)) OR
    EXISTS (
      SELECT 1 FROM house_coordinators hc
      JOIN rooms r ON r.house_id = hc.house_id
      WHERE hc.user_id = auth.uid() AND r.id = inspections.room_id
    )
  );

-- Inspection checklist items policies
CREATE POLICY "Users can view relevant checklist items" ON inspection_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN tenancies t ON t.id = i.tenancy_id
      WHERE i.id = inspection_checklist_items.inspection_id
      AND (
        t.tenant_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles)) OR
        EXISTS (
          SELECT 1 FROM house_coordinators hc
          JOIN rooms r ON r.house_id = hc.house_id
          WHERE hc.user_id = auth.uid() AND r.id = t.room_id
        )
      )
    )
  );

CREATE POLICY "Coordinators and admins can manage checklist items" ON inspection_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_checklist_items.inspection_id
      AND (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles)) OR
        EXISTS (
          SELECT 1 FROM house_coordinators hc
          JOIN rooms r ON r.house_id = hc.house_id
          WHERE hc.user_id = auth.uid() AND r.id = i.room_id
        )
      )
    )
  );

-- Inspection photos policies
CREATE POLICY "Users can view relevant photos" ON inspection_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN tenancies t ON t.id = i.tenancy_id
      WHERE i.id = inspection_photos.inspection_id
      AND (
        t.tenant_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles)) OR
        EXISTS (
          SELECT 1 FROM house_coordinators hc
          JOIN rooms r ON r.house_id = hc.house_id
          WHERE hc.user_id = auth.uid() AND r.id = t.room_id
        )
      )
    )
  );

CREATE POLICY "Coordinators and admins can manage photos" ON inspection_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_photos.inspection_id
      AND (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles)) OR
        EXISTS (
          SELECT 1 FROM house_coordinators hc
          JOIN rooms r ON r.house_id = hc.house_id
          WHERE hc.user_id = auth.uid() AND r.id = i.room_id
        )
      )
    )
  );

-- Move in acknowledgements policies
CREATE POLICY "Users can view relevant acknowledgements" ON move_in_acknowledgements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.id = move_in_acknowledgements.tenancy_id
      AND (
        t.tenant_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles)) OR
        EXISTS (
          SELECT 1 FROM house_coordinators hc
          JOIN rooms r ON r.house_id = hc.house_id
          WHERE hc.user_id = auth.uid() AND r.id = t.room_id
        )
      )
    )
  );

CREATE POLICY "Tenants can create acknowledgements" ON move_in_acknowledgements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.id = move_in_acknowledgements.tenancy_id
      AND t.tenant_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage acknowledgements" ON move_in_acknowledgements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'ADMIN' = ANY(roles))
  );
