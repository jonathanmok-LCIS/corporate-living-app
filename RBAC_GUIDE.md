# Role-Based Access Control (RBAC) Guide

## Overview

The Corporate Living App now implements proper role-based access control (RBAC) to ensure users can only access the portal and features appropriate for their assigned role.

## The Problem (Fixed)

### Before Implementation
- ❌ Any user could navigate to any portal (`/admin`, `/coordinator`, `/tenant`)
- ❌ Home page showed links to all portals for everyone  
- ❌ Users could access unauthorized data and features
- ❌ Navigation allowed switching between portals
- ❌ Only client-side login redirect (easily bypassed)

### Security Risks
- Admin features accessible to non-admins
- Data leakage between roles
- Unauthorized operations possible
- Compliance and audit issues

## The Solution

### Server-Side Middleware Enforcement
We implemented Next.js middleware that runs on **every request** to:
1. Check authentication status
2. Verify user's role from database
3. Enforce access control rules
4. Automatically redirect unauthorized access

### Key Features
- ✅ Server-side enforcement (cannot be bypassed)
- ✅ Automatic portal assignment based on role
- ✅ Secure logout functionality
- ✅ Clean, role-specific navigation
- ✅ No portal selection - users go directly to their portal

## User Roles

### ADMIN
**Access:** `/admin/*` routes only

**Capabilities:**
- Manage houses and rooms
- Create and manage tenancies
- Create and manage users
- View all data across the system
- Assign coordinators to houses

**Cannot Access:**
- `/coordinator/*` routes
- `/tenant/*` routes

### COORDINATOR  
**Access:** `/coordinator/*` routes only

**Capabilities:**
- View assigned houses
- Manage inspections
- Complete checklists
- Upload photos (when configured)
- Finalize inspection reports

**Cannot Access:**
- `/admin/*` routes
- `/tenant/*` routes

### TENANT
**Access:** `/tenant/*` routes only

**Capabilities:**
- Submit move-out intentions
- View inspection reports
- Sign move-in acknowledgements
- View their tenancy information

**Cannot Access:**
- `/admin/*` routes
- `/coordinator/*` routes

## Access Control Matrix

| Route Pattern | ADMIN | COORDINATOR | TENANT | Unauthenticated |
|--------------|-------|-------------|--------|-----------------|
| `/` (Home) | → `/admin` | → `/coordinator` | → `/tenant` | ✅ Landing page |
| `/login` | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| `/admin` | ✅ Allowed | ❌ → `/coordinator` | ❌ → `/tenant` | ❌ → `/login` |
| `/admin/*` | ✅ Allowed | ❌ → `/coordinator` | ❌ → `/tenant` | ❌ → `/login` |
| `/coordinator` | ❌ → `/admin` | ✅ Allowed | ❌ → `/tenant` | ❌ → `/login` |
| `/coordinator/*` | ❌ → `/admin` | ✅ Allowed | ❌ → `/tenant` | ❌ → `/login` |
| `/tenant` | ❌ → `/admin` | ❌ → `/coordinator` | ✅ Allowed | ❌ → `/login` |
| `/tenant/*` | ❌ → `/admin` | ❌ → `/coordinator` | ✅ Allowed | ❌ → `/login` |

**Legend:**
- ✅ = Access granted
- ❌ = Access denied with automatic redirect
- → = Redirected to...

## How It Works

### 1. Middleware Protection (`middleware.ts`)

The middleware runs on every request and performs these checks:

```typescript
1. Is the route public? (/, /login)
   → Yes: Allow access
   → No: Continue to step 2

2. Is user authenticated?
   → No: Redirect to /login
   → Yes: Continue to step 3

3. Get user's role from database
   → Query profiles table for role

4. Does user's role match the route?
   → /admin/* requires ADMIN role
   → /coordinator/* requires COORDINATOR role
   → /tenant/* requires TENANT role

5. If role doesn't match:
   → Redirect to user's appropriate portal

6. If role matches:
   → Allow access
```

### 2. Home Page Auto-Redirect

When an authenticated user visits the home page (`/`):
- **ADMIN** → Redirected to `/admin`
- **COORDINATOR** → Redirected to `/coordinator`
- **TENANT** → Redirected to `/tenant`

Unauthenticated users see the public landing page with login button.

### 3. Portal Navigation

Each portal has a layout with:
- Logo that links to the portal itself (not home)
- Navigation links for portal-specific pages
- Role badge showing current role
- Logout button

**Example - Admin Portal:**
- Logo links to `/admin` (not `/`)
- Navigation: Dashboard, Houses, Tenancies, Users
- Badge shows "Admin"
- Logout button clears session

### 4. Logout Flow

When user clicks "Logout":
1. Session is cleared (Supabase sign out)
2. User is redirected to public home page
3. Must log in again to access any portal
4. Login redirects to appropriate portal based on role

## User Experience

### Login Journey

1. **Visit Home Page**
   - Unauthenticated users see landing page
   - Click "Sign In to Get Started"

2. **Enter Credentials**
   - Fill in email and password
   - Submit login form

3. **Automatic Portal Assignment**
   - System checks user's role in database
   - Redirects to appropriate portal:
     - ADMIN → `/admin`
     - COORDINATOR → `/coordinator`
     - TENANT → `/tenant`

4. **Portal Experience**
   - See only features for their role
   - Cannot navigate to other portals
   - Clean, focused interface
   - Logout button always available

### Navigation Behavior

**As ADMIN:**
- See Admin portal interface
- Access houses, tenancies, users management
- Logo/home always goes to `/admin`
- Cannot reach coordinator or tenant portals

**As COORDINATOR:**
- See Coordinator portal interface
- Access inspections and assigned houses
- Logo/home always goes to `/coordinator`
- Cannot reach admin or tenant portals

**As TENANT:**
- See Tenant portal interface
- Access move-out, move-in features
- Logo/home always goes to `/tenant`
- Cannot reach admin or coordinator portals

## Security Features

### 1. Server-Side Enforcement
- All checks happen on the server
- Cannot be bypassed by client manipulation
- Middleware runs before page renders
- Database verification of roles

### 2. Automatic Redirects
- Wrong portal → Correct portal
- No error pages or "access denied" messages
- Seamless user experience
- Prevents information disclosure

### 3. Session Management
- Proper logout clears all session data
- Re-authentication required after logout
- Session tokens verified on each request
- Secure cookie handling

### 4. Role Isolation
- Complete separation between portals
- No data leakage between roles
- Each role sees only relevant features
- Audit trail maintained

## Testing the System

### Manual Testing

**Test 1: Login as ADMIN**
1. Log in with admin credentials
2. Should redirect to `/admin`
3. Try accessing `/coordinator` → Redirected to `/admin`
4. Try accessing `/tenant` → Redirected to `/admin`
5. ✅ Admin can only access admin portal

**Test 2: Login as COORDINATOR**
1. Log in with coordinator credentials
2. Should redirect to `/coordinator`
3. Try accessing `/admin` → Redirected to `/coordinator`
4. Try accessing `/tenant` → Redirected to `/coordinator`
5. ✅ Coordinator can only access coordinator portal

**Test 3: Login as TENANT**
1. Log in with tenant credentials
2. Should redirect to `/tenant`
3. Try accessing `/admin` → Redirected to `/tenant`
4. Try accessing `/coordinator` → Redirected to `/tenant`
5. ✅ Tenant can only access tenant portal

**Test 4: Logout**
1. From any portal, click "Logout"
2. Should redirect to `/` (home page)
3. Home page shows public landing (not portal)
4. Try accessing any portal → Redirected to `/login`
5. ✅ Logout properly clears session

### Automated Testing Scenarios

```typescript
// Test unauthorized access
describe('RBAC Middleware', () => {
  it('redirects admin trying to access coordinator portal', async () => {
    // Login as admin
    // Navigate to /coordinator
    // Expect redirect to /admin
  });

  it('redirects unauthenticated user to login', async () => {
    // Clear session
    // Navigate to /admin
    // Expect redirect to /login
  });

  it('allows access to correct portal', async () => {
    // Login as coordinator
    // Navigate to /coordinator
    // Expect successful access
  });
});
```

## Troubleshooting

### Issue: Redirected in a loop
**Cause:** Role not found in database  
**Solution:** 
1. Check user exists in `profiles` table
2. Verify `role` column has valid value (ADMIN/COORDINATOR/TENANT)
3. Re-login to refresh session

### Issue: Can't access any portal
**Cause:** Not authenticated  
**Solution:**
1. Click "Sign In to Get Started"
2. Enter valid credentials
3. Check Supabase connection

### Issue: Stuck on login page after successful login
**Cause:** Role not set or middleware error  
**Solution:**
1. Check browser console for errors
2. Verify `profiles` table has role for user
3. Check Supabase service role key is set

### Issue: Logout doesn't work
**Cause:** Client component error  
**Solution:**
1. Check browser console
2. Verify Supabase client is configured
3. Clear browser cookies and try again

## Technical Implementation Details

### Files Modified

1. **`middleware.ts`** (New)
   - Server-side route protection
   - Role verification
   - Automatic redirects

2. **`app/page.tsx`** (Modified)
   - Removed portal selection links
   - Auto-redirect for authenticated users
   - Informational landing page

3. **`app/admin/layout.tsx`** (Modified)
   - Logo links to `/admin` not `/`
   - Added logout button
   - Added Users navigation

4. **`app/coordinator/layout.tsx`** (Modified)
   - Logo links to `/coordinator` not `/`
   - Added logout button

5. **`app/tenant/layout.tsx`** (Modified)
   - Logo links to `/tenant` not `/`
   - Added logout button

6. **`components/LogoutButton.tsx`** (New)
   - Reusable logout component
   - Handles sign out and redirect

### Dependencies

- Next.js middleware
- Supabase authentication
- Supabase server client
- React components

### Configuration

No additional configuration required. The system uses:
- Existing Supabase credentials
- Existing user profiles table
- Existing role definitions

## Best Practices

### For Administrators

1. **Assign Correct Roles**
   - Set appropriate role when creating users
   - Use ADMIN sparingly (only for administrators)
   - Review role assignments periodically

2. **User Management**
   - Create users through Admin → Users
   - Assign roles during creation
   - Verify user has correct portal access

3. **Security Monitoring**
   - Monitor login attempts
   - Review access patterns
   - Check for unusual activity

### For Developers

1. **Adding New Protected Routes**
   ```typescript
   // Add to middleware.ts if needed
   // Ensure route pattern matches role check
   ```

2. **Testing Changes**
   - Test with all three roles
   - Verify redirects work correctly
   - Check unauthenticated access

3. **Maintaining Security**
   - Never bypass middleware checks
   - Always use server-side validation
   - Keep role checks up to date

## Future Enhancements

Potential improvements:
- [ ] Permission-based access (beyond roles)
- [ ] Role hierarchy (ADMIN can access all)
- [ ] Temporary role elevation
- [ ] Audit logging of access attempts
- [ ] IP-based restrictions
- [ ] MFA for admin users
- [ ] Session timeout configuration

## Summary

The role-based access control system ensures:
- ✅ **Security:** Server-side enforcement prevents unauthorized access
- ✅ **Simplicity:** Users automatically go to their portal
- ✅ **Clarity:** Each role sees only relevant features
- ✅ **Compliance:** Proper separation of duties
- ✅ **Auditability:** Clear access patterns

Users can no longer access portals they don't have permission for, providing proper security and role separation.
