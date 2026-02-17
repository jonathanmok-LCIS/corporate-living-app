-- Row Level Security (RLS) Policies for Corporate Living App
-- These policies enforce role-based access control for ADMIN, COORDINATOR, and TENANT roles

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_out_intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_in_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is coordinator
CREATE OR REPLACE FUNCTION is_coordinator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('COORDINATOR', 'ADMIN')
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is tenant
CREATE OR REPLACE FUNCTION is_tenant()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'TENANT'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins and coordinators can view all profiles
CREATE POLICY "Admins and coordinators can view all profiles"
  ON profiles FOR SELECT
  USING (is_coordinator());

-- Users can update their own profile (excluding role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================================
-- HOUSES TABLE POLICIES
-- ============================================================================

-- Everyone can view houses
CREATE POLICY "Everyone can view houses"
  ON houses FOR SELECT
  USING (true);

-- Admins and coordinators can insert houses
CREATE POLICY "Admins and coordinators can insert houses"
  ON houses FOR INSERT
  WITH CHECK (is_coordinator());

-- Admins and coordinators can update houses
CREATE POLICY "Admins and coordinators can update houses"
  ON houses FOR UPDATE
  USING (is_coordinator());

-- Admins can delete houses
CREATE POLICY "Admins can delete houses"
  ON houses FOR DELETE
  USING (is_admin());

-- ============================================================================
-- ROOMS TABLE POLICIES
-- ============================================================================

-- Everyone can view rooms
CREATE POLICY "Everyone can view rooms"
  ON rooms FOR SELECT
  USING (true);

-- Admins and coordinators can insert rooms
CREATE POLICY "Admins and coordinators can insert rooms"
  ON rooms FOR INSERT
  WITH CHECK (is_coordinator());

-- Admins and coordinators can update rooms
CREATE POLICY "Admins and coordinators can update rooms"
  ON rooms FOR UPDATE
  USING (is_coordinator());

-- Admins can delete rooms
CREATE POLICY "Admins can delete rooms"
  ON rooms FOR DELETE
  USING (is_admin());

-- ============================================================================
-- TENANCIES TABLE POLICIES
-- ============================================================================

-- Tenants can view their own tenancies
CREATE POLICY "Tenants can view own tenancies"
  ON tenancies FOR SELECT
  USING (tenant_id = auth.uid());

-- Admins and coordinators can view all tenancies
CREATE POLICY "Admins and coordinators can view all tenancies"
  ON tenancies FOR SELECT
  USING (is_coordinator());

-- Admins and coordinators can insert tenancies
CREATE POLICY "Admins and coordinators can insert tenancies"
  ON tenancies FOR INSERT
  WITH CHECK (is_coordinator());

-- Admins and coordinators can update tenancies
CREATE POLICY "Admins and coordinators can update tenancies"
  ON tenancies FOR UPDATE
  USING (is_coordinator());

-- Admins can delete tenancies
CREATE POLICY "Admins can delete tenancies"
  ON tenancies FOR DELETE
  USING (is_admin());

-- ============================================================================
-- MOVE OUT INTENTIONS TABLE POLICIES
-- ============================================================================

-- Tenants can view their own move-out intentions
CREATE POLICY "Tenants can view own move-out intentions"
  ON move_out_intentions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenancies 
      WHERE tenancies.id = move_out_intentions.tenancy_id 
      AND tenancies.tenant_id = auth.uid()
    )
  );

-- Admins and coordinators can view all move-out intentions
CREATE POLICY "Admins and coordinators can view all move-out intentions"
  ON move_out_intentions FOR SELECT
  USING (is_coordinator());

-- Tenants can create move-out intentions for their own tenancies
CREATE POLICY "Tenants can create own move-out intentions"
  ON move_out_intentions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenancies 
      WHERE tenancies.id = tenancy_id 
      AND tenancies.tenant_id = auth.uid()
      AND tenancies.status = 'ACTIVE'
    )
  );

-- Admins and coordinators can update move-out intentions (for reviews)
CREATE POLICY "Admins and coordinators can update move-out intentions"
  ON move_out_intentions FOR UPDATE
  USING (is_coordinator());

-- Admins can delete move-out intentions
CREATE POLICY "Admins can delete move-out intentions"
  ON move_out_intentions FOR DELETE
  USING (is_admin());

-- ============================================================================
-- INSPECTIONS TABLE POLICIES
-- ============================================================================

-- Tenants can view inspections related to their tenancies
CREATE POLICY "Tenants can view own inspections"
  ON inspections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenancies 
      WHERE tenancies.id = inspections.tenancy_id 
      AND tenancies.tenant_id = auth.uid()
    )
  );

-- Admins and coordinators can view all inspections
CREATE POLICY "Admins and coordinators can view all inspections"
  ON inspections FOR SELECT
  USING (is_coordinator());

-- Admins and coordinators can create inspections
CREATE POLICY "Admins and coordinators can create inspections"
  ON inspections FOR INSERT
  WITH CHECK (is_coordinator());

-- Admins and coordinators can update inspections that are not finalized
CREATE POLICY "Admins and coordinators can update non-finalized inspections"
  ON inspections FOR UPDATE
  USING (is_coordinator() AND (SELECT NOT is_finalized FROM inspections WHERE id = inspections.id))
  WITH CHECK (is_coordinator());

-- Admins can delete inspections
CREATE POLICY "Admins can delete inspections"
  ON inspections FOR DELETE
  USING (is_admin());

-- ============================================================================
-- INSPECTION ITEMS TABLE POLICIES
-- ============================================================================

-- Tenants can view inspection items for their inspections
CREATE POLICY "Tenants can view own inspection items"
  ON inspection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      JOIN tenancies ON tenancies.id = inspections.tenancy_id
      WHERE inspections.id = inspection_items.inspection_id 
      AND tenancies.tenant_id = auth.uid()
    )
  );

-- Admins and coordinators can view all inspection items
CREATE POLICY "Admins and coordinators can view all inspection items"
  ON inspection_items FOR SELECT
  USING (is_coordinator());

-- Admins and coordinators can manage inspection items (unless inspection is finalized)
CREATE POLICY "Admins and coordinators can manage inspection items"
  ON inspection_items FOR ALL
  USING (
    is_coordinator() AND EXISTS (
      SELECT 1 FROM inspections 
      WHERE inspections.id = inspection_items.inspection_id 
      AND NOT inspections.is_finalized
    )
  );

-- ============================================================================
-- INSPECTION PHOTOS TABLE POLICIES
-- ============================================================================

-- Tenants can view inspection photos for their inspections
CREATE POLICY "Tenants can view own inspection photos"
  ON inspection_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      JOIN tenancies ON tenancies.id = inspections.tenancy_id
      WHERE inspections.id = inspection_photos.inspection_id 
      AND tenancies.tenant_id = auth.uid()
    )
  );

-- Admins and coordinators can view all inspection photos
CREATE POLICY "Admins and coordinators can view all inspection photos"
  ON inspection_photos FOR SELECT
  USING (is_coordinator());

-- Admins and coordinators can upload photos (unless inspection is finalized)
CREATE POLICY "Admins and coordinators can upload photos"
  ON inspection_photos FOR INSERT
  WITH CHECK (
    is_coordinator() AND EXISTS (
      SELECT 1 FROM inspections 
      WHERE inspections.id = inspection_id 
      AND NOT inspections.is_finalized
    )
  );

-- Admins and coordinators can delete photos (unless inspection is finalized)
CREATE POLICY "Admins and coordinators can delete photos"
  ON inspection_photos FOR DELETE
  USING (
    is_coordinator() AND EXISTS (
      SELECT 1 FROM inspections 
      WHERE inspections.id = inspection_id 
      AND NOT inspections.is_finalized
    )
  );

-- ============================================================================
-- MOVE IN ACKNOWLEDGEMENTS TABLE POLICIES
-- ============================================================================

-- Tenants can view their own move-in acknowledgements
CREATE POLICY "Tenants can view own move-in acknowledgements"
  ON move_in_acknowledgements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenancies 
      WHERE tenancies.id = move_in_acknowledgements.tenancy_id 
      AND tenancies.tenant_id = auth.uid()
    )
  );

-- Admins and coordinators can view all move-in acknowledgements
CREATE POLICY "Admins and coordinators can view all move-in acknowledgements"
  ON move_in_acknowledgements FOR SELECT
  USING (is_coordinator());

-- Tenants can create move-in acknowledgements for their tenancies
CREATE POLICY "Tenants can create own move-in acknowledgements"
  ON move_in_acknowledgements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenancies 
      WHERE tenancies.id = tenancy_id 
      AND tenancies.tenant_id = auth.uid()
    )
  );

-- ============================================================================
-- EMAIL NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own email notifications
CREATE POLICY "Users can view own email notifications"
  ON email_notifications FOR SELECT
  USING (recipient_id = auth.uid());

-- Admins can view all email notifications
CREATE POLICY "Admins can view all email notifications"
  ON email_notifications FOR SELECT
  USING (is_admin());

-- System can insert email notifications (service role)
CREATE POLICY "System can insert email notifications"
  ON email_notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- STORAGE POLICIES (for Supabase Storage buckets)
-- ============================================================================

-- Note: These should be configured in Supabase Dashboard or via separate storage policy migration
-- Buckets needed:
-- 1. inspection-photos (for inspection photos)
-- 2. signatures (for move-in acknowledgement signatures)

-- Example storage policies (to be applied via Supabase Dashboard):
-- 
-- Inspection Photos Bucket:
-- - SELECT: Authenticated users can view photos for their own inspections or coordinators/admins can view all
-- - INSERT: Coordinators/admins can upload photos
-- - UPDATE: Coordinators/admins can update photos (if inspection not finalized)
-- - DELETE: Coordinators/admins can delete photos (if inspection not finalized)
--
-- Signatures Bucket:
-- - SELECT: Tenants can view their own signatures, coordinators/admins can view all
-- - INSERT: Tenants can upload their signatures for their tenancies
-- - UPDATE: No updates allowed
-- - DELETE: Admins only
