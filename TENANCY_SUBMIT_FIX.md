# Tenancy Submit Fix - "Tenancy not found" Alert

## Problem

When submitting the move-out form on `/tenant/move-out`:
- Page displayed current tenancy (Status: OCCUPIED)
- Clicking Submit triggered alert: "Tenancy not found"
- Very confusing for users

## Root Cause

The `submitMoveOutIntention` server action in `actions.ts`:
1. Received `tenancyId` from client ✓
2. Re-queried tenancy using regular client with RLS ❌
3. RLS policy blocked the SELECT query ❌
4. Returned "Tenancy not found" error ❌

**Code:**
```typescript
// Line 85 - Used regular client subject to RLS
const { data: tenancyCheck } = await supabase
  .from('tenancies')
  .select('id, tenant_user_id, status')
  .eq('id', data.tenancyId)
  .maybeSingle();
```

## Solution

### Use Admin Client for Validation

Changed to use admin client which bypasses RLS:

```typescript
// Use admin client to bypass RLS
const supabaseAdmin = getAdminClient();
const { data: tenancyCheck } = await supabaseAdmin
  .from('tenancies')
  .select('id, tenant_user_id, status')
  .eq('id', data.tenancyId)
  .maybeSingle();
```

### Security Maintained

Ownership is still validated explicitly:

```typescript
if (tenancyCheck.tenant_user_id !== user.id) {
  return { success: false, error: 'You do not own this tenancy' };
}
```

## Files Changed

**Modified:**
1. `app/tenant/move-out/actions.ts`
   - Use admin client for tenancy validation
   - Gate console logs behind `NODE_ENV !== 'production'`

2. `app/tenant/move-out/page.tsx`
   - Add `submitError` state
   - Remove alert(), show inline error
   - Disable button when no tenancy

## Before vs After

**Before (Broken):**
```
Submit → Query with RLS → RLS blocks → "Tenancy not found" alert
```

**After (Fixed):**
```
Submit → Query with admin → Ownership check → Success
```

## Testing

✅ Active tenancy (OCCUPIED): Submit succeeds  
✅ No tenancy: Button disabled, no alert  
✅ Submit error: Inline error shown, no alert

## Security Notes

**Safe to use admin client because:**
- Only used for SELECT validation
- Ownership explicitly checked
- INSERT still uses RLS
- No security regression

**Pattern:**
1. Admin client verifies tenancy exists
2. Explicitly validate ownership
3. Regular client for INSERT (RLS enforced)

## Build Status

✅ Build succeeds  
✅ TypeScript passes  
✅ Production ready
