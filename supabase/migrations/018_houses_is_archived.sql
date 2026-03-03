-- Migration: Add is_archived to houses table, replace active/status field
-- The `active` boolean is being replaced with `is_archived` (inverted logic).

-- Step 1: Add is_archived column (default false)
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Migrate existing data — inactive houses become archived
UPDATE public.houses SET is_archived = true WHERE active = false;
UPDATE public.houses SET is_archived = false WHERE active = true;

-- Step 3: Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_houses_is_archived ON public.houses (is_archived);
