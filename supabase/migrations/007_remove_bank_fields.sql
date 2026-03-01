-- Migration: Remove Bank Account Fields from Move-Out Intentions
-- Bank details will be handled outside the system for security and compliance

-- Remove the index that includes bank-related fields
DROP INDEX IF EXISTS idx_move_out_intentions_form_complete;

-- Drop bank-related columns from move_out_intentions table
ALTER TABLE move_out_intentions
DROP COLUMN IF EXISTS bank_name,
DROP COLUMN IF EXISTS account_name,
DROP COLUMN IF EXISTS bsb,
DROP COLUMN IF EXISTS account_number,
DROP COLUMN IF EXISTS bank_branch;

-- Recreate the index without bank fields
CREATE INDEX IF NOT EXISTS idx_move_out_intentions_form_complete 
ON move_out_intentions(tenancy_id, rent_paid_up, areas_cleaned) 
WHERE rent_paid_up IS NOT NULL;

-- Add comment explaining the change
COMMENT ON TABLE move_out_intentions IS 'Move-out intentions without bank details - bond return handled externally';
