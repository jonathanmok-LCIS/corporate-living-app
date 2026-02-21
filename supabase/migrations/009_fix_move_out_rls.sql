-- Fix move-out form RLS errors
-- Add INSERT policy for move_out_intentions table

-- Allow tenants to create move-out intentions for their own tenancies
CREATE POLICY IF NOT EXISTS "Tenants can create own move-out intentions" 
ON move_out_intentions 
FOR INSERT 
WITH CHECK (
  tenancy_id IN (
    SELECT id FROM tenancies 
    WHERE tenant_user_id = auth.uid()
  )
);

-- Comment explaining the policy
COMMENT ON POLICY "Tenants can create own move-out intentions" ON move_out_intentions IS 
'Allows tenants to create move-out intentions only for tenancies they own (tenant_user_id = auth.uid())';
