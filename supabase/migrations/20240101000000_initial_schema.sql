-- Corporate Living App Database Schema
-- This migration creates all the necessary tables for managing houses, rooms, tenancies, 
-- move-out intentions, inspections, and move-in acknowledgements

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('ADMIN', 'COORDINATOR', 'TENANT');

-- Tenancy status enum
CREATE TYPE tenancy_status AS ENUM ('ACTIVE', 'PENDING', 'COMPLETED', 'CANCELLED');

-- Inspection status enum
-- DRAFT: Not yet started
-- IN_PROGRESS: Being worked on
-- COMPLETED: Inspection work finished but not yet locked
-- FINALIZED: Locked and cannot be modified
CREATE TYPE inspection_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'FINALIZED');

-- Move-out intention status
CREATE TYPE moveout_status AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- ============================================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'TENANT',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================================
-- HOUSES TABLE
-- ============================================================================

CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'USA',
  total_rooms INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching houses by location
CREATE INDEX idx_houses_city ON houses(city);
CREATE INDEX idx_houses_created_by ON houses(created_by);

-- ============================================================================
-- ROOMS TABLE
-- ============================================================================

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor INTEGER,
  room_type TEXT,
  max_occupancy INTEGER NOT NULL DEFAULT 1,
  monthly_rent DECIMAL(10, 2),
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(house_id, room_number)
);

-- Indexes for faster queries
CREATE INDEX idx_rooms_house_id ON rooms(house_id);
CREATE INDEX idx_rooms_available ON rooms(is_available);

-- ============================================================================
-- TENANCIES TABLE
-- ============================================================================

CREATE TABLE tenancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2),
  status tenancy_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_tenancies_room_id ON tenancies(room_id);
CREATE INDEX idx_tenancies_tenant_id ON tenancies(tenant_id);
CREATE INDEX idx_tenancies_status ON tenancies(status);
CREATE INDEX idx_tenancies_dates ON tenancies(start_date, end_date);

-- ============================================================================
-- MOVE OUT INTENTIONS TABLE
-- ============================================================================

CREATE TABLE move_out_intentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  intended_move_out_date DATE NOT NULL,
  reason TEXT,
  status moveout_status NOT NULL DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_moveout_tenancy_id ON move_out_intentions(tenancy_id);
CREATE INDEX idx_moveout_status ON move_out_intentions(status);

-- ============================================================================
-- INSPECTIONS TABLE
-- ============================================================================

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL,
  inspector_id UUID REFERENCES profiles(id),
  inspection_date TIMESTAMPTZ,
  status inspection_status NOT NULL DEFAULT 'DRAFT',
  overall_condition TEXT,
  notes TEXT,
  is_finalized BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inspections_tenancy_id ON inspections(tenancy_id);
CREATE INDEX idx_inspections_type ON inspections(inspection_type);
CREATE INDEX idx_inspections_status ON inspections(status);

-- ============================================================================
-- INSPECTION ITEMS TABLE
-- ============================================================================

CREATE TABLE inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  condition TEXT,
  notes TEXT,
  checked BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inspection_items_inspection_id ON inspection_items(inspection_id);
CREATE INDEX idx_inspection_items_category ON inspection_items(category);

-- ============================================================================
-- INSPECTION PHOTOS TABLE
-- ============================================================================

CREATE TABLE inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  inspection_item_id UUID REFERENCES inspection_items(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inspection_photos_inspection_id ON inspection_photos(inspection_id);
CREATE INDEX idx_inspection_photos_item_id ON inspection_photos(inspection_item_id);

-- ============================================================================
-- MOVE IN ACKNOWLEDGEMENTS TABLE
-- ============================================================================

CREATE TABLE move_in_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  tenant_signature_url TEXT NOT NULL,
  signature_storage_path TEXT NOT NULL,
  acknowledgement_text TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_move_in_ack_tenancy_id ON move_in_acknowledgements(tenancy_id);

-- ============================================================================
-- EMAIL NOTIFICATIONS LOG TABLE
-- ============================================================================

CREATE TABLE email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_id UUID REFERENCES profiles(id),
  notification_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_notifications_recipient_id ON email_notifications(recipient_id);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_type ON email_notifications(notification_type);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_houses_updated_at BEFORE UPDATE ON houses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenancies_updated_at BEFORE UPDATE ON tenancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_move_out_intentions_updated_at BEFORE UPDATE ON move_out_intentions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspection_items_updated_at BEFORE UPDATE ON inspection_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
COMMENT ON TABLE houses IS 'Corporate housing properties';
COMMENT ON TABLE rooms IS 'Individual rooms within houses';
COMMENT ON TABLE tenancies IS 'Tenant assignments to rooms';
COMMENT ON TABLE move_out_intentions IS 'Tenant move-out requests and approvals';
COMMENT ON TABLE inspections IS 'Property inspections for move-in/move-out';
COMMENT ON TABLE inspection_items IS 'Individual items checked during inspections';
COMMENT ON TABLE inspection_photos IS 'Photos uploaded during inspections';
COMMENT ON TABLE move_in_acknowledgements IS 'Tenant signatures for move-in acknowledgement';
COMMENT ON TABLE email_notifications IS 'Email notification tracking';
