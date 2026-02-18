# Next Actions - What to Do Now

**Now that the app is running, here's what to do next to make it fully functional.**

---

## 📋 Table of Contents

- [Immediate Actions (Required)](#immediate-actions-required)
- [Short-Term Actions](#short-term-actions)
- [Optional Actions](#optional-actions)
- [Production Deployment](#production-deployment)

---

## Immediate Actions (Required)

### 1. Run Database Migrations

**Time:** 5 minutes

The database schema needs to be created in your Supabase project.

**Step-by-Step:**

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to "SQL Editor"

2. **Run Migration 001: Initial Schema**
   - Open `supabase/migrations/001_initial_schema.sql` in your code editor
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Wait for "Success" message

3. **Run Migration 002: RLS Policies**
   - Open `supabase/migrations/002_rls_policies.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Wait for "Success"

4. **Run Migration 003: Sample Data** (Optional)
   - Open `supabase/migrations/003_sample_data.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"
   - This creates test data for development

**Verification:**

```sql
-- Run this query in Supabase SQL Editor to verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables:**
- `profiles`
- `houses`
- `rooms`
- `house_coordinators`
- `tenancies`
- `move_out_intentions`
- `inspections`
- `inspection_checklist_items`
- `inspection_photos`
- `move_in_acknowledgements`

---

### 2. Create Your First Admin User

**Time:** 2 minutes

You need an admin user to access the admin portal.

**Step-by-Step:**

1. **Create Auth User (if you haven't)**
   - Go to Supabase Dashboard → Authentication → Users
   - Click "Add user" or "Invite user"
   - Enter email and password
   - Click "Create user"
   - **Copy the User UUID** (you'll need it)

2. **Add User to Profiles Table**
   - Go to SQL Editor
   - Run this query (replace with your details):

```sql
-- Replace these values with your own
INSERT INTO profiles (id, email, name, role)
VALUES (
  'your-user-uuid-here',           -- The UUID from Auth Users
  'admin@example.com',              -- Your email
  'Admin User',                     -- Your name
  'ADMIN'                           -- Role: ADMIN, COORDINATOR, or TENANT
);
```

**Example with real data:**
```sql
INSERT INTO profiles (id, email, name, role)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'john.doe@church.org',
  'John Doe',
  'ADMIN'
);
```

**Verification:**

```sql
-- Verify the profile was created
SELECT id, email, name, role 
FROM profiles 
WHERE role = 'ADMIN';
```

---

### 3. Test Login

**Time:** 3 minutes

Verify authentication works and you can access the admin portal.

**Step-by-Step:**

1. **Navigate to Login Page**
   - Open browser
   - Go to: http://localhost:3000/login

2. **Sign In**
   - Enter your email
   - Enter your password
   - Click "Sign In"

3. **Verify Redirect**
   - Should redirect to `/admin` (admin portal)
   - Should see admin dashboard
   - Should see navigation menu

4. **Explore Dashboard**
   - Click "Houses" to see houses list
   - Click "Tenancies" to see tenancies
   - Verify you can navigate all pages

**If Login Fails:**
- Check Supabase credentials in `.env.local`
- Verify user exists in Auth and profiles table
- Check browser console for errors
- See TROUBLESHOOTING.md

---

## Short-Term Actions

### Test All Three Portals

**Time:** 30 minutes

Create users for each role and test their portals.

**Create Coordinator User:**
```sql
-- 1. Create auth user in Supabase Dashboard (get UUID)
-- 2. Add to profiles:
INSERT INTO profiles (id, email, name, role)
VALUES ('coordinator-uuid', 'coordinator@example.com', 'Jane Smith', 'COORDINATOR');
```

**Create Tenant User:**
```sql
-- 1. Create auth user in Supabase Dashboard (get UUID)
-- 2. Add to profiles:
INSERT INTO profiles (id, email, name, role)
VALUES ('tenant-uuid', 'tenant@example.com', 'Bob Johnson', 'TENANT');
```

**Test Each Portal:**
1. Log out (if logged in)
2. Log in as each user
3. Verify redirect to correct portal
4. Explore features
5. Test navigation

---

### Create Sample Data

**Time:** 20 minutes

Create some test houses, rooms, and tenancies.

**As Admin:**

1. **Create a House**
   - Go to `/admin/houses`
   - Click "Add House"
   - Name: "Main House"
   - Address: "123 Church St"
   - Save

2. **Add Rooms**
   - View house details
   - Add Room 101 (Capacity: 1)
   - Add Room 102 (Capacity: 2)
   - Add Room 103 (Capacity: 1)

3. **Assign Coordinator**
   - View house coordinators
   - Assign your coordinator user
   - Save

4. **Create Tenancy**
   - Go to `/admin/tenancies`
   - Add tenancy
   - Room: 101
   - Tenant: tenant user
   - Start date: today
   - Save

---

### Test Complete Workflow

**Time:** 30 minutes

Go through the full move-out and move-in process.

**Step 1: Tenant Submits Move-Out Intention**
1. Log in as tenant
2. Go to `/tenant/move-out`
3. Select move-out date (1 week from now)
4. Add notes: "Moving to new city"
5. Submit

**Step 2: Coordinator Creates Inspection**
1. Log out, log in as coordinator
2. Go to `/coordinator/inspections`
3. See the pending intention
4. Click "Create Inspection"
5. Complete checklist (all Yes for testing)
6. Save as draft

**Step 3: Coordinator Finalizes**
1. Review inspection
2. Click "Finalize"
3. Confirm

**Step 4: Admin Assigns New Tenant**
1. Log out, log in as admin
2. Go to `/admin/tenancies`
3. Create new tenancy for same room
4. Assign different tenant (or create new one)
5. Save

**Step 5: New Tenant Signs**
1. Log in as new tenant
2. Go to `/tenant/move-in`
3. Review inspection report
4. Draw signature
5. Submit

**Verification:**
- Check tenancy statuses updated correctly
- Verify workflow progression
- Confirm all features work

---

## Optional Actions

### Configure Email Notifications

**Time:** 30 minutes

Set up email service for notifications.

**Options:**
1. **Resend** (Recommended - easiest)
2. **SendGrid** (Popular)
3. **AWS SES** (Enterprise)

**See:** NEXT_STEPS.md for detailed email setup instructions

**Quick Setup with Resend:**
1. Sign up at https://resend.com
2. Get API key
3. Add to `.env.local`:
   ```env
   EMAIL_SERVICE=resend
   RESEND_API_KEY=re_xxx
   EMAIL_FROM=noreply@yourdomain.com
   ```
4. Update `/app/api/notifications/route.ts` with Resend SDK
5. Test email sending

---

### Set Up Photo Storage

**Time:** 20 minutes

Configure Supabase Storage for inspection photos.

**Steps:**

1. **Create Storage Bucket**
   - Go to Supabase Dashboard → Storage
   - Create new bucket: "inspection-photos"
   - Set public access: false (private)

2. **Set Bucket Policies**
   ```sql
   -- Allow coordinators to upload to their inspections
   CREATE POLICY "Coordinators can upload inspection photos"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'inspection-photos' AND
     auth.uid() IN (
       SELECT user_id FROM house_coordinators
     )
   );
   ```

3. **Update App Code**
   - Implement photo upload in inspection page
   - Use Supabase Storage client
   - Save URLs to `inspection_photos` table

**See:** SETUP.md for complete storage configuration

---

### Add More Users

**Time:** 5 minutes per user

Create additional users for your organization.

**For Each User:**
1. Create auth user in Supabase Dashboard
2. Add to profiles table with appropriate role
3. Share login credentials with user

**Bulk Insert Example:**
```sql
-- Multiple users at once
INSERT INTO profiles (id, email, name, role) VALUES
('uuid-1', 'admin2@example.com', 'Second Admin', 'ADMIN'),
('uuid-2', 'coord1@example.com', 'First Coordinator', 'COORDINATOR'),
('uuid-3', 'coord2@example.com', 'Second Coordinator', 'COORDINATOR'),
('uuid-4', 'tenant1@example.com', 'Tenant One', 'TENANT'),
('uuid-5', 'tenant2@example.com', 'Tenant Two', 'TENANT');
```

---

## Production Deployment

When you're ready to deploy to production, follow these steps:

### 1. Create Production Supabase Project

**Time:** 10 minutes

1. Go to https://supabase.com/dashboard
2. Create new project (separate from development)
3. Note down production URL and keys
4. Run all migrations on production database
5. Create production admin user

---

### 2. Set Up Production Environment

**Time:** 15 minutes

1. **Deploy to Vercel** (Recommended)
   - Connect GitHub repository
   - Add environment variables
   - Deploy

2. **Or Deploy to Other Platform**
   - See DEPLOYMENT.md for:
     - Docker deployment
     - AWS deployment
     - Custom server setup

**Environment Variables for Production:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=production-anon-key
SUPABASE_SERVICE_ROLE_KEY=production-service-role-key
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Email (if configured)
EMAIL_SERVICE=resend
RESEND_API_KEY=production-api-key
EMAIL_FROM=noreply@yourdomain.com
```

---

### 3. Configure Production Services

**Email:**
- Set up production email service
- Configure sender domain
- Test notifications

**Storage:**
- Create production storage buckets
- Set appropriate policies
- Test file uploads

**Monitoring:**
- Set up error tracking (Sentry)
- Configure analytics (Vercel Analytics)
- Set up uptime monitoring

**See:** DEPLOYMENT.md for complete production checklist

---

## Summary

**Immediate (Do Now):**
- ✅ Run database migrations
- ✅ Create admin user
- ✅ Test login

**This Week:**
- ✅ Test all portals
- ✅ Create sample data
- ✅ Test complete workflow

**Optional:**
- 📧 Configure email
- 📸 Set up photo storage
- 👥 Add more users

**When Ready:**
- 🚀 Deploy to production

---

## Quick Reference

### Database Setup
```sql
-- Run in Supabase SQL Editor:
-- 1. Run 001_initial_schema.sql
-- 2. Run 002_rls_policies.sql
-- 3. Run 003_sample_data.sql (optional)

-- Create admin:
INSERT INTO profiles (id, email, name, role)
VALUES ('your-uuid', 'email@example.com', 'Your Name', 'ADMIN');
```

### Verify Setup
```bash
# Check environment
./scripts/check-env.sh

# Start server
npm run dev

# Open app
open http://localhost:3000
```

### Test Login
```
URL: http://localhost:3000/login
Email: your-admin-email
Password: your-password
Expected: Redirect to /admin
```

---

**Next Steps:**
- 📖 Read **USING_THE_APP.md** to learn features
- 🚀 Read **DEPLOYMENT.md** for production setup
- 🔧 See **TROUBLESHOOTING.md** if issues arise

**Enjoy your Corporate Living App!** 🏘️
