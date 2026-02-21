# Quick Diagnostic Reference Card

## User: DO THIS NOW

### 1. Open Console
Press `F12` → Click "Console" tab → Type `console.clear()`

### 2. Load Dashboard
Navigate to `/tenant` → Wait for load

### 3. Copy Logs
Look for `=== DIAGNOSTIC START ===` 
Copy everything until `=== DIAGNOSTIC END ===`

### 4. Run SQL (in Supabase SQL Editor)

**Replace `<tenant_email>` with actual email:**

```sql
-- Query A: Check auth and profile
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  p.id as profile_id,
  p.email as profile_email,
  p.name,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email = '<tenant_email>';
```

**Use `auth_id` from above result:**

```sql
-- Query B: Check tenancies
SELECT 
  t.id,
  t.tenant_user_id,
  t.status,
  t.start_date,
  t.end_date,
  r.label as room,
  h.name as house
FROM tenancies t
LEFT JOIN rooms r ON r.id = t.room_id
LEFT JOIN houses h ON h.id = r.house_id
WHERE t.tenant_user_id = '<auth_id_from_query_a>'
ORDER BY t.created_at DESC;
```

### 5. Share Results
Post both:
- Console logs (from step 3)
- SQL results (from step 4)

---

## Quick Scenario Identification

**If SQL Query A shows `profile_id = NULL`:**
→ **SCENARIO A: Missing Profile**
→ Fix: Create profile row

**If SQL Query B shows 0 rows:**
→ **SCENARIO B: No Tenancies**
→ Fix: Create tenancy (or expected behavior)

**If SQL Query B shows rows but all `status = 'ENDED'`:**
→ **SCENARIO C: Ended Tenancies**
→ Fix: Update status (or expected behavior)

**If console shows 0 tenancies but SQL Query B shows rows with different `tenant_user_id`:**
→ **SCENARIO D: User ID Mismatch**
→ Fix: Update tenancy.tenant_user_id

**If console shows "Found active tenancy":**
→ **SCENARIO E: Works!**
→ Fix: None needed

---

## Quick Fix Reference

### Scenario A Fix
```sql
INSERT INTO profiles (id, email, name, role)
VALUES ('<auth_id>', '<email>', '<name>', 'TENANT');
```

### Scenario B Fix
```sql
-- Admin creates via UI, or:
INSERT INTO tenancies (room_id, tenant_user_id, start_date, status)
VALUES ('<room_id>', '<auth_id>', CURRENT_DATE, 'OCCUPIED');
```

### Scenario C Fix
```sql
-- If should be active:
UPDATE tenancies 
SET status = 'OCCUPIED', end_date = NULL
WHERE id = '<tenancy_id>';
```

### Scenario D Fix
```sql
UPDATE tenancies
SET tenant_user_id = '<correct_auth_id>'
WHERE id = '<tenancy_id>';
```

---

## After Fix: Verify

1. Clear browser cache
2. Logout and login again
3. Navigate to `/tenant`
4. ✅ Should show tenancy details
5. Navigate to `/tenant/move-out`
6. ✅ Should load without error

---

**Full documentation:** See `TENANT_DASHBOARD_DIAGNOSTIC_GUIDE.md`
