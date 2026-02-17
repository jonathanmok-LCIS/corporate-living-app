-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_out_intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_in_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Houses policies
CREATE POLICY "Everyone can view active houses" ON houses
  FOR SELECT USING (active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'COORDINATOR')
  ));

CREATE POLICY "Admins can manage houses" ON houses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Rooms policies
CREATE POLICY "Everyone can view active rooms" ON rooms
  FOR SELECT USING (active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'COORDINATOR')
  ));

CREATE POLICY "Admins can manage rooms" ON rooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- House Coordinators policies
CREATE POLICY "Everyone can view house coordinators" ON house_coordinators
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage house coordinators" ON house_coordinators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Tenancies policies
CREATE POLICY "Users can view relevant tenancies" ON tenancies
  FOR SELECT USING (
    tenant_user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') OR
    EXISTS (
      SELECT 1 FROM house_coordinators hc
      JOIN rooms r ON r.house_id = hc.house_id
      WHERE hc.user_id = auth.uid() AND r.id = tenancies.room_id
    )
  );

CREATE POLICY "Admins can manage tenancies" ON tenancies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Tenants can update own tenancy status" ON tenancies
  FOR UPDATE USING (tenant_user_id = auth.uid())
  WITH CHECK (tenant_user_id = auth.uid());

-- Move Out Intentions policies
CREATE POLICY "Users can view relevant move out intentions" ON move_out_intentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.id = move_out_intentions.tenancy_id
      AND (
        t.tenant_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') OR
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
      SELECT 1 FROM tenancies
      WHERE id = move_out_intentions.tenancy_id
      AND tenant_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage move out intentions" ON move_out_intentions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Inspections policies
CREATE POLICY "Users can view relevant inspections" ON inspections
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') OR
    EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.id = inspections.tenancy_id
      AND t.tenant_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM house_coordinators hc
      JOIN rooms r ON r.house_id = hc.house_id
      WHERE hc.user_id = auth.uid() AND r.id = inspections.room_id
    )
  );

CREATE POLICY "Coordinators can create inspections" ON inspections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('COORDINATOR', 'ADMIN')
    ) AND
    EXISTS (
      SELECT 1 FROM house_coordinators hc
      JOIN rooms r ON r.house_id = hc.house_id
      WHERE hc.user_id = auth.uid() AND r.id = inspections.room_id
    )
  );

CREATE POLICY "Coordinators can update draft inspections" ON inspections
  FOR UPDATE USING (
    created_by = auth.uid() AND status = 'DRAFT'
  ) WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Admins can manage all inspections" ON inspections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Inspection Checklist Items policies
CREATE POLICY "Users can view checklist items for accessible inspections" ON inspection_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_checklist_items.inspection_id
      AND (
        i.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') OR
        EXISTS (
          SELECT 1 FROM tenancies t
          WHERE t.id = i.tenancy_id
          AND t.tenant_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Coordinators can manage checklist items for draft inspections" ON inspection_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_checklist_items.inspection_id
      AND i.created_by = auth.uid()
      AND i.status = 'DRAFT'
    )
  );

-- Inspection Photos policies
CREATE POLICY "Users can view photos for accessible inspections" ON inspection_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_photos.inspection_id
      AND (
        i.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') OR
        EXISTS (
          SELECT 1 FROM tenancies t
          WHERE t.id = i.tenancy_id
          AND t.tenant_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Coordinators can manage photos for draft inspections" ON inspection_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_photos.inspection_id
      AND i.created_by = auth.uid()
      AND i.status = 'DRAFT'
    )
  );

-- Move In Acknowledgements policies
CREATE POLICY "Users can view relevant acknowledgements" ON move_in_acknowledgements
  FOR SELECT USING (
    signed_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') OR
    EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.id = move_in_acknowledgements.tenancy_id
      AND EXISTS (
        SELECT 1 FROM house_coordinators hc
        JOIN rooms r ON r.house_id = hc.house_id
        WHERE hc.user_id = auth.uid() AND r.id = t.room_id
      )
    )
  );

CREATE POLICY "Tenants can create acknowledgements" ON move_in_acknowledgements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenancies
      WHERE id = move_in_acknowledgements.tenancy_id
      AND tenant_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all acknowledgements" ON move_in_acknowledgements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
