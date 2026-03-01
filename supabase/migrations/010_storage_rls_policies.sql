-- ============================================================================
-- 010_storage_rls_policies.sql
-- Keep this migration safe for remote DBs where we are not owner of storage.objects
-- ============================================================================

-- Create the bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('move-out-photos', 'move-out-photos', true)
ON CONFLICT (id) DO NOTHING;

-- NOTE:
-- We do NOT ALTER storage.objects or CREATE/DROP policies here because
-- migrations do not own storage.objects on hosted Supabase.
-- Storage policies were applied via dashboard/owner context already.
