# Corporate Living App — Architecture Overview

## Technology Stack

```
┌──────────────────────────────────────────────┐
│            Next.js 16 (App Router)           │
│  ┌────────────────────────────────────────┐  │
│  │   React 19 Server Components           │  │
│  │   TypeScript 5 · Tailwind CSS v4       │  │
│  └────────────────────────────────────────┘  │
└──────────────┬───────────────────────────────┘
               │ HTTPS
┌──────────────▼───────────────────────────────┐
│            Supabase Platform                 │
│  ┌──────────────────────────────────┐        │
│  │ PostgreSQL 15                    │        │
│  │ ├── 10 Tables + Custom Enums     │        │
│  │ ├── 30+ RLS Policies             │        │
│  │ └── Performance Indexes          │        │
│  ├──────────────────────────────────┤        │
│  │ Auth  (Email/Password, JWT)      │        │
│  ├──────────────────────────────────┤        │
│  │ Storage (inspection-photos,      │        │
│  │          move-out-photos,        │        │
│  │          signatures)             │        │
│  └──────────────────────────────────┘        │
└──────────────────────────────────────────────┘
```

---

## Project Structure

```
corporate-living-app/
│
├── app/                                  # Next.js App Router
│   ├── layout.tsx                        # Root layout (HTML, fonts, metadata)
│   ├── page.tsx                          # Landing page
│   ├── globals.css                       # Tailwind v4 global styles
│   ├── manifest.ts                       # PWA manifest
│   ├── icon.tsx / apple-icon.tsx         # Dynamic favicons
│   │
│   ├── admin/                            # ── Admin Portal (purple) ──
│   │   ├── layout.tsx                    # Admin nav, role check
│   │   ├── page.tsx                      # Dashboard: KPIs, approval queue, overdue inspections
│   │   ├── houses/
│   │   │   ├── page.tsx                  # House list (card grid, inspection-due indicators)
│   │   │   ├── actions.ts               # House CRUD server actions
│   │   │   ├── archived/page.tsx         # Archived houses view
│   │   │   ├── quick-setup/page.tsx      # Quick-setup wizard (house + rooms + coordinator)
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # House detail: rooms, tenancies, coordinators
│   │   │       ├── rooms/actions.ts      # Room add/edit/archive actions
│   │   │       └── coordinators/actions.ts
│   │   ├── inspections/
│   │   │   ├── page.tsx                  # All inspections list
│   │   │   └── [id]/page.tsx             # Inspection detail
│   │   ├── move-out-intentions/
│   │   │   ├── page.tsx                  # All move-out submissions
│   │   │   └── [id]/page.tsx             # Move-out detail
│   │   ├── tenancies/
│   │   │   ├── page.tsx                  # Tenancy list
│   │   │   └── actions.ts               # Tenancy CRUD
│   │   └── users/
│   │       ├── page.tsx                  # User management
│   │       └── actions.ts               # User CRUD
│   │
│   ├── coordinator/                      # ── Coordinator Portal (green) ──
│   │   ├── layout.tsx                    # Coordinator nav, role check
│   │   ├── page.tsx                      # Coordinator dashboard
│   │   ├── inspections/
│   │   │   ├── page.tsx                  # Inspections list (card UI, StatusBadge)
│   │   │   └── [id]/page.tsx             # Create/edit inspection (dynamic room checklist)
│   │   └── move-out-reviews/
│   │       └── page.tsx                  # Move-out reviews for assigned houses
│   │
│   ├── tenant/                           # ── Tenant Portal (blue) ──
│   │   ├── layout.tsx                    # Tenant nav, role check
│   │   ├── page.tsx                      # Tenant dashboard (status, quick links)
│   │   ├── move-in/
│   │   │   ├── page.tsx                  # Move-in acknowledgement (signature + inspection view)
│   │   │   └── actions.ts               # Acknowledgement actions + duplicate check
│   │   └── move-out/
│   │       ├── page.tsx                  # Move-out form (photos, damage conditional)
│   │       └── actions.ts               # Move-out submission actions
│   │
│   ├── auth/
│   │   ├── actions.ts                   # Login, signup, signout (role-based redirect)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   │
│   ├── api/
│   │   ├── notifications/route.ts       # Email notification endpoint
│   │   └── move-out-intentions/[id]/signed-urls/route.ts
│   │
│   ├── dashboard/
│   │   └── page.tsx                     # Role-based redirect (no UI)
│   │
│   ├── login/page.tsx                   # Public login page
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── change-password/page.tsx
│   └── dev/seed-tenancy/                # Dev seed helper
│
├── components/
│   ├── dashboard/                       # ── Shared Design System ──
│   │   ├── KpiCard.tsx                  # Stat card with icon + trend
│   │   ├── SectionCard.tsx              # Content section wrapper
│   │   ├── ActionList.tsx               # Quick-link action list
│   │   ├── StatusBadge.tsx              # Colour-coded status pill
│   │   └── index.ts                     # Barrel export
│   ├── LogoutButton.tsx                 # Sign-out button
│   ├── MobileNav.tsx                    # Mobile hamburger menu
│   └── RoleSwitcher.tsx                 # Multi-role user role switcher
│
├── lib/
│   ├── supabase-server.ts               # Server-side Supabase client (cookies)
│   ├── supabase-browser.ts              # Client-side Supabase client
│   ├── imageCompression.ts              # Client-side image compression
│   ├── storage.ts                       # Supabase Storage helpers
│   └── types.ts                         # Shared TypeScript type definitions
│
├── supabase/
│   └── migrations/                      # 22 SQL migration files
│       ├── 001_initial_schema.sql       # Tables, enums, indexes, triggers
│       ├── 002_rls_policies.sql         # Row Level Security (30+ policies)
│       ├── 003_sample_data.sql          # Optional sample data
│       ├── 004_add_rental_price.sql
│       ├── 005_add_move_out_photos_and_signoff.sql
│       ├── 006_enhance_move_out_move_in.sql
│       ├── 007_remove_bank_fields.sql
│       ├── 008_add_performance_indexes.sql
│       ├── 009_fix_move_out_rls.sql
│       ├── 010_storage_rls_policies.sql
│       ├── 011_update_storage_rls_private_bucket.sql
│       ├── 012_fix_move_out_intentions_rls.sql
│       ├── 013_fix_move_out_intentions_insert_policy.sql
│       ├── 014_multiple_roles.sql       # role → roles TEXT[]
│       ├── 015_house_inspections.sql    # Room-based inspections overhaul
│       ├── 016_fix_rls_for_roles_array.sql
│       ├── 017_tenancy_status_refactor.sql
│       ├── 018_houses_is_archived.sql
│       └── (legacy 20240101* files)
│
├── middleware.ts                         # Auth + route protection
├── next.config.ts                       # Next.js + image remote patterns
├── tailwind.config.ts                   # Tailwind v4 configuration
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
└── package.json
```

---

## Data Flow Architecture

### Authentication Flow

```
Browser ── POST ──▶ Next.js Server Action ── REST ──▶ Supabase Auth ──▶ PostgreSQL
  ◀── Set-Cookie (JWT) ◀── JWT ◀── User record ◀──

1. User submits login form
2. Server action calls supabase.auth.signInWithPassword()
3. Supabase validates credentials, returns JWT
4. Next.js sets HTTP-only cookie
5. Redirects to role-appropriate portal (/admin, /coordinator, or /tenant)
```

### Server Component Data Fetching

```
Browser ── HTTP ──▶ Next.js RSC ── REST ──▶ Supabase DB + RLS ──▶ Filtered Data
  ◀── HTML ◀── Render ◀── JSON ◀──

1. User navigates to /admin/houses
2. Server component creates authenticated Supabase client
3. Queries database — RLS policies auto-filter by role
4. Renders HTML on server, streams to browser
```

### Server Action Mutations

```
Browser (Form) ── POST ──▶ Server Action ── REST ──▶ Supabase DB + RLS
  ◀── Redirect / Error ◀── revalidatePath() ◀── Success/Error ◀──

1. User submits form
2. Server action validates input
3. Inserts/updates via Supabase (RLS enforced)
4. Revalidates cache, redirects
```

---

## Database Schema

### Entity Relationships

```
profiles (roles TEXT[])
    │
    ├──── house_coordinators ────── houses (active)
    │                                 │
    │                                 └── rooms (label, capacity, active)
    │                                       │
    └──── tenancies ──────────────────────── ┘
              │        (room_id, slot, tenant_user_id, status)
              │
              ├── move_out_intentions (planned_move_out_date, photos, damage)
              │
              ├── inspections (room_id, created_by, status DRAFT/FINAL)
              │       │
              │       ├── inspection_checklist_items (key, yes_no, description)
              │       └── inspection_photos (url, category)
              │
              └── move_in_acknowledgements (signed_by, signature_image_url, audit_json)
```

### Core Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `profiles` | `id`, `email`, `name`, `roles TEXT[]` | Extends `auth.users`; supports multi-role |
| `houses` | `id`, `name`, `address`, `active` | `active=false` for archived |
| `rooms` | `id`, `house_id`, `label`, `capacity` (1\|2), `active` | Unique on `(house_id, label)` |
| `house_coordinators` | `house_id`, `user_id` | Many-to-many link |
| `tenancies` | `room_id`, `slot` (A\|B), `tenant_user_id`, `status` | Enum: 6 lifecycle states |
| `move_out_intentions` | `tenancy_id`, `planned_move_out_date`, `notes` | + photo/damage columns from migration 005 |
| `inspections` | `tenancy_id`, `room_id`, `created_by`, `status`, `finalised_at` | DRAFT or FINAL |
| `inspection_checklist_items` | `inspection_id`, `key`, `yes_no`, `description_if_no` | Unique on `(inspection_id, key)` |
| `inspection_photos` | `inspection_id`, `url`, `category` | |
| `move_in_acknowledgements` | `tenancy_id`, `inspection_id`, `signed_by`, `signature_image_url`, `audit_json` | |

### Custom Enums

| Enum | Values |
|------|--------|
| `tenancy_status` | OCCUPIED, MOVE_OUT_INTENDED, MOVE_OUT_INSPECTION_DRAFT, MOVE_OUT_INSPECTION_FINAL, MOVE_IN_PENDING_SIGNATURE, ENDED |
| `inspection_status` | DRAFT, FINAL |
| `room_slot` | A, B |

---

## Security Architecture

### Defence in Depth

```
Layer 1 — Network
  └── HTTPS/TLS (Vercel + Supabase)

Layer 2 — Application (Next.js)
  ├── CSRF protection (built-in server actions)
  ├── XSS prevention (React auto-escaping)
  └── Middleware route guards

Layer 3 — Authentication (Supabase Auth)
  ├── bcrypt password hashing
  ├── Signed JWT tokens
  └── HTTP-only secure cookies

Layer 4 — Authorization (Middleware + RLS)
  ├── Next.js middleware checks role before page render
  └── PostgreSQL RLS policies enforce data access per-user

Layer 5 — Database (Row Level Security)
  ├── 30+ RLS policies across all tables
  ├── Finalized inspections are immutable
  └── Coordinators restricted to assigned houses
```

### Permission Matrix

```
┌──────────────────────┬───────┬─────────────┬────────┐
│      Resource        │ ADMIN │ COORDINATOR │ TENANT │
├──────────────────────┼───────┼─────────────┼────────┤
│ Houses               │ CRUD  │ Read (own)  │  —     │
│ Rooms                │ CRUD  │ Read (own)  │  —     │
│ Tenancies            │ CRUD  │ Read (own)  │ Own    │
│ Move-Out Intentions  │ All   │ Review      │ Submit │
│ Inspections          │ All   │ Manage      │ View   │
│ Inspection Photos    │ All   │ Manage      │ View   │
│ Move-In Ack          │ All   │ View        │ Sign   │
│ Users                │ CRUD  │  —          │ Own    │
└──────────────────────┴───────┴─────────────┴────────┘
```

---

## Design System

### Portal Colour Scheme

| Portal | Primary Colour | Nav Accent |
|--------|----------------|------------|
| Admin | Purple (`purple-600`) | Purple gradient |
| Coordinator | Green (`green-600`) | Green gradient |
| Tenant | Blue (`blue-600`) | Blue gradient |

### Shared Components (`components/dashboard/`)

| Component | Purpose |
|-----------|---------|
| `KpiCard` | Stat card with icon, value, label |
| `SectionCard` | Rounded-xl container for content sections |
| `ActionList` | Quick-link list with icons |
| `StatusBadge` | Colour-coded pill badge for statuses |

### Card Conventions

```
Container:  rounded-xl border border-gray-100 shadow-sm
Button:     rounded-lg text-sm font-medium transition-colors
Logo:       SVG house icon (consistent across all 3 portals)
```

---

## Deployment Architecture

```
┌──────────────────────────────────────────────────┐
│                    Vercel                        │
│  ├── Edge Functions (middleware)                 │
│  ├── Server Components (SSR)                    │
│  ├── Server Actions                             │
│  └── Static Assets (CDN)                        │
└──────────────┬───────────────────────────────────┘
               │ HTTPS
┌──────────────▼───────────────────────────────────┐
│                   Supabase                       │
│  ├── PostgreSQL (connection pooling, backups)    │
│  ├── Auth (email/password, JWT)                  │
│  └── Storage (CDN-backed buckets)               │
└──────────────────────────────────────────────────┘
```

### Continuous Deployment

- **Production**: Auto-deploy on push to `main`
- **Preview**: Auto-deploy on pull requests
- Environment variables configured in Vercel dashboard

---

## Development Workflow

```
1. Local Development     → npm run dev (Turbopack)
2. Lint                  → npm run lint (ESLint)
3. Build                 → npm run build (TypeScript + Next.js)
4. Commit & Push         → git push origin main
5. Deploy                → Vercel auto-deploys
6. Database Changes      → New migration SQL → run in Supabase SQL Editor
```
