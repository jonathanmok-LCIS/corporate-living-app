# RLS Policy Violation Error - Fixed! ✅

## The Error

```
Error: new row violates row-level security policy for table "profiles"
at handleSubmit (app/admin/users/page.tsx:69:15)
```

## What Happened

**Row-Level Security (RLS)** is a Supabase security feature that restricts database access based on policies. When you try to insert, update, or delete data, Supabase checks if you have permission based on these policies.

In this case:
- The user creation function tried to insert a new profile
- The profiles table has RLS enabled
- There was no INSERT policy that allowed the operation
- Supabase blocked the insert, causing the error

## Why It Happened

The server action was using the **regular Supabase client** instead of the **admin client** to insert the profile record.

**Regular Client:**
- Respects RLS policies
- Requires appropriate policies to be defined
- Used for normal user operations

**Admin Client:**
- Bypasses ALL RLS policies
- Has full database access
- Used for administrative operations
- Requires service role key

## The Fix

**Changed in `app/admin/users/actions.ts`:**

### Before (❌ Caused Error):
```typescript
const supabase = await createClient(); // Regular client

const { error: profileError } = await supabase
  .from('profiles')
  .insert([{ ... }]); // ❌ RLS blocked this
```

### After (✅ Fixed):
```typescript
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role
  { ... }
);

const { error: profileError } = await supabaseAdmin
  .from('profiles')
  .insert([{ ... }]); // ✅ RLS bypassed
```

## How to Verify the Fix

1. **Pull the latest changes:**
   ```bash
   git pull
   ```

2. **Make sure service role key is set:**
   ```bash
   # In .env.local
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

4. **Try creating a user:**
   - Go to `/admin/users`
   - Click "Create User"
   - Fill in the form
   - Click "Create User"
   - ✅ Should succeed without errors!

## Understanding RLS

### What is Row-Level Security?

RLS is a database security feature that controls which rows users can access in a table.

**Example Policies:**
```sql
-- Users can view all profiles
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

-- Admins can update profiles
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
```

### When to Use Regular Client vs Admin Client

**Use Regular Client When:**
- ✅ Normal user operations
- ✅ Users accessing their own data
- ✅ RLS policies should be enforced
- ✅ Security is critical

**Use Admin Client When:**
- ✅ Administrative operations
- ✅ System-level tasks
- ✅ Bulk operations
- ✅ User creation/management
- ✅ Need to bypass RLS

## Prevention Tips

1. **For Admin Operations:**
   ```typescript
   // Always use admin client for admin tasks
   const supabaseAdmin = createSupabaseClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!,
     { auth: { autoRefreshToken: false, persistSession: false } }
   );
   ```

2. **For User Operations:**
   ```typescript
   // Use regular client for user operations
   const supabase = await createClient();
   ```

3. **Test Different Roles:**
   - Test as admin
   - Test as coordinator
   - Test as tenant
   - Verify permissions work correctly

4. **Review RLS Policies:**
   - Check `supabase/migrations/002_rls_policies.sql`
   - Ensure policies match your needs
   - Add new policies as needed

## Common RLS Scenarios

### 1. User Creation (This Fix)
**Solution:** Use admin client to bypass RLS

### 2. Bulk Imports
**Problem:** Regular client can't insert many rows
**Solution:** Use admin client for bulk operations

### 3. System Migrations
**Problem:** System needs to modify data
**Solution:** Use admin client for migrations

### 4. Admin Dashboards
**Problem:** Admin needs to see all data
**Solution:** Use admin client for admin queries

## Related Documentation

- **User Management Guide:** `USER_MANAGEMENT_GUIDE.md`
- **Create User Summary:** `CREATE_USER_SUMMARY.md`
- **Supabase RLS Docs:** https://supabase.com/docs/guides/auth/row-level-security

## Security Note

⚠️ **Important:** The service role key has full database access!

**DO:**
- ✅ Keep it in `.env.local` (gitignored)
- ✅ Only use in server-side code
- ✅ Never expose to client
- ✅ Rotate periodically

**DON'T:**
- ❌ Commit to repository
- ❌ Use in client components
- ❌ Share publicly
- ❌ Log in console

---

**Status:** ✅ **Error Fixed!**

The RLS policy violation has been resolved. User creation now works smoothly using the admin client to bypass RLS policies appropriately.
