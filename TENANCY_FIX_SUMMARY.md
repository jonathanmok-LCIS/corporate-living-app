# Tenancy Lookup Fix & Dev Tools Summary

## Problem Fixed

### "Tenancy not found" Alert Issue

**Symptom:** Alert showing "Tenancy not found" when navigating to `/tenant/move-out` on localhost.

**Root Cause:**
The `getTenantActiveTenancy()` server action returns `{ data: null, error: null }` when no active tenancy exists (not an error, just no data). The page was treating this as an error condition and showing an alert.

**What Changed in the Query:**
No query changes were needed. The query in `getTenantActiveTenancy()` was correct:
```typescript
const { data, error } = await supabaseAdmin
  .from('tenancies')
  .select('...')
  .eq('tenant_user_id', user.id)
  .in('status', ['OCCUPIED', 'MOVE_OUT_INTENDED', ...])
  .maybeSingle();

// Returns { data: null, error: null } when no matching tenancy
```

**What Changed in the UI:**
The page (`app/tenant/move-out/page.tsx`) now properly handles different states:

1. **Loading state** - Shows spinner while fetching tenancy
2. **Error state** - Shows error message with retry button
3. **No tenancy state** - Shows helpful message with actions:
   - Production: "Contact your house coordinator"
   - Development: Link to create test tenancy
4. **Active tenancy state** - Shows form with current tenancy info

---

## Features Added

### A) Dev-Only Tenancy Seeding

**Purpose:** Allow developers to create test tenancies for testing.

**Route:** `/dev/seed-tenancy`

**Guards:**
- Only works when `NODE_ENV !== 'production'`
- Requires `ENABLE_DEV_SEEDING=true` in `.env.local`

**How it works:**
1. Shows list of all houses and rooms
2. User selects a room
3. Creates a tenancy with:
   - `tenant_user_id`: Current user's ID
   - `room_id`: Selected room
   - `status`: 'OCCUPIED'
   - `start_date`: Today
   - `end_date`: null (active)
4. Uses admin client (service role) to bypass RLS
5. Redirects to `/tenant/move-out` on success

**Files:**
- `app/dev/seed-tenancy/page.tsx` - UI
- `app/dev/seed-tenancy/actions.ts` - Logic

---

### B) Signed URL API for Coordinators/Admins

**Purpose:** Allow coordinators and admins to view photos from move-out intentions.

**Endpoint:** `GET /api/move-out-intentions/:id/signed-urls`

**Authorization:**
- User must be authenticated
- User role must be COORDINATOR or ADMIN
- Coordinators can only access photos from houses they're assigned to
- Admins can access all photos

**Response:**
```json
{
  "keyAreaPhotos": [
    "https://...signed-url-1?token=...",
    "https://...signed-url-2?token=..."
  ],
  "damagePhotos": [
    "https://...signed-url-3?token=..."
  ]
}
```

**URL Expiration:** 10 minutes (600 seconds)

**Files:**
- `app/api/move-out-intentions/[id]/signed-urls/route.ts` - API route
- `lib/supabase-server.ts` - Added `getAdminClient()` export
- `lib/storage.ts` - Already had `generateSignedUrls()` helper

---

## Environment Variables

### New Variable

Add to `.env.local` (development only):
```bash
ENABLE_DEV_SEEDING=true
```

### Documentation

Updated `.env.example` with:
```bash
# --------------------------------------------
# DEVELOPMENT TOOLS (Development Only)
# --------------------------------------------

# Enable dev seeding tools (allows creating test tenancies)
# Set to 'true' to enable the /dev/seed-tenancy page
# IMPORTANT: Should be 'false' or omitted in production
ENABLE_DEV_SEEDING=false
```

---

## Testing Instructions

### Test 1: No Tenancy Scenario

1. Login as a user without an active tenancy
2. Navigate to `/tenant/move-out`
3. **Expected:** See "No Active Tenancy Found" message (yellow alert)
4. **In dev mode:** See "Create Test Tenancy" button
5. Click button to go to `/dev/seed-tenancy`
6. Select a room and click "Create Test Tenancy"
7. **Expected:** Redirected to `/tenant/move-out` with form visible

### Test 2: Active Tenancy Scenario

1. Login as a user with an active tenancy (created via dev tool or admin)
2. Navigate to `/tenant/move-out`
3. **Expected:** See loading spinner briefly, then form
4. **Expected:** Tenancy info displayed at top (House, Room, Status)
5. Fill out form and submit
6. **Expected:** Success message

### Test 3: Signed URLs API

```bash
# Get authentication token (in browser console after login)
const token = await (await fetch('/api/auth/session')).json();

# Call signed URLs API
curl -H "Authorization: Bearer $token" \
  http://localhost:3000/api/move-out-intentions/{intention-id}/signed-urls

# Expected response:
{
  "keyAreaPhotos": ["https://...?token=..."],
  "damagePhotos": ["https://...?token=..."]
}
```

**Test as Coordinator:**
- Should only work for intentions in their assigned houses
- Should get 403 for other houses

**Test as Admin:**
- Should work for all intentions

**Test as Tenant:**
- Should get 403 (Access denied)

### Test 4: Dev Seeding Guards

**Test production guard:**
```bash
# Set NODE_ENV=production
NODE_ENV=production npm run build
npm run start

# Navigate to /dev/seed-tenancy
# Expected: "Not Available in Production" message
```

**Test env flag guard:**
```bash
# In .env.local, set ENABLE_DEV_SEEDING=false (or omit it)
# Navigate to /dev/seed-tenancy
# Try to create tenancy
# Expected: Error "Dev seeding is not enabled"
```

---

## Files Changed

**Modified (3):**
1. `app/tenant/move-out/page.tsx` - Better UI states
2. `lib/supabase-server.ts` - Added `getAdminClient()` export
3. `.env.example` - Documented `ENABLE_DEV_SEEDING`

**Created (3):**
4. `app/dev/seed-tenancy/page.tsx` - Dev seeding UI
5. `app/dev/seed-tenancy/actions.ts` - Seeding logic
6. `app/api/move-out-intentions/[id]/signed-urls/route.ts` - Signed URL API

---

## Security Notes

### Dev Seeding Security
- ✅ Only works in development (`NODE_ENV !== 'production'`)
- ✅ Requires explicit env flag (`ENABLE_DEV_SEEDING=true`)
- ✅ Uses service role (server-side only, not exposed to client)
- ✅ Clear UI warnings that it's a dev tool
- ✅ Checks for existing active tenancies (no duplicates)

### Signed URL API Security
- ✅ Requires authentication
- ✅ Role-based access control (COORDINATOR/ADMIN only)
- ✅ Coordinators limited to assigned houses
- ✅ URLs expire after 10 minutes
- ✅ Service role used only server-side
- ✅ Private bucket (photos not publicly accessible)

---

## Build Status

✅ Build: SUCCESS (4.5s)
✅ TypeScript: PASS
✅ All tests: PASS

---

## Next Steps for Using in Production

1. **Set up .env.local:**
   ```bash
   cp .env.example .env.local
   # Fill in Supabase credentials
   # Set ENABLE_DEV_SEEDING=true (dev only)
   ```

2. **Test dev seeding:**
   ```bash
   npm run dev
   # Login as user
   # Visit /tenant/move-out
   # If no tenancy, click "Create Test Tenancy"
   # Test move-out flow
   ```

3. **Test signed URLs:**
   ```bash
   # Submit a move-out intention with photos
   # Login as coordinator/admin
   # Call API: GET /api/move-out-intentions/:id/signed-urls
   # Verify signed URLs work and expire after 10 minutes
   ```

4. **Before production deployment:**
   - Remove or set `ENABLE_DEV_SEEDING=false`
   - Verify `/dev/seed-tenancy` returns 403 in production
   - Test signed URL API with real coordinators/admins
   - Verify RLS policies work correctly

---

## Summary

**Problem:** "Tenancy not found" alert on `/tenant/move-out`

**Root Cause:** UI treating "no active tenancy" as an error

**Solution:** Better UI state handling with helpful messages

**Bonus Features Added:**
- Dev-only tenancy seeding tool
- Signed URL API for coordinators/admins to view photos
- Proper authorization and security
- Complete documentation

**Status:** ✅ Ready for production (after testing)
