# User Management Feature Guide

## Overview

The admin portal now includes a comprehensive user management feature that allows administrators to create and view user accounts for the Corporate Living App.

## Accessing User Management

1. **Login** as an admin user
2. **Navigate** to `/admin` (Admin Dashboard)
3. **Click** on the "Users" card
4. **URL:** `http://localhost:3000/admin/users`

## Features

### View All Users

The users page displays a table with all registered users:

**Columns:**
- **Name** - Full name of the user
- **Email** - User's email address (login credential)
- **Role** - User's role with color-coded badge:
  - 🟣 **ADMIN** (Purple) - Full system access
  - 🔵 **COORDINATOR** (Blue) - House management
  - 🟢 **TENANT** (Green) - Tenant portal access
- **Created** - Date when user was created

### Create New Users

Click the "Create User" button to open the creation form.

**Required Fields:**
1. **Email** - Valid email address (will be login username)
2. **Full Name** - User's display name
3. **Password** - Minimum 6 characters
4. **Role** - Select from dropdown:
   - Tenant
   - Coordinator
   - Admin

**Validation:**
- Email must be valid format (user@example.com)
- Email must be unique (not already in system)
- Name must not be empty
- Password must be at least 6 characters
- Role must be selected

## User Roles Explained

### ADMIN
**Access Level:** Full system access

**Capabilities:**
- Create and manage users
- Create and manage houses
- Create and manage rooms
- Assign coordinators to houses
- Create and manage tenancies
- View all data across the system

**Use Cases:**
- System administrators
- Property managers
- Senior staff

### COORDINATOR
**Access Level:** Assigned houses only

**Capabilities:**
- View assigned houses
- Conduct move-out inspections
- Create inspection reports
- Upload photos
- Finalize inspections
- View tenant information for assigned houses

**Use Cases:**
- House supervisors
- Property coordinators
- Building managers

### TENANT
**Access Level:** Personal data only

**Capabilities:**
- Submit move-out intentions
- View assigned room
- View inspection reports
- Sign move-in acknowledgements
- View personal tenancy information

**Use Cases:**
- Students
- Renters
- Residents

## Step-by-Step: Creating a User

### Example: Creating a Tenant

1. **Open User Management**
   - Go to Admin Dashboard
   - Click "Users" card

2. **Open Create Form**
   - Click "Create User" button
   - Modal form appears

3. **Fill in Details**
   ```
   Email: john.smith@university.edu
   Full Name: John Smith
   Password: Welcome2024
   Role: Tenant
   ```

4. **Submit**
   - Click "Create User" button
   - Wait for confirmation message

5. **Verify**
   - User appears in table
   - Green "TENANT" badge shown
   - Email and name displayed correctly

6. **User Can Now Login**
   - Navigate to `/login`
   - Email: john.smith@university.edu
   - Password: Welcome2024
   - Redirected to tenant dashboard

### Example: Creating a Coordinator

1. **Open Create Form**

2. **Fill in Details**
   ```
   Email: mary.coordinator@company.com
   Full Name: Mary Johnson
   Password: Secure123
   Role: Coordinator
   ```

3. **Submit and Verify**
   - User created with blue "COORDINATOR" badge

4. **Next Steps**
   - Assign coordinator to houses in Houses management
   - Coordinator can then access assigned houses

### Example: Creating an Admin

1. **Open Create Form**

2. **Fill in Details**
   ```
   Email: admin@company.com
   Full Name: Admin User
   Password: AdminPass123
   Role: Admin
   ```

3. **Submit and Verify**
   - User created with purple "ADMIN" badge

4. **Admin Access**
   - New admin has full system access
   - Can create more users
   - Can manage all resources

## Important Notes

### Security

1. **Service Role Key Required**
   - Must have `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
   - Get from Supabase Dashboard → Settings → API
   - Never commit this key to version control
   - Only used in server-side code

2. **Access Control**
   - Only admins can access user management
   - Enforced by middleware
   - Role-based authorization

3. **Password Security**
   - Stored securely in Supabase Auth
   - Never visible after creation
   - User can reset via standard auth flow

4. **Email Confirmation**
   - Users created by admin are auto-confirmed
   - No email verification needed
   - Ready to login immediately

### Best Practices

1. **Email Addresses**
   - Use organization email addresses
   - Follow consistent naming convention
   - Easy to identify user type

2. **Passwords**
   - Use strong passwords for admins
   - Can be simple for initial tenant accounts
   - Users should change on first login

3. **Names**
   - Use full legal names
   - Consistent formatting
   - Easy to identify in lists

4. **Role Assignment**
   - Start with TENANT for most users
   - Only assign COORDINATOR when needed
   - Limit ADMIN roles to trusted staff

## Common Workflows

### Onboarding New Tenant

1. Create user account (TENANT role)
2. Create tenancy assignment
3. Provide login credentials to tenant
4. Tenant logs in and views their room

### Setting Up Coordinator

1. Create user account (COORDINATOR role)
2. Create/identify house
3. Assign coordinator to house (in Houses page)
4. Coordinator logs in and sees assigned houses

### Adding Admin User

1. Create user account (ADMIN role)
2. User logs in with full access
3. Can perform all admin functions

## Troubleshooting

### "Error: Service role key not configured"

**Problem:** SUPABASE_SERVICE_ROLE_KEY environment variable not set

**Solution:**
1. Go to Supabase Dashboard
2. Navigate to Settings → API
3. Copy `service_role` key (secret)
4. Add to `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
5. Restart dev server

### "Error: Email already exists"

**Problem:** Email address is already registered

**Solution:**
- Use different email address
- Check if user already exists in table
- Consider if this is a duplicate request

### "Error: Password must be at least 6 characters"

**Problem:** Password too short

**Solution:**
- Use at least 6 characters
- Recommend 8+ characters for security
- Include mix of letters and numbers

### User not appearing in list

**Problem:** Page hasn't refreshed

**Solution:**
- Page auto-refreshes after creation
- If not visible, manually refresh page
- Check if creation actually succeeded

### Can't access /admin/users page

**Problem:** Not logged in as admin

**Solution:**
- Login with admin credentials
- Verify user has ADMIN role in database
- Check middleware is working

## Database Details

### Tables Used

**auth.users** (Supabase Auth)
- Stores authentication credentials
- Managed by Supabase
- Email and password

**profiles**
- Stores user profile information
- Links to auth.users via id
- Fields: id, email, name, role, timestamps

### Schema

```sql
CREATE TYPE user_role AS ENUM ('ADMIN', 'COORDINATOR', 'TENANT');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'TENANT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## API Reference

### Server Action: `createUser`

**Location:** `/app/admin/users/actions.ts`

**Function Signature:**
```typescript
createUser(data: CreateUserData): Promise<CreateUserResult>

interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: UserRole; // 'ADMIN' | 'COORDINATOR' | 'TENANT'
}

interface CreateUserResult {
  success?: boolean;
  userId?: string;
  error?: string;
}
```

**Process:**
1. Validates input data
2. Creates user in Supabase Auth
3. Creates profile record
4. Rollback on failure
5. Returns result

**Error Handling:**
- Returns error message if creation fails
- Deletes auth user if profile creation fails
- Logs errors to console

## UI Components

### Users Table

**Component:** `<table>` in `/app/admin/users/page.tsx`

**Features:**
- Responsive layout
- Sortable columns
- Role-colored badges
- Hover effects
- Empty state

### Create User Modal

**Component:** Modal form in `/app/admin/users/page.tsx`

**Features:**
- Overlay background
- Form validation
- Loading states
- Success/error messages
- Cancel button

### Dashboard Card

**Component:** Link card in `/app/admin/page.tsx`

**Features:**
- Consistent styling
- Hover effects
- Clear description
- Purple accent color

## Future Enhancements

Potential improvements for future versions:

1. **Edit User**
   - Update name
   - Change role
   - Change email

2. **Delete User**
   - Soft delete (deactivate)
   - Hard delete (remove completely)
   - Confirmation dialog

3. **Password Reset**
   - Admin-initiated password reset
   - Send reset email
   - Temporary password

4. **Bulk Operations**
   - Import users from CSV
   - Bulk role changes
   - Export user list

5. **Search & Filter**
   - Search by name/email
   - Filter by role
   - Sort by different columns

6. **Pagination**
   - Handle large user lists
   - 50/100 per page
   - Page navigation

7. **User Details**
   - View full user profile
   - See associated records
   - Activity history

8. **Audit Log**
   - Track user creation
   - Record who created whom
   - Change history

## Related Documentation

- **Database Schema:** `supabase/migrations/001_initial_schema.sql`
- **Types:** `lib/types.ts`
- **Authentication:** Supabase Auth documentation
- **Middleware:** Role-based access control

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review error messages carefully
3. Check browser console for details
4. Verify environment variables
5. Confirm Supabase connection

---

**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** ✅ Production Ready
