-- Migration: Add Performance Indexes
-- Improves query performance for frequently accessed data patterns

-- Tenancies by status (frequently filtered in admin and coordinator views)
CREATE INDEX IF NOT EXISTS idx_tenancies_status 
ON tenancies(status);

-- Tenancies by tenant (user's own data lookups)
CREATE INDEX IF NOT EXISTS idx_tenancies_tenant_user 
ON tenancies(tenant_user_id) 
WHERE deleted_at IS NULL;

-- Move-out intentions by status (coordinator review queue)
CREATE INDEX IF NOT EXISTS idx_move_out_status 
ON move_out_intentions(sign_off_status) 
WHERE sign_off_status = 'PENDING';

-- Rooms by house (always filtered by house in admin views)
CREATE INDEX IF NOT EXISTS idx_rooms_house 
ON rooms(house_id);

-- House coordinators by user (to check coordinator permissions)
CREATE INDEX IF NOT EXISTS idx_house_coordinators_user 
ON house_coordinators(user_id);

-- House coordinators by house (to list coordinators for a house)
CREATE INDEX IF NOT EXISTS idx_house_coordinators_house 
ON house_coordinators(house_id);

-- Composite index for finding active tenancies in a house
CREATE INDEX IF NOT EXISTS idx_tenancies_room_status 
ON tenancies(room_id, status) 
WHERE status IN ('OCCUPIED', 'MOVE_OUT_INTENDED', 'MOVE_IN_PENDING_SIGNATURE');

-- Add comments explaining the indexes
COMMENT ON INDEX idx_tenancies_status IS 'Improves filtering tenancies by status';
COMMENT ON INDEX idx_tenancies_tenant_user IS 'Optimizes tenant looking up own tenancies';
COMMENT ON INDEX idx_move_out_status IS 'Speeds up coordinator review queue queries';
COMMENT ON INDEX idx_rooms_house IS 'Optimizes room listings by house';
COMMENT ON INDEX idx_house_coordinators_user IS 'Speeds up coordinator permission checks';
COMMENT ON INDEX idx_house_coordinators_house IS 'Optimizes coordinator listings';
COMMENT ON INDEX idx_tenancies_room_status IS 'Optimizes finding active tenancies in rooms';
