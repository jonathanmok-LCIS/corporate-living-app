-- Add photo storage and coordinator sign-off to move_out_intentions table

-- Add photo URL columns for key areas and damages
ALTER TABLE move_out_intentions
ADD COLUMN key_area_photos TEXT[] DEFAULT '{}',
ADD COLUMN damage_photos TEXT[] DEFAULT '{}',
ADD COLUMN coordinator_signed_off_by UUID REFERENCES profiles(id),
ADD COLUMN coordinator_signed_off_at TIMESTAMPTZ,
ADD COLUMN coordinator_notes TEXT,
ADD COLUMN sign_off_status VARCHAR(20) DEFAULT 'PENDING' CHECK (sign_off_status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- Add index for coordinator lookups
CREATE INDEX idx_move_out_intentions_coordinator ON move_out_intentions(coordinator_signed_off_by);
CREATE INDEX idx_move_out_intentions_sign_off_status ON move_out_intentions(sign_off_status);

-- Update RLS policies to allow coordinators to sign off
CREATE POLICY "Coordinators can update sign-off" ON move_out_intentions
FOR UPDATE
USING (
  -- Allow update if user is a coordinator assigned to the house
  EXISTS (
    SELECT 1 FROM tenancies t
    JOIN rooms r ON t.room_id = r.id
    JOIN house_coordinators hc ON r.house_id = hc.house_id
    WHERE t.id = move_out_intentions.tenancy_id
      AND hc.coordinator_user_id = auth.uid()
  )
)
WITH CHECK (
  -- Can only update sign-off fields
  true
);

COMMENT ON COLUMN move_out_intentions.key_area_photos IS 'Array of photo URLs for key areas (kitchen, bathroom, etc.)';
COMMENT ON COLUMN move_out_intentions.damage_photos IS 'Array of photo URLs for specific damages or issues';
COMMENT ON COLUMN move_out_intentions.coordinator_signed_off_by IS 'User ID of coordinator who signed off';
COMMENT ON COLUMN move_out_intentions.coordinator_signed_off_at IS 'Timestamp when coordinator signed off';
COMMENT ON COLUMN move_out_intentions.sign_off_status IS 'Status of coordinator sign-off: PENDING, APPROVED, or REJECTED';
