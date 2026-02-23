# RLS Policy Fix for move_out_intentions

## Problem

**Error:** "new row violates row-level security policy for table move_out_intentions"

**When:** Tenants try to submit move-out intentions

## Root Cause

- Multiple migrations created conflicting policies
- Migration 002 created initial policy
- Migration 009 overwrote it with similar policy
- Policies weren't properly scoped to `authenticated` role
- Missing clear SELECT policy for tenants

## Solution

**Migration:** `012_fix_move_out_intentions_rls.sql`

### Policies Created

1. **INSERT Policy** - Tenants can create move-out intentions for their own tenancies
   - Role: `authenticated`
   - Check: `tenancy.tenant_user_id = auth.uid()`
   - Allows active statuses (OCCUPIED, MOVE_OUT_INTENDED, etc.)

2. **SELECT Policy (Tenants)** - View own move-out intentions
   - Role: `authenticated`
   - Check: `tenancy.tenant_user_id = auth.uid()`

3. **SELECT Policy (Coordinators)** - View for assigned houses
   - Role: `authenticated`
   - Check: User is coordinator for the house

4. **UPDATE Policy (Coordinators)** - Update sign-off fields
   - Role: `authenticated`
   - Check: User is coordinator for the house

5. **Admin Policy** - Full access
   - Role: `authenticated`
   - Check: User role is ADMIN

## Server Action

**File:** `app/tenant/move-out/actions.ts`

**Already correct:** Uses user-context client (not service role)
```typescript
const supabase = await createClient();  // ✅ Correct
```

**Service role only used for:**
- Storage uploads (correct separation of concerns)

## Apply Migration

```bash
supabase db push
```

Or run SQL directly in Supabase Dashboard.

## Verification

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'move_out_intentions'
ORDER BY policyname;
```

Expected: 5 policies (INSERT, SELECT x2, UPDATE, ALL)

## Testing

1. Login as tenant with active tenancy
2. Submit move-out intention
3. Should succeed without RLS error

## Status

✅ Migration created and ready to apply
✅ Server action verified (uses correct client)
✅ Idempotent (safe to run multiple times)

