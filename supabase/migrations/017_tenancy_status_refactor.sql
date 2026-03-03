-- Migration: Refactor Tenancy Status Lifecycle
-- Old statuses → New statuses:
--   OCCUPIED → ACTIVE
--   MOVE_OUT_INTENDED → MOVE_OUT_REQUESTED
--   MOVE_OUT_INSPECTION_DRAFT → INSPECTION_PENDING
--   MOVE_OUT_INSPECTION_FINAL → COMPLETED
--   MOVE_IN_PENDING_SIGNATURE → ACTIVE
--   ENDED → COMPLETED
-- New statuses added: MOVE_OUT_APPROVED, CANCELLED

-- Step 1: Update existing tenancy records to new status values
UPDATE tenancies SET status = 'ACTIVE' WHERE status IN ('OCCUPIED', 'MOVE_IN_PENDING_SIGNATURE');
UPDATE tenancies SET status = 'MOVE_OUT_REQUESTED' WHERE status = 'MOVE_OUT_INTENDED';
UPDATE tenancies SET status = 'INSPECTION_PENDING' WHERE status = 'MOVE_OUT_INSPECTION_DRAFT';
UPDATE tenancies SET status = 'COMPLETED' WHERE status IN ('MOVE_OUT_INSPECTION_FINAL', 'ENDED');

-- Step 2: Drop old constraint if it exists, then create new one
-- (Supabase may use a check constraint or enum — handle both)
DO $$
BEGIN
  -- Try dropping check constraint (common name patterns)
  BEGIN
    ALTER TABLE tenancies DROP CONSTRAINT IF EXISTS tenancies_status_check;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- ignore if doesn't exist
  END;
  
  BEGIN
    ALTER TABLE tenancies DROP CONSTRAINT IF EXISTS chk_tenancy_status;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Step 3: Add new check constraint with updated valid status values
ALTER TABLE tenancies ADD CONSTRAINT tenancies_status_check 
  CHECK (status IN ('ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING', 'COMPLETED', 'CANCELLED'));
