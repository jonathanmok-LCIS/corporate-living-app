# Multi-App Supabase Platform Architecture

## Executive Summary

This document outlines a scalable, maintainable architecture for managing multiple internal church applications (Corporate Living, Church Meeting Statistics, Event Registration) using a unified Supabase backend.

**Key Decisions:**
- ✅ **Single Supabase Project** with table prefixes and logical schemas
- ✅ **Shared authentication** with role-based access control
- ✅ **Reusable RLS templates** for consistent security
- ✅ **Monorepo structure** with shared packages
- ✅ **Audit logging** and soft deletes built-in

---

## 1. Project Strategy: One Supabase Project

### Recommendation: Single Supabase Project ✅

**Why One Project:**
- **Cost Efficiency:** Free tier supports 2 projects; paid plans charge per project
- **Shared Authentication:** Single user can access multiple apps with one login
- **Cross-App Queries:** Easy to reference users/roles across apps
- **Simplified Administration:** One place to manage users, backups, migrations
- **Resource Sharing:** Database connections, storage, edge functions pool

**Implementation:**
```
Database Organization:
├── Shared Tables (no prefix)
│   ├── profiles (user accounts)
│   ├── app_roles (user-app permissions)
│   └── audit_log (cross-app audit trail)
│
├── Corporate Living (cl_*)
│   ├── cl_houses
│   ├── cl_rooms
│   ├── cl_tenancies
│   └── cl_move_out_intentions
│
├── Church Statistics (cs_*)
│   ├── cs_meetings
│   ├── cs_attendance
│   └── cs_statistics
│
└── Event Registration (ev_*)
    ├── ev_events
    ├── ev_registrations
    └── ev_check_ins
```

**Table Prefix Convention:**
- `cl_*` = Corporate Living
- `cs_*` = Church Statistics  
- `ev_*` = Event Registration
- No prefix = Shared infrastructure

**Alternative (Multi-Project):** Only consider if:
- Apps have completely different user bases
- Regulatory/compliance requires data separation
- Very high scale per app (>1M users)
- Different geographic regions

---

## 2. Shared Auth + Roles Model

### Unified User Management

**profiles Table (Shared):**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- Soft delete
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_roles
      WHERE app_roles.user_id = auth.uid()
        AND app_roles.role = 'ADMIN'
    )
  );
```

### App-Specific Roles

**app_roles Table (Shared):**
```sql
CREATE TYPE app_role_enum AS ENUM (
  'ADMIN',              -- Full access across all apps
  'COORDINATOR',        -- Coordinator role (app-specific context)
  'TENANT',            -- Corporate Living tenant
  'MEETING_COORDINATOR', -- Church stats coordinator
  'EVENT_ORGANIZER',   -- Event admin
  'MEMBER'             -- Basic church member
);

CREATE TYPE app_enum AS ENUM (
  'CORPORATE_LIVING',
  'CHURCH_STATS',
  'EVENT_REGISTRATION'
);

CREATE TABLE app_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app app_enum NOT NULL,
  role app_role_enum NOT NULL,
  context_id UUID,  -- Optional: for scoped roles (e.g., coordinator of specific house)
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, app, role, context_id)
);

CREATE INDEX idx_app_roles_user ON app_roles(user_id);
CREATE INDEX idx_app_roles_app_user ON app_roles(app, user_id);

-- Example: Check if user is admin in any app
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_roles
    WHERE user_id = check_user_id
      AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Check if user has role in specific app
CREATE OR REPLACE FUNCTION has_role(check_user_id UUID, check_app app_enum, check_role app_role_enum)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_roles
    WHERE user_id = check_user_id
      AND app = check_app
      AND role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Role Hierarchy Examples

**Corporate Living:**
- ADMIN: Full access to all houses, users, reports
- COORDINATOR: Access to assigned houses only
- TENANT: Access to own tenancy data

**Church Statistics:**
- ADMIN: View all statistics, manage coordinators
- MEETING_COORDINATOR: Enter data for assigned meeting
- MEMBER: View own attendance

**Event Registration:**
- ADMIN: Manage all events
- EVENT_ORGANIZER: Manage assigned events
- MEMBER: Register for events

---

## 3. RLS Template Patterns

### Template 1: Admin Full Access

```sql
-- Apply to any table: Admins bypass all restrictions
CREATE POLICY "{table}_admin_all" ON {table}
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_roles
      WHERE app_roles.user_id = auth.uid()
        AND app_roles.role = 'ADMIN'
    )
  );
```

### Template 2: User Own Data

```sql
-- Users access only their own records
CREATE POLICY "{table}_own_data" ON {table}
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "{table}_own_insert" ON {table}
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "{table}_own_update" ON {table}
  FOR UPDATE USING (user_id = auth.uid());
```

### Template 3: Coordinator Scoped Access

```sql
-- Coordinators access data in their scope (e.g., assigned houses)
CREATE POLICY "cl_tenancies_coordinator_select" ON cl_tenancies
  FOR SELECT USING (
    -- User is admin OR
    EXISTS (
      SELECT 1 FROM app_roles
      WHERE app_roles.user_id = auth.uid()
        AND app_roles.role = 'ADMIN'
    )
    -- User is coordinator of this house
    OR EXISTS (
      SELECT 1 FROM cl_house_coordinators hc
      JOIN cl_rooms r ON hc.house_id = r.house_id
      WHERE r.id = cl_tenancies.room_id
        AND hc.user_id = auth.uid()
    )
    -- OR user is the tenant
    OR cl_tenancies.tenant_user_id = auth.uid()
  );
```

### Template 4: Public Read, Authenticated Write

```sql
-- Anyone can read, authenticated users can write (e.g., events)
CREATE POLICY "{table}_public_read" ON {table}
  FOR SELECT USING (true);

CREATE POLICY "{table}_auth_write" ON {table}
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

### Template 5: Soft Delete Aware

```sql
-- Only show non-deleted records
CREATE POLICY "{table}_not_deleted" ON {table}
  FOR SELECT USING (deleted_at IS NULL);

-- Admins can see deleted records
CREATE POLICY "{table}_admin_deleted" ON {table}
  FOR SELECT USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM app_roles
      WHERE app_roles.user_id = auth.uid()
        AND app_roles.role = 'ADMIN'
    )
  );
```

---

## 4. Folder Structure + Conventions

### Monorepo Structure

```
church-platform/
├── apps/
│   ├── corporate-living/          # Next.js app
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   ├── coordinator/
│   │   │   ├── tenant/
│   │   │   └── api/
│   │   ├── components/
│   │   ├── lib/
│   │   └── public/
│   │
│   ├── church-stats/              # Next.js app
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   │
│   └── event-registration/        # Next.js app
│       ├── app/
│       ├── components/
│       └── lib/
│
├── packages/
│   ├── shared-types/              # TypeScript types
│   │   ├── src/
│   │   │   ├── profiles.ts
│   │   │   ├── app-roles.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shared-utils/              # Common utilities
│   │   ├── src/
│   │   │   ├── date-helpers.ts
│   │   │   ├── validators.ts
│   │   │   └── formatters.ts
│   │   └── package.json
│   │
│   ├── supabase-client/           # Supabase setup
│   │   ├── src/
│   │   │   ├── browser.ts
│   │   │   ├── server.ts
│   │   │   └── admin.ts
│   │   └── package.json
│   │
│   ├── auth/                      # Auth utilities
│   │   ├── src/
│   │   │   ├── check-role.ts
│   │   │   ├── get-user.ts
│   │   │   └── middleware.ts
│   │   └── package.json
│   │
│   └── ui/                        # Shared UI components
│       ├── src/
│       │   ├── Button.tsx
│       │   ├── Card.tsx
│       │   └── Table.tsx
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   │   ├── shared/
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_rls_policies.sql
│   │   │   └── 003_app_roles.sql
│   │   ├── corporate-living/
│   │   │   ├── 101_cl_schema.sql
│   │   │   └── 102_cl_rls.sql
│   │   ├── church-stats/
│   │   │   └── 201_cs_schema.sql
│   │   └── events/
│   │       └── 301_ev_schema.sql
│   ├── functions/
│   └── storage/
│
├── package.json                   # Workspace root
├── turbo.json                     # Turborepo config
└── .env.example
```

### Server Actions Convention

Each app follows this pattern:

```typescript
// apps/corporate-living/app/admin/houses/actions.ts
'use server';

import { createAdminClient } from '@church-platform/supabase-client';
import { checkRole } from '@church-platform/auth';

export async function createHouse(data: CreateHouseInput) {
  // 1. Check authorization
  await checkRole('ADMIN');
  
  // 2. Validate input
  const validated = validateHouseInput(data);
  
  // 3. Perform operation
  const supabase = createAdminClient();
  const { data: house, error } = await supabase
    .from('cl_houses')
    .insert(validated)
    .select()
    .single();
  
  // 4. Audit log
  await logAudit({
    table: 'cl_houses',
    action: 'INSERT',
    record_id: house.id
  });
  
  return { data: house, error };
}
```

### Types Convention

```typescript
// packages/shared-types/src/profiles.ts
export interface Profile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// apps/corporate-living/lib/types.ts
import { Profile } from '@church-platform/shared-types';

export interface Tenant extends Profile {
  // Corporate living specific fields
}
```

---

## 5. Audit Logging + Soft Deletes

### Audit Log Table

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  app app_enum,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user ON audit_log(changed_by);
CREATE INDEX idx_audit_log_time ON audit_log(changed_at DESC);
```

### Audit Trigger Template

```sql
-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to any table
CREATE TRIGGER audit_cl_houses
  AFTER INSERT OR UPDATE OR DELETE ON cl_houses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

### Soft Delete Pattern

**Table Schema:**
```sql
-- Every table includes these audit columns
CREATE TABLE {table_name} (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- ... other columns ...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id)
);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON {table_name}
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Soft Delete Function:**
```sql
CREATE OR REPLACE FUNCTION soft_delete(table_name TEXT, record_id UUID)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = %L WHERE id = %L',
    table_name, auth.uid(), record_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage in application:
-- SELECT soft_delete('cl_houses', 'house-uuid');
```

**Application Layer Soft Delete:**
```typescript
// Shared utility
export async function softDelete(table: string, id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from(table)
    .update({ 
      deleted_at: new Date().toISOString(),
      deleted_by: (await supabase.auth.getUser()).data.user?.id
    })
    .eq('id', id);
  
  if (error) throw error;
}
```

---

## 6. Migration Strategy

### Versioning Convention

```
supabase/migrations/
├── shared/
│   ├── 000_initial.sql
│   ├── 001_profiles.sql
│   ├── 002_app_roles.sql
│   └── 003_audit_log.sql
│
├── corporate-living/
│   ├── 100_cl_initial.sql
│   ├── 101_cl_houses.sql
│   ├── 102_cl_rooms.sql
│   └── 103_cl_tenancies.sql
│
├── church-stats/
│   ├── 200_cs_initial.sql
│   └── 201_cs_meetings.sql
│
└── events/
    ├── 300_ev_initial.sql
    └── 301_ev_events.sql
```

**Numbering:**
- 000-099: Shared infrastructure
- 100-199: Corporate Living
- 200-299: Church Statistics
- 300-399: Event Registration

### Safe Migration Process

**1. Local Development:**
```bash
# Create new migration
supabase migration new add_cl_feature

# Edit migration file
# Test locally
supabase db reset

# Verify
supabase db diff
```

**2. Staging Environment:**
```bash
# Apply to staging
supabase db push --db-url $STAGING_URL

# Run tests
npm run test:staging

# Verify data integrity
```

**3. Production Deployment:**
```bash
# Backup first
supabase db dump > backup_$(date +%Y%m%d).sql

# Apply migrations
supabase db push --db-url $PRODUCTION_URL

# Verify
supabase db remote commit
```

### Rollback Strategy

**Automatic Rollback:**
```sql
-- Every migration includes rollback instructions
-- In: 104_add_feature.sql
BEGIN;

-- Forward migration
ALTER TABLE cl_houses ADD COLUMN new_field TEXT;

-- Store rollback command
INSERT INTO migration_rollbacks (version, rollback_sql)
VALUES ('104', 'ALTER TABLE cl_houses DROP COLUMN new_field;');

COMMIT;
```

**Manual Rollback:**
```bash
# Create rollback migration
supabase migration new rollback_104

# In rollback migration:
# ALTER TABLE cl_houses DROP COLUMN new_field;

# Apply
supabase db push
```

---

## 7. Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Set up monorepo with Turborepo
- [ ] Create shared packages structure
- [ ] Implement profiles + app_roles tables
- [ ] Set up audit_log infrastructure
- [ ] Create RLS template library
- [ ] Document coding conventions

### Phase 2: Corporate Living Migration (Week 2)
- [ ] Prefix existing tables with `cl_`
- [ ] Update RLS policies
- [ ] Migrate server actions to shared pattern
- [ ] Update UI to use shared components
- [ ] Test end-to-end flows

### Phase 3: Church Stats App (Week 3-4)
- [ ] Create `cs_*` tables
- [ ] Apply RLS templates
- [ ] Build UI using shared components
- [ ] Implement role-based access
- [ ] Integration testing

### Phase 4: Event Registration (Week 5-6)
- [ ] Create `ev_*` tables
- [ ] Build event management UI
- [ ] Public registration flow
- [ ] Check-in system
- [ ] Testing

### Phase 5: Cross-App Features (Week 7)
- [ ] Unified user management admin panel
- [ ] Cross-app reporting dashboard
- [ ] Shared notification system
- [ ] Mobile app foundation (optional)

---

## 8. Benefits Summary

**Technical Benefits:**
- ✅ Consistent security model across apps
- ✅ Code reuse (50%+ reduction in duplication)
- ✅ Centralized user management
- ✅ Simplified deployment pipeline
- ✅ Easier testing and quality assurance

**Operational Benefits:**
- ✅ Lower infrastructure costs (1 project vs 3)
- ✅ Single backup/restore process
- ✅ Unified monitoring and logging
- ✅ Simplified onboarding for users

**Scalability:**
- ✅ Easy to add new apps
- ✅ Shared infrastructure scales together
- ✅ Can split later if needed (migration path exists)

---

## 9. Risks + Mitigation

| Risk | Mitigation |
|------|------------|
| One database for all apps | Table prefixes prevent conflicts; RLS enforces separation |
| Migrations affect all apps | Separate migration folders; testing pipeline |
| Performance bottlenecks | Indexes, materialized views, read replicas if needed |
| Permission creep | Regular audits; role review process |
| Backup/restore complexity | Automated daily backups; per-app restore possible |

---

## 10. Next Steps

**Immediate Actions:**
1. Review this proposal with team
2. Set up dev environment with this structure
3. Create shared packages
4. Migrate Corporate Living app
5. Document patterns and templates

**Questions to Discuss:**
- Timeline for each phase?
- Resource allocation (developers)?
- Testing strategy across apps?
- User communication plan?
- Training needs for administrators?

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-21  
**Status:** Proposal - Ready for Review
