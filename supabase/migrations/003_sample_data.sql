-- Sample data for testing the Corporate Living App
-- Run this after running the main migrations

-- Note: Replace UUIDs with actual user IDs from your Supabase Auth users
-- This is just example data structure

-- Example: Insert sample houses
INSERT INTO houses (name, address, active) VALUES
  ('Smith House', '123 Main Street, Cityville', true),
  ('Johnson Residence', '456 Oak Avenue, Townsburg', true),
  ('Williams Manor', '789 Pine Road, Villageton', true);

-- Example: Insert sample rooms (replace house IDs with actual UUIDs from your database)
-- You'll need to get the house IDs first by running: SELECT id, name FROM houses;

-- For Smith House (replace 'smith-house-uuid' with actual ID):
INSERT INTO rooms (house_id, label, capacity, active) VALUES
  ('smith-house-uuid', 'Room 101', 1, true),
  ('smith-house-uuid', 'Room 102', 2, true),
  ('smith-house-uuid', 'Room 103', 1, true);

-- For Johnson Residence:
INSERT INTO rooms (house_id, label, capacity, active) VALUES
  ('johnson-house-uuid', 'Master Bedroom', 1, true),
  ('johnson-house-uuid', 'Guest Room A', 1, true),
  ('johnson-house-uuid', 'Guest Room B', 2, true);

-- For Williams Manor:
INSERT INTO rooms (house_id, label, capacity, active) VALUES
  ('williams-house-uuid', 'Suite 1', 1, true),
  ('williams-house-uuid', 'Suite 2', 1, true),
  ('williams-house-uuid', 'Shared Room', 2, true);

-- Example: Create sample profiles
-- First, create users in Supabase Auth, then insert their profiles here

-- Admin user (replace with actual auth.users ID)
INSERT INTO profiles (id, email, name, role) VALUES
  ('admin-user-uuid', 'admin@example.com', 'Admin User', 'ADMIN');

-- Coordinator users
INSERT INTO profiles (id, email, name, role) VALUES
  ('coordinator-1-uuid', 'coordinator1@example.com', 'Jane Coordinator', 'COORDINATOR'),
  ('coordinator-2-uuid', 'coordinator2@example.com', 'John Coordinator', 'COORDINATOR');

-- Tenant users
INSERT INTO profiles (id, email, name, role) VALUES
  ('tenant-1-uuid', 'tenant1@example.com', 'Alice Tenant', 'TENANT'),
  ('tenant-2-uuid', 'tenant2@example.com', 'Bob Tenant', 'TENANT'),
  ('tenant-3-uuid', 'tenant3@example.com', 'Carol Tenant', 'TENANT');

-- Example: Assign coordinators to houses
INSERT INTO house_coordinators (house_id, user_id) VALUES
  ('smith-house-uuid', 'coordinator-1-uuid'),
  ('johnson-house-uuid', 'coordinator-2-uuid'),
  ('williams-house-uuid', 'coordinator-1-uuid');

-- Example: Create sample tenancies
INSERT INTO tenancies (room_id, slot, tenant_user_id, start_date, status) VALUES
  ('room-101-uuid', null, 'tenant-1-uuid', '2024-01-01', 'OCCUPIED'),
  ('room-102-uuid', 'A', 'tenant-2-uuid', '2024-02-01', 'OCCUPIED'),
  ('room-102-uuid', 'B', 'tenant-3-uuid', '2024-02-01', 'OCCUPIED');

-- To test the full workflow, you can:
-- 1. Create a move-out intention for a tenant
-- 2. Create an inspection for that tenancy
-- 3. Add checklist items to the inspection
-- 4. Finalize the inspection
-- 5. Create a move-in acknowledgement for a new tenant

-- Remember: Always use actual UUIDs from your database
-- Get UUIDs by running SELECT queries before inserting
