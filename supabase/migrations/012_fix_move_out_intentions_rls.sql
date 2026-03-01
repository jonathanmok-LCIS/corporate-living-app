-- Fix RLS policies for move_out_intentions table
-- This migration resolves "new row violates row-level security policy" errors
-- when tenants try to INSERT into move_out_intentions

-- ============================================================================
-- PROBLEM:
-- Previous migrations created conflicting/incomplete policies for move_out_intentions
-- - Migration 002 created "Tenants can create move out intentions"
-- - Migration 009 created "Tenants can create own move-out intentions" (overwrote 002)
-- - No clear SELECT policy for tenant's own records
-- - Policies may not be properly scoped to authenticated role
-- ============================================================================

-- ============================================================================
-- SOLUTION:
-- 1. Drop all existing move_out_intentions policies and recreate them cleanly
-- 2. Explicitly grant INSERT to authenticated users for their own tenancies
-- 3. Add SELECT policy for tenants to view their own move-out intentions
-- 4. Keep existing admin and coordinator policies
-- ============================================================================

-- Drop existing policies that might conflict
-- (Idempotent - safe to run multiple times)
DROP POLICY IF EXISTS "Tenants can create move out intentions" ON move_out_intentions;
DROP POLICY IF EXISTS "Tenants can create own move-out intentions" ON move_out_intentions;
DROP POLICY IF EXISTS "Users can view relevant move out intentions" ON move_out_intentions;
DROP POLICY IF EXISTS "Admins can manage move out intentions" ON move_out_intentions;
DROP POLICY IF EXISTS "Coordinators can update sign-off" ON move_out_intentions;

-- ============================================================================
-- INSERT POLICY: Tenants can create move-out intentions for their own tenancies
-- ============================================================================
CREATE POLICY "Tenants can insert own move-out intentions"
ON move_out_intentions
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check that the tenancy_id being inserted belongs to the authenticated user
  EXISTS (
    SELECT 1
    FROM tenancies
    WHERE tenancies.id = move_out_intentions.tenancy_id
      AND tenancies.tenant_user_id = auth.uid()
      -- Allow insertion for active tenancies (OCCUPIED or already MOVE_OUT_INTENDED for retries)
      AND tenancies.status IN ('OCCUPIED', 'MOVE_OUT_INTENDED', 'MOVE_OUT_INSPECTION_DRAFT', 'MOVE_OUT_INSPECTION_FINAL', 'MOVE_IN_PENDING_SIGNATURE')
  )
);

COMMENT ON POLICY "Tenants can insert own move-out intentions" ON move_out_intentions IS
'Allows authenticated tenants to create move-out intentions only for tenancies they own (tenant_user_id = auth.uid()). Allows for active statuses to support retries.';

-- ============================================================================
-- SELECT POLICY: Tenants can view their own move-out intentions
-- ============================================================================
CREATE POLICY "Tenants can view own move-out intentions"
ON move_out_intentions
FOR SELECT
TO authenticated
USING (
  -- Allow viewing if this move-out intention belongs to a tenancy owned by the user
  EXISTS (
    SELECT 1
    FROM tenancies
    WHERE tenancies.id = move_out_intentions.tenancy_id
      AND tenancies.tenant_user_id = auth.uid()
  )
);

COMMENT ON POLICY "Tenants can view own move-out intentions" ON move_out_intentions IS
'Allows authenticated tenants to view move-out intentions for tenancies they own (tenant_user_id = auth.uid())';

-- ============================================================================
-- SELECT POLICY: Coordinators can view move-out intentions for their assigned houses
-- ============================================================================
CREATE POLICY "Coordinators can view assigned house move-out intentions"
ON move_out_intentions
FOR SELECT
TO authenticated
USING (
  -- Allow viewing if user is a coordinator assigned to the house
  EXISTS (
    SELECT 1
    FROM tenancies t
    JOIN rooms r ON t.room_id = r.id
    JOIN house_coordinators hc ON r.house_id = hc.house_id
    WHERE t.id = move_out_intentions.tenancy_id
      AND hc.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Coordinators can view assigned house move-out intentions" ON move_out_intentions IS
'Allows coordinators to view move-out intentions for houses they are assigned to';

-- ============================================================================
-- UPDATE POLICY: Coordinators can update sign-off fields
-- ============================================================================
CREATE POLICY "Coordinators can update sign-off fields"
ON move_out_intentions
FOR UPDATE
TO authenticated
USING (
  -- Allow update if user is a coordinator assigned to the house
  EXISTS (
    SELECT 1
    FROM tenancies t
    JOIN rooms r ON t.room_id = r.id
    JOIN house_coordinators hc ON r.house_id = hc.house_id
    WHERE t.id = move_out_intentions.tenancy_id
      AND hc.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same condition for the updated row
  EXISTS (
    SELECT 1
    FROM tenancies t
    JOIN rooms r ON t.room_id = r.id
    JOIN house_coordinators hc ON r.house_id = hc.house_id
    WHERE t.id = move_out_intentions.tenancy_id
      AND hc.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Coordinators can update sign-off fields" ON move_out_intentions IS
'Allows coordinators to update sign-off fields (coordinator_signed_off_by, coordinator_signed_off_at, coordinator_notes, sign_off_status) for move-out intentions in houses they coordinate';

-- ============================================================================
-- ADMIN POLICIES: Full access for admins
-- ============================================================================
CREATE POLICY "Admins can manage all move-out intentions"
ON move_out_intentions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
  )
);

COMMENT ON POLICY "Admins can manage all move-out intentions" ON move_out_intentions IS
'Allows admins full access (SELECT, INSERT, UPDATE, DELETE) to all move-out intentions';

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================
-- Run these queries to verify policies are in place:
--
-- 1. List all policies for move_out_intentions:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'move_out_intentions'
-- ORDER BY policyname;
--
-- 2. Test as a tenant (replace USER_ID with actual tenant user ID):
-- SET LOCAL role TO authenticated;
-- SET LOCAL request.jwt.claims.sub TO 'USER_ID';
-- INSERT INTO move_out_intentions (tenancy_id, planned_move_out_date)
-- SELECT id, CURRENT_DATE + INTERVAL '30 days'
-- FROM tenancies
-- WHERE tenant_user_id = 'USER_ID'
-- LIMIT 1;
-- ============================================================================
