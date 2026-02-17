# Corporate Living App

A comprehensive property management application for corporate housing, built with Next.js, Tailwind CSS, and Supabase.

## Features

- **Role-Based Access Control**: ADMIN, COORDINATOR, and TENANT roles with appropriate permissions
- **Property Management**: Houses and rooms management with availability tracking
- **Tenancy Management**: Track tenant assignments, move-in/move-out dates, and rental details
- **Move-Out Intentions**: Tenants can submit move-out requests with approval workflow
- **Inspection System**: Comprehensive move-in/move-out inspections with:
  - Customizable checklist items
  - Photo upload capability
  - Finalize/lock functionality
- **Move-In Acknowledgements**: Digital signature capture on mobile devices
- **Email Notifications**: Automated notifications for key events

## Tech Stack

- **Frontend**: Next.js 16+ with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Signature Capture**: react-signature-canvas

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jonathanmok-LCIS/corporate-living-app.git
cd corporate-living-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

1. **Create a Supabase Project**: Go to [https://supabase.com](https://supabase.com) and create a new project.

2. **Run Migrations**: 
   - In your Supabase Dashboard, go to SQL Editor
   - Run the migration files in order:
     - `supabase/migrations/20240101000000_initial_schema.sql`
     - `supabase/migrations/20240101000001_rls_policies.sql`

3. **Create Storage Buckets**:
   - Go to Storage in your Supabase Dashboard
   - Create two buckets:
     - `inspection-photos` (for inspection photos)
     - `signatures` (for move-in acknowledgement signatures)

4. **Configure Storage Policies**:
   
   For `inspection-photos` bucket:
   ```sql
   -- Allow authenticated users to view photos for their inspections
   CREATE POLICY "Authenticated users can view inspection photos"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'inspection-photos' AND
     auth.role() = 'authenticated'
   );

   -- Allow coordinators/admins to upload photos
   CREATE POLICY "Coordinators can upload inspection photos"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'inspection-photos' AND
     auth.role() = 'authenticated'
   );
   ```

   For `signatures` bucket:
   ```sql
   -- Allow authenticated users to view signatures
   CREATE POLICY "Authenticated users can view signatures"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'signatures' AND
     auth.role() = 'authenticated'
   );

   -- Allow tenants to upload their signatures
   CREATE POLICY "Tenants can upload signatures"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'signatures' AND
     auth.role() = 'authenticated'
   );
   ```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Database Schema

### Core Tables

- **profiles**: User profiles with role-based access (ADMIN, COORDINATOR, TENANT)
- **houses**: Corporate housing properties
- **rooms**: Individual rooms within houses
- **tenancies**: Tenant assignments to rooms
- **move_out_intentions**: Tenant move-out requests and approvals
- **inspections**: Property inspections for move-in/move-out
- **inspection_items**: Individual items checked during inspections
- **inspection_photos**: Photos uploaded during inspections
- **move_in_acknowledgements**: Tenant signatures for move-in acknowledgement
- **email_notifications**: Email notification tracking

### User Roles

- **ADMIN**: Full access to all features, can manage users, houses, rooms, tenancies
- **COORDINATOR**: Can manage houses, rooms, tenancies, inspections, and review move-out intentions
- **TENANT**: Can view their own tenancies, submit move-out intentions, view inspections, and sign move-in acknowledgements

## Project Structure

```
corporate-living-app/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── utils/
│   └── supabase/          # Supabase client utilities
│       ├── client.ts      # Browser client
│       └── server.ts      # Server client
├── supabase/
│   └── migrations/        # Database migrations
│       ├── 20240101000000_initial_schema.sql
│       └── 20240101000001_rls_policies.sql
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## Row Level Security (RLS)

All tables have Row Level Security enabled with policies that enforce role-based access:

- **Profiles**: Users can view/update their own profile; admins/coordinators can view all
- **Houses/Rooms**: Everyone can view; coordinators can manage; admins can delete
- **Tenancies**: Tenants can view their own; coordinators can manage all
- **Move-Out Intentions**: Tenants can create for their tenancies; coordinators can review
- **Inspections**: Tenants can view their own; coordinators can create and manage
- **Move-In Acknowledgements**: Tenants can create for their tenancies; coordinators can view all

## License

ISC
