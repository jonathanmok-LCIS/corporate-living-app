# Comprehensive Bug Check & Fixes Report

**Date:** 2026-02-21  
**Status:** Complete Analysis + Recommended Fixes

---

## Executive Summary

Performed thorough code review across the entire Corporate Living application. Found **8 issues** requiring attention, ranging from minor improvements to critical fixes.

**Priority Breakdown:**
- 🔴 **Critical (2):** Security/data integrity issues
- 🟡 **Medium (4):** Functional bugs affecting user experience
- 🟢 **Low (2):** Code quality improvements

---

## 🔴 CRITICAL ISSUES

### 1. Inconsistent Supabase Client Usage in Admin Pages

**Location:** `app/admin/tenancies/page.tsx`, `app/admin/houses/[id]/rooms/page.tsx`, `app/admin/houses/[id]/coordinators/page.tsx`, `app/admin/houses/page.tsx`

**Problem:**
Admin pages use browser client (`createClient()` from `@/lib/supabase-browser`) which respects RLS policies. This causes:
- Data not showing due to RLS restrictions
- Inconsistent behavior based on user authentication state
- Potential security issues if RLS policies have gaps

**Impact:** High - Admin functionality may not work correctly

**Current Code Example:**
```typescript
// app/admin/houses/page.tsx
const supabase = createClient(); // Browser client with RLS
const { data } = await supabase.from('houses').select('*');
```

**Recommended Fix:**
Create server actions using admin client (similar to `fetchRoomsWithTenancies` we just created).

**Files to Fix:**
1. `app/admin/tenancies/page.tsx` - Already has server action, but page still uses browser client for fetch
2. `app/admin/houses/page.tsx` - Create `actions.ts` with `fetchHouses()`
3. `app/admin/houses/[id]/coordinators/page.tsx` - Create server action
4. All admin mutation operations (create, update, delete)

---

### 2. Missing RLS Policies for Some Tables

**Problem:**
Some tables may not have complete RLS policies, or policies may not work with both browser and server clients.

**Tables to Verify:**
- `move_out_intentions` - Check coordinator update policy
- `tenancies` - Verify all CRUD operations
- `rooms` - Check admin access
- `houses` - Verify policies
- `house_coordinators` - Check junction table policies

**Recommended Action:**
Audit all RLS policies and ensure they follow consistent patterns from `MULTI_APP_ARCHITECTURE.md`.

**SQL to Check Policies:**
```sql
-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check which tables have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 3. Move-In Actions Using Wrong Client

**Location:** `app/tenant/move-in/actions.ts`

**Problem:**
Uses `createClient()` from server client which requires awaiting, but for tenant actions might have RLS issues.

**Current Code:**
```typescript
const supabase = await createClient();
```

**Impact:** May cause "No tenancy found" errors for tenants

**Recommended Fix:**
Either:
- A) Ensure RLS policies allow tenant to read own tenancy
- B) Use admin client for reliable fetching (if security model allows)

---

### 4. Photo Upload Error Handling

**Location:** `app/tenant/move-out/page.tsx` (lines 27-46)

**Problem:**
Photo upload failures are logged but don't stop submission. Failed uploads silently excluded from arrays.

**Current Code:**
```typescript
const url = await uploadPhoto(photo, 'move-out-photos', tenancy.id);
if (url) keyAreaPhotoUrls.push(url);
// If upload fails, photo is just skipped - no user notification
```

**Impact:** Users might think photos uploaded when they didn't

**Recommended Fix:**
```typescript
try {
  const url = await uploadPhoto(photo, 'move-out-photos', tenancy.id);
  if (!url) throw new Error('Upload failed');
  keyAreaPhotoUrls.push(url);
} catch (error) {
  alert(`Photo upload failed: ${photo.name}`);
  setLoading(false);
  return; // Stop submission
}
```

---

### 5. Missing Indexes for Performance

**Problem:**
Several queries may be slow without proper indexes.

**Missing Indexes:**
```sql
-- Tenancies by status (frequently filtered)
CREATE INDEX IF NOT EXISTS idx_tenancies_status 
ON tenancies(status) WHERE status != 'CANCELLED';

-- Tenancies by tenant (user's own data)
CREATE INDEX IF NOT EXISTS idx_tenancies_tenant_user 
ON tenancies(tenant_user_id) WHERE deleted_at IS NULL;

-- Move-out intentions by status (coordinator reviews)
CREATE INDEX IF NOT EXISTS idx_move_out_status 
ON move_out_intentions(sign_off_status) WHERE sign_off_status = 'PENDING';

-- Rooms by house (always filtered by house)
CREATE INDEX IF NOT EXISTS idx_rooms_house 
ON rooms(house_id);
```

**Recommended:** Create migration `008_add_performance_indexes.sql`

---

### 6. Coordinator Actions Not Using Proper Client

**Location:** `app/coordinator/move-out-reviews/page.tsx`, `app/coordinator/inspections/page.tsx`

**Problem:**
Coordinators use browser client which depends on RLS policies. May have issues similar to admin pages.

**Recommended Fix:**
Create server actions for coordinator pages to ensure reliable data access within their scope.

---

## 🟢 LOW PRIORITY ISSUES

### 7. Inconsistent Date Formatting

**Problem:**
Dates formatted differently across the application.

**Examples:**
- Some use `new Date().toLocaleDateString()`
- Some use `toISOString()`
- Some show raw database format

**Recommended Fix:**
Create shared date formatting utilities in a `lib/formatters.ts`:

```typescript
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

---

### 8. Missing TypeScript Types

**Problem:**
Some components use `any` type or lack proper typing.

**Examples:**
```typescript
// app/admin/houses/[id]/rooms/page.tsx line 292
rooms.map((room: any) => {  // Should have proper Room type
```

**Recommended Fix:**
Define proper types in `lib/types.ts`:

```typescript
export interface Room {
  id: string;
  house_id: string;
  label: string;
  capacity: 1 | 2;
  active: boolean;
  created_at: string;
  tenancies?: Tenancy[];
}

export interface Tenancy {
  id: string;
  room_id: string;
  tenant_user_id: string;
  start_date: string;
  end_date?: string;
  rental_price: number;
  status: 'PENDING' | 'OCCUPIED' | 'MOVE_OUT_INTENDED' | 'COMPLETED' | 'CANCELLED';
  slot?: 'A' | 'B';
  tenant?: Profile;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
}
```

---

## Summary of Fixes Needed

### Immediate (Critical)
1. ✅ **Rooms table** - FIXED (server action created)
2. ⚠️ **Admin tenancies page** - Use `fetchTenanciesAdmin` server action everywhere
3. ⚠️ **Admin houses pages** - Create server actions
4. ⚠️ **Audit RLS policies** - Ensure completeness

### Short-term (Medium)
5. Fix move-in actions client usage
6. Improve photo upload error handling
7. Add performance indexes
8. Create coordinator server actions

### Long-term (Low)
9. Standardize date formatting
10. Improve TypeScript types
11. Add comprehensive error logging
12. Create audit log viewer for admins

---

## Recommended Migrations

### Migration 008: Performance Indexes
```sql
-- Add missing performance indexes
CREATE INDEX IF NOT EXISTS idx_tenancies_status 
ON tenancies(status) WHERE status != 'CANCELLED';

CREATE INDEX IF NOT EXISTS idx_tenancies_tenant_user 
ON tenancies(tenant_user_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_move_out_status 
ON move_out_intentions(sign_off_status) WHERE sign_off_status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_rooms_house 
ON rooms(house_id);

CREATE INDEX IF NOT EXISTS idx_house_coordinators_user 
ON house_coordinators(user_id);

CREATE INDEX IF NOT EXISTS idx_house_coordinators_house 
ON house_coordinators(house_id);
```

---

## Testing Checklist

### Critical Fixes Testing
- [ ] Test admin tenancies page with multiple roles
- [ ] Test admin houses page shows all houses
- [ ] Test coordinator can see assigned houses only
- [ ] Test tenant can see own tenancy
- [ ] Verify RLS policies with SQL queries

### Medium Priority Testing
- [ ] Test move-in flow end-to-end
- [ ] Test photo upload with failures
- [ ] Measure query performance before/after indexes
- [ ] Test coordinator reviews work correctly

### Low Priority Testing
- [ ] Check date formatting consistency
- [ ] Run TypeScript compiler in strict mode
- [ ] Test error scenarios and logging

---

## Conclusion

**Overall Code Quality:** Good foundation with room for improvement

**Security:** Generally solid, but needs RLS policy audit

**Performance:** Acceptable, will benefit from additional indexes

**Maintainability:** Good structure, could use more TypeScript types

**Next Steps:**
1. Fix critical issues (admin client usage)
2. Audit and complete RLS policies
3. Add performance indexes
4. Gradual improvement of medium/low priority items

**Estimated Effort:**
- Critical fixes: 2-3 hours
- Medium priority: 4-6 hours
- Low priority: 2-4 hours
- **Total:** 8-13 hours of development

---

**Status:** Analysis Complete ✅  
**Action Required:** Prioritize and implement critical fixes
