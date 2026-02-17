# Corporate Living Move In/Out App

A web application for managing move-in and move-out processes in corporate living houses. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## ⚡ Super Quick Start

**Just want to get it running?** → **[QUICK_START.md](./QUICK_START.md)** ← Start here!

**Having errors?** → **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** ← Common issues solved!

## 🚀 Full Documentation

**New to this project?** Choose your path:

1. **[QUICK_START.md](./QUICK_START.md)** - 🆕 Get running in 5 minutes!
2. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - 🆕 Fix common errors (like "Could not read package.json")
3. **[ENV_SETUP.md](./ENV_SETUP.md)** - Beginner's guide to environment variables
4. **[WHATS_NEXT.md](./WHATS_NEXT.md)** - Quick reference for getting started
5. **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Detailed 3-day implementation guide
6. **[SETUP.md](./SETUP.md)** - Complete setup instructions
7. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide

## 📊 Project Status

- **Completion**: 85% complete, ready for production setup
- **Core Features**: ✅ All implemented
- **Database**: ✅ Schema and RLS policies complete
- **UI/UX**: ✅ All portals functional
- **Next Steps**: Email integration, storage configuration, testing

## Features

- **Tenant Portal**: Submit move-out intentions and sign move-in acknowledgements digitally
- **Coordinator Portal**: Create and manage move-out inspections with checklists and photos
- **Admin Portal**: Manage houses, rooms, tenancies, and coordinators
- **Email Notifications**: Automated notifications for key events
- **Role-Based Access**: Secure access control for Admin, Coordinator, and Tenant roles
- **Mobile-Friendly**: Optimized for use on mobile devices, especially for signature capture

## Tech Stack

- **Frontend**: Next.js 15 with App Router, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Row Level Security)
- **Signature Capture**: react-signature-canvas

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works fine)

## Setup Instructions

> **⚠️ CRITICAL: Make sure you're in the project directory!**
> 
> Before running any commands below, navigate to the project directory:
> ```bash
> cd corporate-living-app
> ```
> 
> Verify you're in the right place by checking for `package.json`:
> ```bash
> ls package.json  # Should show: package.json (not an error)
> ```
> 
> **Common mistake:** Running `npm run dev` from your home directory will fail with "Could not read package.json" error. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for help.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd corporate-living-app  # ← IMPORTANT: Navigate into the folder!
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

**New to environment variables?** 📚 See [ENV_SETUP.md](./ENV_SETUP.md) for a detailed beginner-friendly guide!

**Quick Setup:**

1. Create a new project at [supabase.com](https://supabase.com)
2. Once your project is ready, go to **Settings** → **API** to find your credentials
3. **Choose ONE of these methods:**

   **Option A: Interactive Setup (Recommended for beginners)** 🚀
   ```bash
   # Run the setup helper script
   ./scripts/setup-env.sh
   ```
   This will guide you through the process step-by-step!

   **Option B: Manual Setup**
   ```bash
   # Copy the template
   cp .env.example .env.local
   
   # Edit .env.local and replace the placeholders with your actual values
   # The file has detailed comments explaining each variable
   ```

4. Get your credentials from Supabase:
   - **Project URL**: Settings → API → Project URL
   - **Anon Key**: Settings → API → anon public key
   - **Service Role Key**: Settings → API → service_role key (keep secret!)

**Need help?** The `.env.example` file has detailed comments for each variable!

### 4. Run Database Migrations

In your Supabase project dashboard:

1. Go to **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the query
5. Repeat for `supabase/migrations/002_rls_policies.sql`

Alternatively, if you have the Supabase CLI installed:

```bash
supabase db push
```

### 5. Set Up Storage Buckets (Optional)

For photo uploads and signature storage:

1. Go to **Storage** in your Supabase dashboard
2. Create a bucket named `inspection-photos`
3. Create a bucket named `signatures`
4. Set appropriate access policies for each bucket

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Initial Setup

1. **Create an Admin User**: 
   - Sign up through Supabase Auth
   - Manually update your user role in the `profiles` table to `ADMIN`

2. **Add Houses and Rooms**:
   - Navigate to `/admin/houses`
   - Create houses and add rooms with capacity (1 or 2 people)

3. **Assign Coordinators**:
   - Create coordinator users
   - Assign them to specific houses

### Workflows

#### Move-Out Process (Tenant)

1. Tenant navigates to `/tenant/move-out`
2. Submits planned move-out date and optional notes
3. System updates tenancy status to `MOVE_OUT_INTENDED`
4. Coordinators and admins receive email notifications

#### Move-Out Inspection (Coordinator)

1. Coordinator creates a new inspection from `/coordinator/inspections`
2. Completes the 7-item checklist (Yes/No with descriptions for No answers)
3. Uploads photos of room condition (optional)
4. Finalizes inspection (locks edits)
5. System updates tenancy status to `MOVE_OUT_INSPECTION_FINAL`
6. Admins receive email notification

#### Move-In Acknowledgement (New Tenant)

1. Admin assigns new tenant to room
2. Tenant views latest inspection report at `/tenant/move-in`
3. Tenant draws signature on phone/tablet
4. System saves signature and creates acknowledgement record
5. Tenancy status becomes `OCCUPIED`
6. Admin and coordinator receive email notification

## Database Schema

### Main Tables

- **profiles**: User information with roles (ADMIN, COORDINATOR, TENANT)
- **houses**: Properties managed by the system
- **rooms**: Individual rooms within houses
- **house_coordinators**: Links coordinators to houses
- **tenancies**: Tenant assignments to rooms with status tracking
- **move_out_intentions**: Move-out submissions from tenants
- **inspections**: Move-out inspection records
- **inspection_checklist_items**: Checklist responses for each inspection
- **inspection_photos**: Photos uploaded during inspections
- **move_in_acknowledgements**: Digital signatures and move-in records

### Tenancy Statuses

- `OCCUPIED`: Tenant currently living in the room
- `MOVE_OUT_INTENDED`: Tenant has submitted move-out intention
- `MOVE_OUT_INSPECTION_DRAFT`: Inspection in progress
- `MOVE_OUT_INSPECTION_FINAL`: Inspection completed and finalized
- `MOVE_IN_PENDING_SIGNATURE`: New tenant assigned, awaiting signature
- `ENDED`: Tenancy has ended

## Security

- Row Level Security (RLS) policies ensure users can only access appropriate data
- Coordinators can only manage inspections for houses they're assigned to
- Tenants can only view and modify their own tenancies
- Admins have full access to all records

## Development

### Project Structure

```
corporate-living-app/
├── app/
│   ├── admin/          # Admin portal pages
│   ├── coordinator/    # Coordinator portal pages
│   ├── tenant/         # Tenant portal pages
│   └── layout.tsx      # Root layout
├── components/         # Reusable React components
├── lib/
│   ├── supabase.ts     # Supabase client (client-side)
│   ├── supabase-server.ts  # Supabase client (server-side)
│   └── types.ts        # TypeScript type definitions
├── supabase/
│   └── migrations/     # Database migration files
└── public/             # Static assets
```

### Building for Production

```bash
npm run build
npm start
```

## Deployment

This app can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- Any platform that supports Node.js

Make sure to set your environment variables in your deployment platform.

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
