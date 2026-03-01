-- Fix move-out form RLS errors
-- Add INSERT policy for move_out_intentions table

-- IMPORTANT:
-- PostgreSQL does NOT support "CREATE POLICY IF NOT EXISTS"
-- So we must DROP first, then CREATE to make this migration idempotent.

-- Safely remove existing policy if it exists
DROP POLICY IF EXISTS "Tenants can create own move-out intentions"
ON move_out_intentions;

-- Allow tenants to create move-out intentions for their own tenancies
CREATE POLICY "Tenants can create own move-out intentions"
ON move_out_intentions
FOR INSERT
WITH CHECK (
  tenancy_id IN (
    SELECT id
    FROM tenancies
    WHERE tenant_user_id = auth.uid()
  )
);

-- Add comment explaining the policy
COMMENT ON POLICY "Tenants can create own move-out intentions"
ON move_out_intentions IS
'Allows tenants to create move-out intentions only for tenancies they own (tenant_user_id = auth.uid())';
