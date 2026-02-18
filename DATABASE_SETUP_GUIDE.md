# 📊 Database Setup Guide - Step by Step

**Welcome!** This guide will walk you through setting up your Supabase database for the Corporate Living App.

**Time Required:** 10-15 minutes  
**Difficulty:** Easy (just copy and paste!)

---

## 📋 What You'll Do

1. ✅ Access Supabase Dashboard
2. ✅ Run 3 migration files (create tables)
3. ✅ Create your first admin user
4. ✅ Verify everything works
5. ✅ Test login to the app

---

## Step 1: Access Supabase Dashboard

### 1.1 Open Supabase

1. Open your browser
2. Go to: **https://supabase.com/dashboard**
3. Sign in to your account
4. Select your project (the one matching your `.env.local` URL)

### 1.2 Open SQL Editor

1. In the left sidebar, click **"SQL Editor"**
2. You'll see a blank SQL editor
3. Keep this tab open - you'll use it multiple times

---

## Step 2: Run Migration 001 - Initial Schema

This creates all the database tables.

### 2.1 Copy the SQL

Open the file: `supabase/migrations/001_initial_schema.sql` in your code editor.

**Or copy from here:**

```sql
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
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  slot room_slot,
  tenant_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inspections table
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  status inspection_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalised_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inspection Checklist Items table
CREATE TABLE inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  yes_no BOOLEAN NOT NULL,
  description_if_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  inspection_id UUID NOT NULL REFERENCES inspections(id),
  signed_by UUID NOT NULL REFERENCES profiles(id),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_image_url TEXT,
  audit_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_rooms_house_id ON rooms(house_id);
CREATE INDEX idx_house_coordinators_house_id ON house_coordinators(house_id);
CREATE INDEX idx_house_coordinators_user_id ON house_coordinators(user_id);
CREATE INDEX idx_tenancies_room_id ON tenancies(room_id);
CREATE INDEX idx_tenancies_tenant_user_id ON tenancies(tenant_user_id);
CREATE INDEX idx_tenancies_status ON tenancies(status);
CREATE INDEX idx_inspections_tenancy_id ON inspections(tenancy_id);
CREATE INDEX idx_inspections_status ON inspections(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_houses_updated_at BEFORE UPDATE ON houses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenancies_updated_at BEFORE UPDATE ON tenancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 Run the SQL

1. **Paste** the entire SQL into the Supabase SQL Editor
2. Click **"Run"** button (or press `Ctrl/Cmd + Enter`)
3. Wait for the query to complete
4. You should see: **"Success. No rows returned"**

✅ **Success!** All database tables are now created.

---

## Step 3: Run Migration 002 - RLS Policies

This sets up Row Level Security (RLS) to protect your data.

### 3.1 Copy the SQL

Open: `supabase/migrations/002_rls_policies.sql`

**Or copy from here:**

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_out_intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_in_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Houses policies
CREATE POLICY "Everyone can view active houses" ON houses
  FOR SELECT USING (active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

CREATE POLICY "Admins can manage houses" ON houses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Rooms policies
CREATE POLICY "Everyone can view active rooms" ON rooms
  FOR SELECT USING (active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

CREATE POLICY "Admins can manage rooms" ON rooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- House Coordinators policies
CREATE POLICY "Everyone can view house coordinators" ON house_coordinators
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage house coordinators" ON house_coordinators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Tenancies policies
CREATE POLICY "Admins can view all tenancies" ON tenancies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Coordinators can view tenancies in their houses" ON tenancies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM house_coordinators hc
      INNER JOIN rooms r ON r.house_id = hc.house_id
      WHERE hc.user_id = auth.uid() AND r.id = tenancies.room_id
    )
  );

CREATE POLICY "Tenants can view own tenancies" ON tenancies
  FOR SELECT USING (tenant_user_id = auth.uid());

CREATE POLICY "Admins can manage tenancies" ON tenancies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Move Out Intentions policies
CREATE POLICY "Admins can view all intentions" ON move_out_intentions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Coordinators can view intentions in their houses" ON move_out_intentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies t
      INNER JOIN rooms r ON r.id = t.room_id
      INNER JOIN house_coordinators hc ON hc.house_id = r.house_id
      WHERE hc.user_id = auth.uid() AND t.id = move_out_intentions.tenancy_id
    )
  );

CREATE POLICY "Tenants can view own intentions" ON move_out_intentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies
      WHERE id = move_out_intentions.tenancy_id AND tenant_user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can create intentions" ON move_out_intentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenancies
      WHERE id = tenancy_id AND tenant_user_id = auth.uid()
    )
  );

-- Inspections policies
CREATE POLICY "Admins can view all inspections" ON inspections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Coordinators can view inspections in their houses" ON inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rooms r
      INNER JOIN house_coordinators hc ON hc.house_id = r.house_id
      WHERE hc.user_id = auth.uid() AND r.id = inspections.room_id
    )
  );

CREATE POLICY "Tenants can view inspections for their rooms" ON inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies
      WHERE room_id = inspections.room_id AND tenant_user_id = auth.uid()
    )
  );

CREATE POLICY "Coordinators can manage inspections in their houses" ON inspections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rooms r
      INNER JOIN house_coordinators hc ON hc.house_id = r.house_id
      WHERE hc.user_id = auth.uid() AND r.id = inspections.room_id
    )
  );

-- Inspection Checklist Items policies
CREATE POLICY "View with inspection" ON inspection_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE id = inspection_checklist_items.inspection_id
    )
  );

CREATE POLICY "Coordinators can manage checklist items" ON inspection_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inspections i
      INNER JOIN rooms r ON r.id = i.room_id
      INNER JOIN house_coordinators hc ON hc.house_id = r.house_id
      WHERE hc.user_id = auth.uid() AND i.id = inspection_checklist_items.inspection_id
    )
  );

-- Inspection Photos policies
CREATE POLICY "View with inspection" ON inspection_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE id = inspection_photos.inspection_id
    )
  );

CREATE POLICY "Coordinators can manage photos" ON inspection_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inspections i
      INNER JOIN rooms r ON r.id = i.room_id
      INNER JOIN house_coordinators hc ON hc.house_id = r.house_id
      WHERE hc.user_id = auth.uid() AND i.id = inspection_photos.inspection_id
    )
  );

-- Move In Acknowledgements policies
CREATE POLICY "Admins can view all acknowledgements" ON move_in_acknowledgements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Coordinators can view acknowledgements in their houses" ON move_in_acknowledgements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies t
      INNER JOIN rooms r ON r.id = t.room_id
      INNER JOIN house_coordinators hc ON hc.house_id = r.house_id
      WHERE hc.user_id = auth.uid() AND t.id = move_in_acknowledgements.tenancy_id
    )
  );

CREATE POLICY "Tenants can view own acknowledgements" ON move_in_acknowledgements
  FOR SELECT USING (signed_by = auth.uid());

CREATE POLICY "Tenants can create acknowledgements" ON move_in_acknowledgements
  FOR INSERT WITH CHECK (signed_by = auth.uid());
```

### 3.2 Run the SQL

1. **Clear** the SQL editor (or open a new query)
2. **Paste** the entire RLS policy SQL
3. Click **"Run"**
4. You should see: **"Success. No rows returned"**

✅ **Success!** Your database is now secure with Row Level Security!

---

## Step 4: Run Migration 003 - Sample Data (Optional)

This creates test data you can use for development.

### 4.1 Should You Run This?

**Run this if:**
- ✅ You want to test with sample data
- ✅ You're in development mode
- ✅ You want to see example houses/rooms

**Skip this if:**
- ❌ You're setting up production
- ❌ You want to start with clean data
- ❌ You'll create your own data

### 4.2 Copy the SQL

Open: `supabase/migrations/003_sample_data.sql` and copy its contents.

### 4.3 Run the SQL

1. **Paste** into SQL Editor
2. Click **"Run"**
3. You should see: **"Success. No rows returned"**

---

## Step 5: Create Your First Admin User

Now let's create an admin user so you can log in!

### 5.1 Create Auth User

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Click **"Add user"** or **"Invite user"**
3. Enter:
   - **Email:** `your-email@example.com` (use your real email)
   - **Password:** Choose a secure password
   - **Auto Confirm User:** Check this box (important!)
4. Click **"Create user"** or **"Send invite"**
5. **IMPORTANT:** Copy the **User ID (UUID)** - you'll need it!
   - It looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### 5.2 Add User to Profiles Table

1. Go back to **SQL Editor**
2. Run this query (replace with YOUR details):

```sql
-- Replace these values with YOUR information
INSERT INTO profiles (id, email, name, role)
VALUES (
  'PASTE-YOUR-USER-UUID-HERE',     -- The UUID you copied above
  'your-email@example.com',         -- Your email
  'Your Name',                      -- Your name
  'ADMIN'                           -- Don't change this
);
```

**Example:**
```sql
INSERT INTO profiles (id, email, name, role)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'john.doe@church.org',
  'John Doe',
  'ADMIN'
);
```

3. Click **"Run"**
4. You should see: **"Success. 1 rows affected"**

✅ **Success!** Your admin user is created!

---

## Step 6: Verify Database Setup

Let's check everything is set up correctly.

### 6.1 Check Tables Exist

Run this query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**You should see these 10 tables:**
- ✅ `house_coordinators`
- ✅ `houses`
- ✅ `inspection_checklist_items`
- ✅ `inspection_photos`
- ✅ `inspections`
- ✅ `move_in_acknowledgements`
- ✅ `move_out_intentions`
- ✅ `profiles`
- ✅ `rooms`
- ✅ `tenancies`

### 6.2 Check Admin User Exists

Run this query:

```sql
SELECT id, email, name, role 
FROM profiles 
WHERE role = 'ADMIN';
```

**You should see:**
- Your email
- Your name
- Role: ADMIN

✅ **Perfect!** Database setup is complete!

---

## Step 7: Test Login

Now let's test logging in to the app!

### 7.1 Make Sure App is Running

```bash
# In your terminal:
cd corporate-living-app
npm run dev
```

**You should see:**
```
▲ Next.js 16.1.6 (Turbopack)
- Local: http://localhost:3000
✓ Ready in 689ms
```

### 7.2 Navigate to Login Page

1. Open browser
2. Go to: **http://localhost:3000/login**

### 7.3 Sign In

1. Enter your **email** (the one you created in Step 5)
2. Enter your **password**
3. Click **"Sign In"**

### 7.4 Verify Success

**You should:**
- ✅ Be redirected to: **http://localhost:3000/admin**
- ✅ See the **Admin Dashboard**
- ✅ See navigation menu with:
  - Houses
  - Tenancies
  - Dashboard

**If login fails:**
- Check credentials are correct
- Verify `.env.local` has correct Supabase URL and keys
- Check browser console for errors
- See TROUBLESHOOTING.md

---

## 🎉 Congratulations!

Your database is now fully set up!

### What You Accomplished

✅ Created all database tables  
✅ Configured Row Level Security  
✅ Created your first admin user  
✅ Verified setup works  
✅ Successfully logged in  

---

## What's Next?

### Immediate Next Steps

1. **Explore the Admin Portal**
   - Click around the dashboard
   - Check out Houses, Rooms, Tenancies pages
   - Get familiar with the interface

2. **Read the Feature Guide**
   - Open: **USING_THE_APP.md**
   - Learn about all features
   - Understand the workflows

3. **Create Sample Data**
   - Add a house
   - Add rooms to the house
   - Create a tenancy
   - See how it all works!

### This Week

1. **Create More Users**
   - Add a coordinator user
   - Add a tenant user
   - Test all three portals

2. **Test Complete Workflow**
   - Tenant submits move-out intention
   - Coordinator creates inspection
   - Admin assigns new tenant
   - New tenant signs acknowledgement

3. **Configure Optional Features** (if needed)
   - Email notifications (NEXT_ACTIONS.md)
   - Photo storage (NEXT_ACTIONS.md)

---

## Quick Reference

### Useful SQL Queries

**View all users:**
```sql
SELECT id, email, name, role FROM profiles ORDER BY created_at DESC;
```

**View all houses:**
```sql
SELECT id, name, address, active FROM houses ORDER BY created_at DESC;
```

**View all tenancies:**
```sql
SELECT 
  t.id,
  r.label as room,
  h.name as house,
  p.name as tenant,
  t.status,
  t.start_date
FROM tenancies t
JOIN rooms r ON r.id = t.room_id
JOIN houses h ON h.id = r.house_id
JOIN profiles p ON p.id = t.tenant_user_id
ORDER BY t.created_at DESC;
```

**Create another admin:**
```sql
-- After creating auth user and getting UUID:
INSERT INTO profiles (id, email, name, role)
VALUES ('uuid-here', 'email@example.com', 'Name', 'ADMIN');
```

**Create a coordinator:**
```sql
-- After creating auth user and getting UUID:
INSERT INTO profiles (id, email, name, role)
VALUES ('uuid-here', 'coordinator@example.com', 'Coordinator Name', 'COORDINATOR');
```

**Create a tenant:**
```sql
-- After creating auth user and getting UUID:
INSERT INTO profiles (id, email, name, role)
VALUES ('uuid-here', 'tenant@example.com', 'Tenant Name', 'TENANT');
```

---

## Troubleshooting

### "Relation already exists" Error

**Cause:** You already ran the migration.  
**Solution:** Skip that migration, it's already done!

### "Permission denied for table"

**Cause:** RLS policies blocking access.  
**Solution:** Make sure you're authenticated and have the right role.

### Can't Login

**Check:**
1. User exists in Authentication → Users
2. User exists in profiles table with correct UUID
3. Email and password are correct
4. `.env.local` has correct Supabase credentials

### Tables Don't Show Up

**Check:**
1. SQL query completed successfully
2. Refresh the Tables view in Supabase
3. Look in "public" schema

---

## Documentation Links

**Setup Guides:**
- **NEXT_ACTIONS.md** - Complete next steps guide
- **USING_THE_APP.md** - Feature guide
- **SETUP.md** - Detailed setup instructions

**Reference:**
- **TROUBLESHOOTING.md** - Common issues
- **SUCCESS.md** - Quick reference commands
- **README.md** - Project overview

---

**Enjoy your Corporate Living App!** 🏘️

If you need help, check **TROUBLESHOOTING.md** or review **NEXT_ACTIONS.md** for more detailed instructions!
