# Feature Implementation Status

Complete tracking of all features in the Corporate Living App.

---

## ✅ Completed Features

### 1. Infrastructure & Setup
- [x] Next.js 16 with App Router and Turbopack
- [x] TypeScript 5 strict mode
- [x] Tailwind CSS v4 with PostCSS
- [x] Supabase client setup (server: `lib/supabase-server.ts`, browser: `lib/supabase-browser.ts`)
- [x] Environment variable configuration (`.env.example`)
- [x] ESLint configuration
- [x] Build and development scripts

### 2. Database Schema & Migrations
- [x] 10 PostgreSQL tables with proper relationships
- [x] Custom enums: `tenancy_status`, `inspection_status`, `room_slot`
- [x] Performance indexes on all foreign keys and status columns
- [x] Automatic `updated_at` triggers
- [x] 22 migration files (001–018 + legacy compatibility files)
- [x] Incremental migrations for: rental price, move-out photos, bank field removal, multiple roles, room-based inspections, tenancy status refactor, house archiving

### 3. Row Level Security (RLS)
- [x] RLS enabled on all 10 tables
- [x] 30+ policies covering ADMIN, COORDINATOR, TENANT roles
- [x] Helper functions: role checking via `roles TEXT[]` array
- [x] Coordinators restricted to assigned houses
- [x] Tenants restricted to own records
- [x] Finalized inspections immutable
- [x] Storage bucket policies for inspection-photos, move-out-photos, signatures

### 4. Authentication System
- [x] Email/password authentication (Supabase Auth)
- [x] Login page with error handling
- [x] Signup page with automatic profile creation (default TENANT role)
- [x] Sign-out functionality
- [x] Forgot password / reset password flow
- [x] Change password page
- [x] Route protection via middleware
- [x] Role-based redirect after login (admin → `/admin`, coordinator → `/coordinator`, tenant → `/tenant`)
- [x] Session management with HTTP-only cookies
- [x] Multiple roles per user (`roles TEXT[]` array)
- [x] Role switcher component for multi-role users

### 5. Admin Portal (`/admin`)
- [x] Dashboard with KPI cards (houses, rooms, tenants, move-outs)
- [x] Approval queue with pending items count
- [x] Overdue inspections count in dashboard
- [x] SVG house logo in navigation

#### 5a. House Management
- [x] House list with card grid layout
- [x] Add new house form
- [x] Edit house details
- [x] House detail page (rooms, tenancies, coordinators in one view)
- [x] Archive / restore houses (soft delete via `active` boolean)
- [x] Archived houses page
- [x] Quick-setup wizard (create house + rooms + assign coordinator in one flow)
- [x] 6-month inspection-due indicators (overdue / due-soon badges on cards)
- [x] Overdue inspection alert banner on houses page
- [x] "New Inspection" button on houses page

#### 5b. Room Management (within House Detail)
- [x] List rooms in house
- [x] Add room (label, capacity 1 or 2)
- [x] Edit room
- [x] Archive / restore rooms
- [x] Slot-based occupancy display (e.g. "1/2 occupied — Slot A: John, Slot B: vacant")

#### 5c. Coordinator Management (within House Detail)
- [x] Assign coordinators to houses
- [x] Remove coordinator assignments
- [x] View assigned coordinators

#### 5d. Tenancy Management
- [x] Tenancy list page
- [x] Create tenancy with room + slot selection
- [x] Tenancy status lifecycle tracking
- [x] Server actions for CRUD

#### 5e. Move-Out Intentions (Admin View)
- [x] List all move-out submissions
- [x] View move-out detail with photos and damage info

#### 5f. Inspection Management (Admin View)
- [x] List all inspections
- [x] View inspection detail with checklist and photos

#### 5g. User Management
- [x] List all users with search
- [x] View user details
- [x] Change user roles
- [x] Server actions for user CRUD

### 6. Coordinator Portal (`/coordinator`)
- [x] Dashboard with assigned houses summary
- [x] SVG house logo in navigation
- [x] Unified card-based UI design

#### 6a. Inspections
- [x] Inspections list with card layout and StatusBadge
- [x] Loading skeleton
- [x] Create new inspection
- [x] Dynamic room-based checklist (auto-generated from house rooms)
- [x] Yes/No items with description when "No"
- [x] Photo upload with client-side compression
- [x] Finalize inspection (locks edits, sets `finalised_at`)
- [x] Edit inspection before finalization

#### 6b. Move-Out Reviews
- [x] List move-out intentions for assigned houses
- [x] Unified card layout
- [x] View submitted photos and damage information
- [x] Coordinator sign-off functionality

### 7. Tenant Portal (`/tenant`)
- [x] Dashboard with tenancy status overview
- [x] Quick links with dynamic status (e.g. "Move-In Signed ✓" when completed)
- [x] SVG house logo in navigation
- [x] Unified card-based UI design

#### 7a. Move-Out Submission
- [x] Move-out intention form (planned date, notes)
- [x] Photo upload for room condition
- [x] Damage/stain question (Yes/No)
- [x] Damage photos section (conditionally visible when damage = Yes)
- [x] Damage photo upload required when damage reported
- [x] Damage description field
- [x] Client-side image compression before upload
- [x] Form validation

#### 7b. Move-In Acknowledgement
- [x] View previous inspection report
- [x] Digital signature canvas (react-signature-canvas)
- [x] Clear and redraw signature
- [x] Mobile-responsive touch support
- [x] Condition acceptance checkbox
- [x] Defect reporting field
- [x] Save signature to Supabase Storage
- [x] Create acknowledgement record with audit JSON
- [x] Duplicate-submission prevention (checks existing acknowledgement)
- [x] "Already Completed" state when previously signed
- [x] Email notification triggers

### 8. Email Notifications
- [x] Notification API endpoint (`/api/notifications`)
- [x] Email tracking in `email_notifications` table
- [x] Triggered on: move-out submission, inspection completion
- [x] Edge-function ready architecture

### 9. Shared Design System
- [x] KpiCard component (stat card with icon and value)
- [x] SectionCard component (rounded-xl content wrapper)
- [x] ActionList component (quick-link list with icons)
- [x] StatusBadge component (colour-coded status pill)
- [x] Barrel export from `components/dashboard/index.ts`
- [x] Consistent card styling: `rounded-xl border border-gray-100 shadow-sm`
- [x] Consistent button styling: `rounded-lg text-sm font-medium transition-colors`
- [x] SVG house logo across all 3 portals
- [x] Portal colour scheme: Admin=purple, Coordinator=green, Tenant=blue
- [x] Mobile navigation (MobileNav component)
- [x] Loading skeletons for async pages
- [x] Empty states with call-to-action

### 10. Image Handling
- [x] Client-side image compression (`lib/imageCompression.ts`)
- [x] Supabase Storage upload/download helpers (`lib/storage.ts`)
- [x] `next/image` remote patterns for signed URLs
- [x] Photo gallery view in inspection and move-out detail
- [x] Camera access on mobile

### 11. API Routes
- [x] `POST /api/notifications` — Send email notifications
- [x] `GET /api/move-out-intentions/[id]/signed-urls` — Generate signed URLs for private photos

### 12. Developer Tools
- [x] Dev seed tenancy helper (`/dev/seed-tenancy`)
- [x] Environment check script (`scripts/check-env.sh`)
- [x] Setup script (`scripts/setup-env.sh`)

---

## 🔧 Technical Debt & Future Improvements

### Testing
- [ ] Unit tests for utility functions
- [ ] Integration tests for server actions
- [ ] E2E tests with Playwright
- [ ] Visual regression tests

### Performance
- [ ] Pagination for large lists (houses, tenancies, users)
- [ ] Database query caching
- [ ] CDN caching headers

### Security Enhancements
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging for admin actions
- [ ] Security headers (CSP, HSTS)

### Future Features
- [ ] Reports & analytics dashboard (occupancy trends, inspection rates)
- [ ] CSV/PDF export
- [ ] Advanced search with filters
- [ ] Dark mode
- [ ] Push notifications
- [ ] Bulk operations (archive multiple houses, assign multiple coordinators)

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js App Router | Server Components for performance; Server Actions for mutations |
| Supabase | PostgreSQL + Auth + Storage in one platform; RLS for security |
| Tailwind CSS v4 | Utility-first CSS; rapid iteration; small bundle |
| `roles TEXT[]` over enum | Supports users with multiple roles (e.g. admin + coordinator) |
| Client-side image compression | Reduces upload time and storage; better mobile experience |
| Room-based inspections | Dynamic checklist generated from actual house rooms |
| Slot system (A/B) | Rooms with capacity 2 can house 2 tenants independently |
