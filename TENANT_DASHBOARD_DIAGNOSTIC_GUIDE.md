# Tenant Dashboard Diagnostic Guide

## Current Status: AWAITING DIAGNOSTIC DATA

**DO NOT IMPLEMENT ANY CODE FIXES YET.**

This guide will help identify the EXACT root cause of the tenant dashboard issue through systematic data collection and analysis.

---

## Step 1: Collect Console Logs

### Instructions for User

1. **Login** as the tenant user experiencing the issue
2. **Open browser console** (Press F12, then click "Console" tab)
3. **Clear console** (click trash icon or type `console.clear()`)
4. **Navigate** to `/tenant` dashboard
5. **Wait** for page to fully load
6. **Copy ALL logs** that start with "=== DIAGNOSTIC START ==="
7. **Share** the complete log output

### What to Look For

The logs will show one of these scenarios:

---

## Step 2: Run SQL Diagnostics

### Query A: Check Auth User and Profile Match

**Replace `<tenant_email>` with the actual tenant's email address**

```sql
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  au.created_at as auth_created,
  p.id as profile_id,
  p.email as profile_email,
  p.name as profile_name,
  p.role as profile_role,
  p.created_at as profile_created
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email = '<tenant_email>';
```

**Expected Result:**
- Should return 1 row
- `auth_id` should match `profile_id`
- `profile_id` should NOT be null

**If profile_id is NULL:**
→ **SCENARIO A: Profile Missing** (see fixes below)

---

### Query B: Check All Tenancies for User

**Use the `auth_id` from Query A result**

```sql
SELECT 
  t.id as tenancy_id,
  t.tenant_user_id,
  t.room_id,
  t.status,
  t.start_date,
  t.end_date,
  t.created_at,
  r.label as room_label,
  h.name as house_name
FROM tenancies t
LEFT JOIN rooms r ON r.id = t.room_id
LEFT JOIN houses h ON h.id = r.house_id
WHERE t.tenant_user_id = '<auth_id_from_query_a>'
ORDER BY t.created_at DESC;
```

**Expected Result:**
- Should return at least 1 row for active tenancy
- `tenant_user_id` should equal `auth_id` from Query A
- At least one row should have status in: OCCUPIED, MOVE_OUT_INTENDED, MOVE_IN_PENDING_SIGNATURE

**If returns 0 rows:**
→ **SCENARIO B: No Tenancies Exist** (see fixes below)

**If returns rows but all have status = 'ENDED':**
→ **SCENARIO C: All Tenancies Ended** (see fixes below)

---

### Query C: Check for Tenancy User ID Mismatch

**Use the tenant's email**

```sql
SELECT 
  t.id as tenancy_id,
  t.tenant_user_id as tenancy_user_id,
  p.email as tenancy_email,
  p.name as tenancy_name,
  t.status,
  au.id as expected_auth_id,
  au.email as expected_email
FROM tenancies t
JOIN profiles p ON p.id = t.tenant_user_id
CROSS JOIN auth.users au
WHERE au.email = '<tenant_email>'
  AND t.tenant_user_id != au.id
ORDER BY t.created_at DESC;
```

**Expected Result:**
- Should return 0 rows (no mismatch)

**If returns rows:**
→ **SCENARIO D: User ID Mismatch** (see fixes below)

---

## Step 3: Schema Verification

Run this to confirm the schema is as expected:

```sql
-- Verify profiles.id references auth.users.id
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'profiles'
  AND kcu.column_name = 'id';

-- Verify tenancies.tenant_user_id references profiles.id
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'tenancies'
  AND kcu.column_name = 'tenant_user_id';
```

**Expected:**
- `profiles.id` → `auth.users.id`
- `tenancies.tenant_user_id` → `profiles.id`

---

## Scenarios and Fixes

### SCENARIO A: Profile Missing

**Console Logs Show:**
```
Profile check for user.id: null
CRITICAL: No profile found for auth user.id: xxx
```

**SQL Query A Shows:**
```
auth_id: xxx-xxx-xxx
profile_id: NULL
```

**Root Cause:** Auth user exists but profile row was never created.

**Fix:**
```sql
-- Create missing profile
INSERT INTO profiles (id, email, name, role)
VALUES (
  '<auth_id_from_query_a>',
  '<tenant_email>',
  '<tenant_name>',
  'TENANT'
);
```

**Then:** Refresh dashboard - should work.

---

### SCENARIO B: No Tenancies Exist

**Console Logs Show:**
```
Profile check: { id: xxx, ... }
All tenancies for user.id: []
Total tenancies found: 0
```

**SQL Query B Shows:**
```
(no rows)
```

**Root Cause:** Profile exists but no tenancy was ever created for this user.

**Fix:**
```sql
-- Admin must create tenancy via admin UI
-- OR manually:
INSERT INTO tenancies (room_id, tenant_user_id, start_date, status)
VALUES (
  '<room_id>',
  '<auth_id_from_query_a>',
  CURRENT_DATE,
  'OCCUPIED'
);
```

**Then:** Refresh dashboard - should show the tenancy.

---

### SCENARIO C: All Tenancies Ended

**Console Logs Show:**
```
All tenancies: [{ status: 'ENDED', ... }]
No ACTIVE tenancy found
```

**SQL Query B Shows:**
```
tenancy_id: yyy
status: ENDED
```

**Root Cause:** User had tenancy but it was ended. This is expected behavior.

**Fix:** This is NOT a bug. Display the "no active tenancy" message to user. 
- If user should have active tenancy, update status:
```sql
UPDATE tenancies 
SET status = 'OCCUPIED', end_date = NULL
WHERE id = '<tenancy_id>';
```

---

### SCENARIO D: User ID Mismatch

**Console Logs Show:**
```
All tenancies for user.id: []
Total tenancies found: 0
```

**SQL Query C Shows:**
```
tenancy_user_id: zzz-zzz-zzz
expected_auth_id: xxx-xxx-xxx
(they don't match!)
```

**Root Cause:** Tenancy was created with wrong `tenant_user_id`. Points to different profile/auth user.

**Fix:**
```sql
-- Update tenancy to correct user
UPDATE tenancies
SET tenant_user_id = '<correct_auth_id>'
WHERE id = '<tenancy_id>';
```

**Verify:** Ensure the wrong user doesn't lose access to something they should have.

---

### SCENARIO E: Success (Everything Works)

**Console Logs Show:**
```
Profile check: { id: xxx, ... }
All tenancies: [{ status: 'OCCUPIED', ... }]
Found active tenancy: { id: yyy, ... }
=== DIAGNOSTIC END ===
```

**SQL Query B Shows:**
```
tenancy_id: yyy
status: OCCUPIED (or other active status)
tenant_user_id: xxx (matches auth_id)
```

**Result:** Dashboard displays tenancy correctly. No fix needed!

---

## Implementation Checklist (After Fix Applied)

Once root cause is identified and fix applied, verify:

### Dashboard Test
- [ ] Login as tenant
- [ ] Navigate to `/tenant`
- [ ] Tenancy details display (house, room, dates, status)
- [ ] No error messages
- [ ] Console shows "Found active tenancy"

### Move-Out Form Test
- [ ] Navigate to `/tenant/move-out`
- [ ] Form loads without "no tenancy" error
- [ ] Can fill form fields
- [ ] Can submit successfully

### Multiple Status Test
- [ ] Change tenancy status to 'MOVE_OUT_INTENDED' in DB
- [ ] Refresh dashboard
- [ ] Still displays tenancy
- [ ] Repeat for: MOVE_IN_PENDING_SIGNATURE, MOVE_OUT_INSPECTION_DRAFT, MOVE_OUT_INSPECTION_FINAL

### No Tenancy Test
- [ ] Login as tenant with no tenancy (or set status to ENDED)
- [ ] Dashboard shows friendly "no active tenancy" message
- [ ] No error state (blue info box, not red error box)

---

## Security Verification

After fix, ensure:

- [ ] Service role key is only in server actions (never client)
- [ ] Query filters by authenticated user's ID
- [ ] User cannot access other users' tenancies
- [ ] RLS policies still protect data appropriately

---

## Summary

**Current State:** Diagnostic logging added, awaiting data collection.

**Next Steps:**
1. User provides console logs
2. User runs SQL queries and shares results
3. Identify which scenario (A, B, C, D, or E)
4. Apply MINIMAL fix for that specific scenario
5. Verify with checklist above

**Do not proceed with code changes until diagnostic data confirms root cause.**
