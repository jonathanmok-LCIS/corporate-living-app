# Corporate Living App — Technical Presentation
### For IT Consultants & Technical Advisors

---

## 1. What Problem Does This Solve?

Our church manages multiple shared-living houses. Today, the entire move-in/move-out workflow — room assignments, inspections, tenant records — is run on **spreadsheets and Google Forms**.

This creates:
- **No access control** — anyone with the link can see/edit everything
- **No audit trail** — hard to tell who changed what and when
- **Data scattered** across Sheets, Forms, email threads, and WhatsApp
- **Manual coordination** — admins constantly chasing people for signatures, photos, updates
- **No data integrity** — duplicates, missing fields, broken references

This app replaces that with a **purpose-built, secure, role-based web application** with a real database behind it.

---

## 2. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                       Client                           │
│           Browser / Mobile (PWA-ready)                 │
└────────────────────┬───────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼───────────────────────────────────┐
│               Next.js Application (Vercel)             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React Server Components (SSR — no data on wire) │  │
│  │  Server Actions (form mutations)                 │  │
│  │  Middleware (route protection & session check)    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬───────────────────────────────────┘
                     │ REST + JWT
┌────────────────────▼───────────────────────────────────┐
│                  Supabase (Backend-as-a-Service)       │
│                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ PostgreSQL  │  │ Supabase    │  │ Supabase      │  │
│  │ Database    │  │ Auth        │  │ Storage       │  │
│  │ + RLS       │  │ (JWT/bcrypt)│  │ (photos/sigs) │  │
│  └─────────────┘  └─────────────┘  └───────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer           | Technology                    | Why                                                       |
|-----------------|-------------------------------|-----------------------------------------------------------|
| **Frontend**    | Next.js 15+, React 19, TypeScript | Modern SSR framework; type safety; no separate API server |
| **Styling**     | Tailwind CSS v4              | Utility-first; fast to build; responsive out of the box    |
| **Database**    | PostgreSQL 15 (via Supabase) | Mature RDBMS; ACID-compliant; Row Level Security built-in  |
| **Auth**        | Supabase Auth                | bcrypt password hashing; JWT sessions; HTTP-only cookies   |
| **File Storage**| Supabase Storage             | S3-compatible; CDN-backed; policy-controlled               |
| **Hosting**     | Vercel                       | Zero-config Next.js deploys; auto-scaling; preview URLs    |

### Key Design Decisions

- **No custom backend / API server** — Server Components and Server Actions talk directly to Supabase. Less moving parts, less to maintain.
- **No client-side data fetching** — Data is fetched on the server and sent as rendered HTML. Faster, more secure, no loading spinners.
- **Supabase over Firebase** — PostgreSQL gives us relational integrity and Row Level Security at the database level, not application level.
- **Single codebase, three portals** — Admin, Coordinator, and Tenant views are all part of one Next.js app with route-based access control.

---

## 3. Database Design

### 10 Core Tables

```
profiles ──┐
           ├── houses ── rooms ── tenancies ──┬── move_out_intentions
           │                                  ├── inspections ── inspection_checklist_items
           │                                  │                  inspection_photos
           │                                  └── move_in_acknowledgements
           └── house_coordinators
                                              email_notifications
```

| Table                          | Purpose                                           |
|--------------------------------|---------------------------------------------------|
| `profiles`                     | User data; extends Supabase `auth.users`          |
| `houses`                       | Properties managed by the church                  |
| `rooms`                        | Individual rooms; capacity 1 or 2; linked to house|
| `house_coordinators`           | Many-to-many: which coordinators manage which house|
| `tenancies`                    | Tenant → Room assignment with status lifecycle    |
| `move_out_intentions`          | Tenant-submitted move-out requests                |
| `inspections`                  | Move-in/out inspection records (lockable)         |
| `inspection_checklist_items`   | Yes/No checklist per inspection                   |
| `inspection_photos`            | Photos attached to inspection items               |
| `move_in_acknowledgements`     | Digital signature + timestamp + IP logging        |

### Data Integrity

- **Foreign keys** with `ON DELETE CASCADE` / `RESTRICT` as appropriate
- **Unique constraints** (e.g., one room label per house, one coordinator assignment per house)
- **Check constraints** (e.g., room capacity must be 1 or 2)
- **Enums** for type safety: `user_role`, `tenancy_status`, `inspection_status`, `room_slot`
- **Automatic timestamps** via triggers (`created_at`, `updated_at`)
- **Immutability**: Finalised inspections cannot be edited (enforced at DB and RLS level)

---

## 4. Security — Defence in Depth

This is the section most relevant for IT evaluation. The app implements **five layers of security**:

### Layer 1: Network (HTTPS/TLS)
- All traffic encrypted in transit
- Enforced by both Vercel and Supabase

### Layer 2: Application (Next.js)
- **CSRF protection** — built into Server Actions
- **XSS prevention** — React auto-escapes all rendered content
- **No sensitive data in client bundles** — Server Components render on the server
- **Environment variables** — secrets never exposed to the browser

### Layer 3: Authentication (Supabase Auth)
- Email/password with **bcrypt** hashing
- **JWT tokens** (signed, short-lived)
- **HTTP-only cookies** (not accessible by JavaScript)
- Session management with automatic refresh

### Layer 4: Route-Level Authorisation (Next.js Middleware)
- Middleware intercepts every request
- Checks session validity before allowing access
- Role-based route protection:
  - `/admin/*` — only ADMIN role
  - `/coordinator/*` — only COORDINATOR role  
  - `/tenant/*` — only TENANT role

### Layer 5: Row Level Security (PostgreSQL RLS) ⭐
This is the **most important layer**. Even if someone bypasses the application, the database itself enforces who can see/edit what.

```
┌──────────────────────┬───────┬─────────────┬────────┐
│     Resource         │ ADMIN │ COORDINATOR │ TENANT │
├──────────────────────┼───────┼─────────────┼────────┤
│ Houses               │ CRUD  │ CRUD        │ Read   │
│ Rooms                │ CRUD  │ CRUD        │ Read   │
│ Tenancies            │ CRUD  │ CRUD        │ Own    │
│ Move-Out Intentions  │ All   │ Review      │ Submit │
│ Inspections          │ All   │ Manage      │ View   │
│ Photos               │ All   │ Manage      │ View   │
│ Move-In Sign-off     │ All   │ View        │ Sign   │
│ Users                │ CRUD  │ View        │ Own    │
└──────────────────────┴───────┴─────────────┴────────┘
```

- RLS is **enabled on every table** (30+ policies)
- Helper functions: `get_user_role()`, `is_admin()`, `is_coordinator()`, `is_tenant()`
- Tenants **cannot see other tenants' data** — enforced at database level
- Finalised inspections are **immutable** — enforced at database level
- Storage buckets (photos, signatures) also have RLS policies

### Compared to Spreadsheets & Google Forms
| Concern                    | Spreadsheet / Google Form       | This App                                    |
|----------------------------|---------------------------------|---------------------------------------------|
| Who can see data?          | Anyone with the link            | Role-based; enforced at DB level            |
| Who can edit data?         | Anyone with edit access          | Only authorised roles; immutable after sign-off |
| Password storage           | N/A                             | bcrypt-hashed; never stored in plaintext    |
| Audit trail                | Version history (limited)       | Timestamps, user IDs, IP logging on sign-off|
| Data integrity             | Nothing prevents invalid data   | Foreign keys, constraints, enums            |
| Backup & recovery          | Google's backup                | Supabase automated daily backups + PITR     |

---

## 5. Hosting & Cost

### Infrastructure

| Service           | Free Tier                          | Paid (if needed)            |
|-------------------|------------------------------------|-----------------------------|
| **Vercel**        | 100GB bandwidth, 100 deploys/day   | $20/mo (Pro)                |
| **Supabase**      | 500MB DB, 1GB storage, 50K auth users | $25/mo (Pro)           |

For a church managing ~10–50 houses with ~100–200 tenants, the **free tier is sufficient for a long time**.

### Deployment

- Code pushed to GitHub → Vercel **auto-deploys** within ~30 seconds
- Preview URLs generated for every pull request
- Database migrations run via Supabase SQL Editor or CLI
- No servers to manage, no OS patching, no Docker required (though Docker option exists)

### Maintenance Burden

- **Low**: Managed hosting (Vercel + Supabase) handles infrastructure
- Dependencies updated via `npm update`
- Supabase handles database backups automatically
- No cron jobs, no background workers for the MVP

---

## 6. Scalability

```
Current capacity (free tier):
  - Concurrent users:  100–500
  - Database records:   100K+
  - File storage:       1 GB (expandable)
  - API requests:       500K/month

With paid tier:
  - Concurrent users:  10K+
  - Database records:   Millions
  - Storage:            Unlimited
  - Requests:           Unlimited
```

For the foreseeable church use case, the free tier is more than adequate.

---

## 7. What's Built vs What's Remaining

| Area                           | Status     |
|--------------------------------|------------|
| Database schema & migrations   | ✅ Complete |
| Row Level Security (30+ rules) | ✅ Complete |
| Authentication system          | ✅ Complete |
| Role-based dashboards          | ✅ Complete |
| Houses management              | 🔶 ~60%    |
| Rooms management               | 🔶 Partial |
| Tenancies management           | 🔶 Partial |
| Move-out intentions            | ✅ Complete |
| Inspections (checklist+photos) | ✅ Complete |
| Move-in digital signature      | ✅ Complete |
| Email notifications            | 📋 Planned |
| Reporting / analytics          | 📋 Planned |
| Unit / E2E testing             | 📋 Planned |

The **foundation** (database, security, auth, architecture) is solid and production-grade. The remaining work is mostly UI pages that follow established patterns.

---

## 8. Questions IT Consultants Typically Ask

**Q: Where is data stored?**  
A: In a PostgreSQL database hosted on Supabase's infrastructure (AWS). Data resides in the region selected when the project was created. Files (photos, signatures) are in S3-compatible object storage.

**Q: Who owns the data?**  
A: The church. Supabase allows full data export at any time. There is no vendor lock-in on the data layer — it's standard PostgreSQL.

**Q: Can we self-host?**  
A: Yes. Supabase is open-source and can be self-hosted. The Next.js app can run in Docker. There is a Dockerfile in the deployment guide.

**Q: What if Supabase goes down?**  
A: Supabase has 99.9% uptime SLA on paid plans. Automated daily backups with point-in-time recovery. For extra safety, periodic `pg_dump` exports can be scheduled.

**Q: Is there vendor lock-in?**  
A: Minimal. The database is standard PostgreSQL (portable anywhere). The frontend is standard Next.js (runs on any Node.js host). Only Supabase Auth would need replacing if migrating, and it uses standard JWT/bcrypt.

**Q: How are photos handled?**  
A: Uploaded to Supabase Storage (S3-compatible). Images are compressed client-side before upload. Storage has its own RLS policies. Photos are linked to inspection items via database references.

**Q: Can we add SSO / OAuth later?**  
A: Yes. Supabase Auth supports Google, Microsoft, SAML, and other OAuth providers. It's a configuration change, not a code rewrite.

---

## Summary

This is a **modern, secure, low-maintenance web application** built on industry-standard open-source technologies. The architecture prioritises security (5-layer defence-in-depth), simplicity (no custom backend), and low operational cost (managed hosting with generous free tiers). The church retains full ownership of all data with no vendor lock-in.
