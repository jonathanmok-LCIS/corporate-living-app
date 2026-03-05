# Corporate Living App

A modern web application for managing move-in/move-out processes, inspections, and tenancies across corporate living houses. Built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, and **Supabase**.

**Live**: [corporate-living-app.vercel.app](https://corporate-living-app.vercel.app)

---

## Documentation

| Document | Description |
|----------|-------------|
| [SETUP.md](./SETUP.md) | Local development setup |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment guide |
| [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) | Database migration instructions |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture overview |
| [FEATURES.md](./FEATURES.md) | Feature implementation status |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Detailed implementation notes |

---

## Features

### Three Role-Based Portals

| Portal | Path | Colour | Description |
|--------|------|--------|-------------|
| **Admin** | `/admin` | Purple | Full property, tenancy, user and inspection management |
| **Coordinator** | `/coordinator` | Green | Inspections and move-out reviews for assigned houses |
| **Tenant** | `/tenant` | Blue | Move-out submission, move-in acknowledgement, dashboard |

### Core Capabilities

- **House Management** — CRUD, archive/restore, quick-setup wizard, room management with slot-based occupancy (capacity 1 or 2)
- **Tenancy Lifecycle** — Create tenancies with room-slot selection, track status through OCCUPIED → MOVE_OUT_INTENDED → INSPECTION → MOVE_IN_PENDING → ENDED
- **Move-Out Intentions** — Tenants submit planned dates with optional notes; damage/stain photo upload (required when damage reported); coordinator sign-off
- **Inspections** — Dynamic room-based checklists auto-generated from house rooms; photo upload with client-side compression; draft → final workflow
- **Move-In Acknowledgement** — New tenant views previous inspection, draws signature on canvas, records defects; duplicate-submission prevention
- **6-Month Inspection Indicators** — Overdue / due-soon badges on house cards; alert banner on houses page; count in admin dashboard approval queue
- **Email Notifications** — Automated notifications for move-out submissions and inspection completions
- **User Management** — Admin can list, search and manage users; supports multiple roles per user (`roles TEXT[]`)
- **Unified Design System** — Shared KpiCard, SectionCard, ActionList, StatusBadge components; consistent card styling; SVG house logo across all portals

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5, React 19 (Server Components) |
| Styling | Tailwind CSS v4, PostCSS |
| Database | Supabase PostgreSQL with Row Level Security |
| Auth | Supabase Auth (email/password, JWT, HTTP-only cookies) |
| Storage | Supabase Storage (inspection photos, signatures, move-out photos) |
| Signature | react-signature-canvas |
| Image Processing | Client-side compression (imageCompression.ts) |
| Deployment | Vercel (auto-deploy on push) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))

### 1. Clone & Install

```bash
git clone https://github.com/jonathanmok-LCIS/corporate-living-app.git
cd corporate-living-app
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Migrations

In Supabase SQL Editor, execute the migration files in order from `supabase/migrations/`:

```
001_initial_schema.sql        → Core tables, enums, indexes, triggers
002_rls_policies.sql          → Row Level Security policies
003_sample_data.sql           → Optional sample data
004–018                       → Incremental schema updates
```

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed instructions.

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
corporate-living-app/
├── app/
│   ├── admin/              # Admin portal (purple)
│   │   ├── houses/         # House CRUD, archive, quick-setup, detail + rooms
│   │   ├── inspections/    # View/manage inspections
│   │   ├── move-out-intentions/  # Review move-out submissions
│   │   ├── tenancies/      # Tenancy management
│   │   └── users/          # User management
│   ├── coordinator/        # Coordinator portal (green)
│   │   ├── inspections/    # Create and manage inspections
│   │   └── move-out-reviews/  # Review move-outs for assigned houses
│   ├── tenant/             # Tenant portal (blue)
│   │   ├── move-in/        # Sign move-in acknowledgement
│   │   └── move-out/       # Submit move-out intention
│   ├── auth/               # Login, signup, server actions
│   ├── api/                # API routes (notifications, signed URLs)
│   └── dashboard/          # Role-based redirect to portal
├── components/
│   ├── dashboard/          # Shared UI: KpiCard, SectionCard, ActionList, StatusBadge
│   ├── LogoutButton.tsx
│   ├── MobileNav.tsx
│   └── RoleSwitcher.tsx
├── lib/
│   ├── supabase-server.ts  # Server-side Supabase client
│   ├── supabase-browser.ts # Client-side Supabase client
│   ├── imageCompression.ts # Photo compression utility
│   ├── storage.ts          # Storage helpers
│   └── types.ts            # Shared TypeScript types
├── supabase/
│   └── migrations/         # 22 SQL migration files (001–018 + legacy)
└── middleware.ts            # Auth + route protection
```

---

## Database Schema

### Tables (10)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with `roles TEXT[]` (ADMIN, COORDINATOR, TENANT) |
| `houses` | Properties with `active` boolean for archive/restore |
| `rooms` | Rooms with `label`, `capacity` (1 or 2), `active` flag |
| `house_coordinators` | Many-to-many: coordinators ↔ houses |
| `tenancies` | Tenant assignments with `slot` (A/B), lifecycle status |
| `move_out_intentions` | Move-out submissions with date, notes, photos, damage tracking |
| `inspections` | Room-based inspections with `status` (DRAFT/FINAL) |
| `inspection_checklist_items` | Yes/No checklist items per inspection |
| `inspection_photos` | Photos with URL and category |
| `move_in_acknowledgements` | Signature, audit JSON, linked to inspection |

### Tenancy Status Flow

```
OCCUPIED → MOVE_OUT_INTENDED → MOVE_OUT_INSPECTION_DRAFT → MOVE_OUT_INSPECTION_FINAL → MOVE_IN_PENDING_SIGNATURE → ENDED
```

---

## Security

- **Row Level Security (RLS)** on all tables with role-based policies
- **Middleware** route protection with session validation
- **Server Components** for data fetching (no sensitive data on client)
- **Server Actions** for all mutations with auth checks
- Coordinators restricted to assigned houses only
- Tenants restricted to own records only
- Finalized inspections are immutable

---

## Building for Production

```bash
npm run build
npm start
```

Deploy via **Vercel** (recommended) — auto-deploys on push to `main`. See [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## License

MIT
