-- Create custom types
CREATE TYPE user_role AS ENUM ('ADMIN', 'COORDINATOR', 'TENANT');
CREATE TYPE tenancy_status AS ENUM (
  'OCCUPIED',
  'MOVE_OUT_INTENDED',
  'MOVE_OUT_INSPECTION_DRAFT',
  'MOVE_OUT_INSPECTION_FINAL',
  'MOVE_IN_PENDING_SIGNATURE',
  'ENDED'
);
CREATE TYPE inspection_status AS ENUM ('DRAFT', 'FINAL');
CREATE TYPE room_slot AS ENUM ('A', 'B');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'TENANT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Houses table
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity IN (1, 2)),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(house_id, label)
);

-- House Coordinators (many-to-many)
CREATE TABLE house_coordinators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(house_id, user_id)
);

-- Tenancies table
CREATE TABLE tenancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  slot room_slot,
  tenant_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  status tenancy_status NOT NULL DEFAULT 'OCCUPIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Move Out Intentions table
CREATE TABLE move_out_intentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  planned_move_out_date DATE NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inspections table
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE RESTRICT,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status inspection_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalised_at TIMESTAMPTZ
);

-- Inspection Checklist Items table
CREATE TABLE inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  yes_no BOOLEAN NOT NULL,
  description_if_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(inspection_id, key)
);

-- Inspection Photos table
CREATE TABLE inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  category TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Move In Acknowledgements table
CREATE TABLE move_in_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE RESTRICT,
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE RESTRICT,
  signed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_image_url TEXT NOT NULL,
  audit_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_rooms_house_id ON rooms(house_id);
CREATE INDEX idx_house_coordinators_house_id ON house_coordinators(house_id);
CREATE INDEX idx_house_coordinators_user_id ON house_coordinators(user_id);
CREATE INDEX idx_tenancies_room_id ON tenancies(room_id);
CREATE INDEX idx_tenancies_tenant_user_id ON tenancies(tenant_user_id);
CREATE INDEX idx_tenancies_status ON tenancies(status);
CREATE INDEX idx_move_out_intentions_tenancy_id ON move_out_intentions(tenancy_id);
CREATE INDEX idx_inspections_tenancy_id ON inspections(tenancy_id);
CREATE INDEX idx_inspections_room_id ON inspections(room_id);
CREATE INDEX idx_inspection_checklist_items_inspection_id ON inspection_checklist_items(inspection_id);
CREATE INDEX idx_inspection_photos_inspection_id ON inspection_photos(inspection_id);
CREATE INDEX idx_move_in_acknowledgements_tenancy_id ON move_in_acknowledgements(tenancy_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
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

CREATE TRIGGER update_inspection_checklist_items_updated_at BEFORE UPDATE ON inspection_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
