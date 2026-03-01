# Setup Guide - Corporate Living App

This guide will walk you through setting up the Corporate Living Move In/Out application from scratch.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account (free tier is sufficient)
- Basic understanding of Next.js and React

## Step 1: Clone and Install

```bash
git clone <repository-url>
cd corporate-living-app
npm install
```

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - Name: `corporate-living-app`
   - Database Password: Choose a strong password
   - Region: Select closest to your users
   - Pricing Plan: Free tier is fine for development
4. Wait for the project to be provisioned (2-3 minutes)

## Step 3: Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll need three values:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: `SUPABASE_SERVICE_ROLE_KEY`

## Step 4: Configure Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Step 5: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended for first time)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the query editor
6. Click **Run** (bottom right)
7. Wait for success message
8. Repeat steps 3-7 for `supabase/migrations/002_rls_policies.sql`

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Step 6: Create Storage Buckets (Optional)

For photo uploads and signatures:

1. In Supabase dashboard, go to **Storage**
2. Click **New Bucket**
3. Create bucket named `inspection-photos`
   - Public: Yes (or configure policies for authenticated access)
4. Create bucket named `signatures`
   - Public: No (keep private)

## Step 7: Create Your First Admin User

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **Add User** → **Create new user**
3. Enter email and password
4. Click **Create User**
5. Note the UUID of the created user
6. Go to **SQL Editor** and run:

```sql
INSERT INTO profiles (id, email, name, role)
VALUES ('your-user-uuid', 'admin@example.com', 'Admin User', 'ADMIN');
```

Replace:
- `your-user-uuid` with the UUID from step 5
- `admin@example.com` with the email you used
- `Admin User` with your name

## Step 8: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 9: Initial Data Setup

Now that you have an admin user, log into the application:

### 1. Create Houses

1. Navigate to `/admin/houses`
2. Click **Add House**
3. Fill in:
   - Name: e.g., "Smith House", "Jones Residence"
   - Address: Physical address (optional)
4. Click **Create**

### 2. Add Rooms to Houses

1. On the Houses page, click **Rooms** for a house
2. Click **Add Room**
3. Fill in:
   - Room Label: e.g., "Room 101", "Master Bedroom"
   - Capacity: 1 or 2 people
4. Click **Create**
5. Repeat for all rooms in the house

### 3. Create Coordinator Users

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Create users who will be coordinators
3. In **SQL Editor**, update their roles:

```sql
UPDATE profiles
SET role = 'COORDINATOR'
WHERE email = 'coordinator@example.com';
```

### 4. Assign Coordinators to Houses

1. Navigate to `/admin/houses`
2. Click **Coordinators** for a house
3. Select a coordinator from the dropdown
4. Click **Assign**

### 5. Create Tenant Users

1. In Supabase dashboard, create tenant users
2. Their role defaults to 'TENANT' (no SQL update needed)

### 6. Create Tenancies

1. Navigate to `/admin/tenancies`
2. Click **Create Tenancy**
3. Fill in:
   - Room: Select from dropdown
   - Slot: A or B (if capacity is 2)
   - Tenant: Select tenant
   - Start Date: When they moved in
   - End Date: Leave blank for ongoing tenancies
4. Click **Create Tenancy**

## Step 10: Test the Workflows

### Test Move-Out Intention (as Tenant)

1. Log in as a tenant user
2. Navigate to `/tenant/move-out`
3. Submit a move-out intention
4. Check that status updates in admin tenancies view

### Test Inspection (as Coordinator)

1. Log in as a coordinator
2. Navigate to `/coordinator/inspections`
3. Create a new inspection for a move-out intention
4. Fill in the 7-item checklist
5. Finalize the inspection

### Test Move-In Acknowledgement (as Tenant)

1. Create a new tenancy with status `MOVE_IN_PENDING_SIGNATURE`
2. Log in as the new tenant
3. Navigate to `/tenant/move-in`
4. View the inspection report
5. Sign with the signature pad
6. Submit

## Troubleshooting

### "Supabase Not Configured" Error

- Check that `.env.local` exists and has correct values
- Restart the dev server after changing env vars
- Verify values are correctly copied from Supabase dashboard

### Database Errors

- Ensure all migrations ran successfully
- Check Supabase logs: **Database** → **Logs**
- Verify RLS policies are enabled

### Authentication Issues

- Check Supabase Auth settings: **Authentication** → **Settings**
- Ensure user exists in both `auth.users` and `profiles` table
- Verify email confirmation settings if using email auth

### Build Errors

Run TypeScript check:
```bash
npm run build
```

Common issues:
- Missing environment variables during build
- Type errors - check TypeScript errors carefully

## Email Notifications Setup (Optional)

The app includes a placeholder API route at `/api/notifications/route.ts`. To enable real email notifications:

1. Choose an email service:
   - [Resend](https://resend.com) - Easy, modern
   - [SendGrid](https://sendgrid.com) - Popular, reliable
   - [AWS SES](https://aws.amazon.com/ses/) - Scalable

2. Install the SDK:
   ```bash
   npm install resend  # or chosen provider
   ```

3. Update `/app/api/notifications/route.ts` with actual email sending logic

4. Add email service API key to `.env.local`:
   ```env
   RESEND_API_KEY=your-api-key
   ```

5. Update the move-out, inspection, and move-in pages to call the API route

## Production Deployment

### Recommended: Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy

### Alternative: Docker

```bash
npm run build
npm start
```

Or use the included Dockerfile (if added).

## Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Review RLS policies
- [ ] Enable email verification for new users
- [ ] Set up proper CORS policies
- [ ] Configure rate limiting
- [ ] Enable Supabase database backups
- [ ] Set up monitoring and alerts
- [ ] Review and test all user roles and permissions

## Support

For issues or questions:
- Check the main README.md
- Review Supabase documentation
- Open an issue on GitHub

## Next Steps

- Customize the UI to match your branding
- Add photo upload functionality
- Implement email notifications
- Add reporting and analytics
- Create mobile app (React Native)
