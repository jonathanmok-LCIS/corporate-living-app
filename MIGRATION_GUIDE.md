# Database Migration and Setup Guide

This document provides step-by-step instructions for setting up the Corporate Living App database with Supabase.

## Prerequisites

- A Supabase account (sign up at [https://supabase.com](https://supabase.com))
- Access to the Supabase Dashboard

## Step 1: Create a Supabase Project

1. Log in to your Supabase account
2. Click "New Project"
3. Fill in the project details:
   - **Project Name**: Corporate Living App
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (this may take a few minutes)

## Step 2: Get Your Project Credentials

1. In your project dashboard, click on the "Settings" icon in the sidebar
2. Navigate to "API"
3. Copy the following credentials:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Save these to your `.env.local` file in the project root

## Step 3: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended for MVP)

1. In your Supabase project dashboard, click on the "SQL Editor" icon in the sidebar
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/20240101000000_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" or press `Ctrl+Enter` (or `Cmd+Enter` on Mac)
6. Wait for the migration to complete (you should see "Success" message)
7. Repeat steps 2-6 for `supabase/migrations/20240101000001_rls_policies.sql`

### Option B: Using Supabase CLI (For production deployments)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

## Step 4: Set Up Storage Buckets

### Create Buckets

1. In your Supabase dashboard, click on "Storage" in the sidebar
2. Click "Create a new bucket"
3. Create the following buckets:

#### Bucket 1: `inspection-photos`
- **Name**: `inspection-photos`
- **Public bucket**: ✗ (unchecked)
- Click "Create bucket"

#### Bucket 2: `signatures`
- **Name**: `signatures`
- **Public bucket**: ✗ (unchecked)
- Click "Create bucket"

### Set Up Storage Policies

After creating each bucket, you need to set up Row Level Security policies:

#### For `inspection-photos` bucket:

1. Click on the `inspection-photos` bucket
2. Click on "Policies" tab
3. Click "New policy"

**Policy 1: Allow authenticated users to view photos**
```sql
CREATE POLICY "Authenticated users can view inspection photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inspection-photos' AND
  auth.role() = 'authenticated'
);
```

**Policy 2: Allow coordinators to upload photos**
```sql
CREATE POLICY "Coordinators can upload inspection photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inspection-photos' AND
  auth.role() = 'authenticated'
);
```

**Policy 3: Allow coordinators to delete photos**
```sql
CREATE POLICY "Coordinators can delete inspection photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inspection-photos' AND
  auth.role() = 'authenticated'
);
```

#### For `signatures` bucket:

1. Click on the `signatures` bucket
2. Click on "Policies" tab
3. Click "New policy"

**Policy 1: Allow authenticated users to view signatures**
```sql
CREATE POLICY "Authenticated users can view signatures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'signatures' AND
  auth.role() = 'authenticated'
);
```

**Policy 2: Allow tenants to upload signatures**
```sql
CREATE POLICY "Tenants can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signatures' AND
  auth.role() = 'authenticated'
);
```

## Step 5: Create Test Users

To test the application, you'll want to create users with different roles:

### Via Supabase Dashboard:

1. Go to "Authentication" → "Users" in the Supabase dashboard
2. Click "Add user"
3. Create users with the following roles:

**Admin User:**
```sql
-- After creating the user in the UI, run this in SQL Editor:
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  '<user-id-from-auth-users>',
  'admin@example.com',
  'Admin User',
  'ADMIN'
);
```

**Coordinator User:**
```sql
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  '<user-id-from-auth-users>',
  'coordinator@example.com',
  'Coordinator User',
  'COORDINATOR'
);
```

**Tenant User:**
```sql
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  '<user-id-from-auth-users>',
  'tenant@example.com',
  'Tenant User',
  'TENANT'
);
```

### Via Application Signup (Tenants only):

Users who sign up through the application will automatically be assigned the 'TENANT' role. Admins must manually upgrade users to 'COORDINATOR' or 'ADMIN' roles via SQL.

## Step 6: Verify Setup

Run these queries in the SQL Editor to verify your setup:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check storage buckets
SELECT * FROM storage.buckets;

-- Check policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## Step 7: Configure Authentication (Optional)

### Email Authentication Settings

1. Go to "Authentication" → "Email Templates" in Supabase dashboard
2. Customize the email templates for:
   - Confirm signup
   - Reset password
   - Magic link
   - Email change

### Authentication Providers

By default, only email/password authentication is enabled. To add other providers:

1. Go to "Authentication" → "Providers"
2. Enable desired providers (Google, GitHub, etc.)
3. Configure OAuth credentials

## Troubleshooting

### Migration Errors

If you encounter errors during migration:

1. Check the error message in the SQL Editor
2. Ensure you're running migrations in order
3. If needed, you can reset the database:
   - Go to "Settings" → "Database"
   - Scroll to "Reset Database Password" (this will clear all data)
   - Re-run migrations from scratch

### RLS Policy Issues

If users can't access data they should be able to:

1. Check the user's role in the `profiles` table
2. Verify RLS is enabled on the table
3. Review the policy definitions
4. Test policies using the SQL Editor:
   ```sql
   -- Test as a specific user
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claims TO '{"sub":"<user-id>"}';
   
   -- Try querying the table
   SELECT * FROM houses;
   ```

### Storage Access Issues

If file uploads or downloads fail:

1. Verify the bucket exists
2. Check storage policies are correctly configured
3. Ensure the bucket name in your code matches the created bucket
4. Check file size limits (default is 50MB)

## Next Steps

After completing this setup:

1. Update your `.env.local` file with the Supabase credentials
2. Run `npm run dev` to start the development server
3. Navigate to `http://localhost:3000`
4. Sign up for a new account or log in with test credentials
5. Start exploring the application!

## Security Notes

- **Never commit `.env.local`** to version control
- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose in client code
- The service role key should NEVER be exposed to clients
- RLS policies provide an additional security layer on top of authentication
- Always test your RLS policies thoroughly before deploying to production

## Production Deployment

For production deployments:

1. Use environment variables for all secrets
2. Enable SSL certificate validation
3. Set up proper monitoring and logging
4. Configure database backups in Supabase
5. Review and test all RLS policies
6. Set up proper error tracking (e.g., Sentry)
7. Configure rate limiting for API endpoints
8. Review storage bucket policies and file size limits

## Support

For issues related to:
- **Supabase**: Visit [Supabase Documentation](https://supabase.com/docs)
- **Next.js**: Visit [Next.js Documentation](https://nextjs.org/docs)
- **This Application**: Create an issue in the GitHub repository
