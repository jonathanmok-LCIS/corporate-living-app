-- Migration: Enhance Move-Out and Move-In Forms
-- This migration adds fields for enhanced move-out form and move-in acknowledgement

-- Add columns to move_out_intentions table for comprehensive move-out form
ALTER TABLE move_out_intentions
ADD COLUMN IF NOT EXISTS rent_paid_up BOOLEAN,
ADD COLUMN IF NOT EXISTS areas_cleaned BOOLEAN,
ADD COLUMN IF NOT EXISTS has_damage BOOLEAN,
ADD COLUMN IF NOT EXISTS damage_description TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_name TEXT,
ADD COLUMN IF NOT EXISTS bsb TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_branch TEXT;

-- Add comment on account_number column for security note
COMMENT ON COLUMN move_out_intentions.account_number IS 'Bank account number - should be encrypted/masked in application layer';

-- Add columns to tenancies table for move-in key confirmation
ALTER TABLE tenancies
ADD COLUMN IF NOT EXISTS keys_received BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS keys_received_at TIMESTAMPTZ;

-- Add comment explaining the keys_received field
COMMENT ON COLUMN tenancies.keys_received IS 'Tenant confirmation of receiving keys during move-in acknowledgement';

-- Create index for queries filtering by move-out form completeness
CREATE INDEX IF NOT EXISTS idx_move_out_intentions_form_complete 
ON move_out_intentions(tenancy_id, rent_paid_up, areas_cleaned) 
WHERE rent_paid_up IS NOT NULL;
