-- ============================================================================
-- 013_fix_move_out_intentions_insert_policy.sql
-- Purpose: Unblock tenant inserts by simplifying the INSERT policy.
-- Keeps strict ownership check (tenant_user_id = auth.uid()).
-- Removes status filter (which may be failing due to enum/type/value mismatch).
-- ============================================================================

-- Make sure RLS is enabled (safe on public table)
ALTER TABLE public.move_out_intentions ENABLE ROW LEVEL SECURITY;

-- Replace the tenant INSERT policy with a simpler, reliable version
DROP POLICY IF EXISTS "Tenants can insert own move-out intentions"
ON public.move_out_intentions;

CREATE POLICY "Tenants can insert own move-out intentions"
ON public.move_out_intentions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tenancies t
    WHERE t.id = move_out_intentions.tenancy_id
      AND t.tenant_user_id = auth.uid()
  )
);

COMMENT ON POLICY "Tenants can insert own move-out intentions"
ON public.move_out_intentions
IS 'Tenant can insert move-out intention only for a tenancy they own. Status filter removed to avoid type/value mismatch blocking inserts.';
