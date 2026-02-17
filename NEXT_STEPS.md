# What's Next - Corporate Living App

This document outlines the immediate next steps to take the Corporate Living App from its current state (80% complete) to production-ready (100%).

## 🎯 Quick Start - First 3 Days

### Day 1: Core Setup (4-6 hours)

#### 1. Create `.env.example` File
```bash
# In project root
cat > .env.example << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Service Role (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Service (choose one)
# Option 1: Resend (recommended)
RESEND_API_KEY=re_your-api-key
EMAIL_FROM=noreply@yourdomain.com

# Option 2: SendGrid
SENDGRID_API_KEY=SG.your-api-key

# Option 3: AWS SES
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
EOF
```

#### 2. Set Up Supabase Project

**Steps:**
1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
3. Choose organization and name: "corporate-living-app"
4. Choose database password (save it securely!)
5. Select region closest to your users
6. Wait 2-3 minutes for provisioning

**After provisioning:**
1. Go to Settings → API
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy service_role key → `SUPABASE_SERVICE_ROLE_KEY`

#### 3. Run Database Migrations

**In Supabase Dashboard:**
1. Click "SQL Editor" in sidebar
2. Click "New Query"
3. Copy content from `supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. Repeat for `002_rls_policies.sql`
6. Optionally run `003_sample_data.sql` for testing

**Verify:**
```sql
-- Run this query to check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should show: houses, rooms, tenancies, profiles, etc.
```

#### 4. Create First Admin User

**In Supabase Dashboard:**
1. Go to Authentication → Users
2. Click "Add User" → "Create new user"
3. Email: `admin@yourdomain.com`
4. Password: (choose strong password)
5. Click "Create User"
6. Copy the UUID from the user

**In SQL Editor:**
```sql
-- Replace 'USER_UUID_HERE' with the copied UUID
INSERT INTO profiles (id, email, name, role)
VALUES (
  'USER_UUID_HERE',
  'admin@yourdomain.com',
  'Admin User',
  'ADMIN'
);
```

### Day 2: Email Integration (3-4 hours)

#### 1. Choose Email Provider

**Recommended: Resend** (easiest setup)
- Sign up at [resend.com](https://resend.com)
- Free tier: 3,000 emails/month
- Modern API, great documentation

**Alternatives:**
- SendGrid: 100 emails/day free
- AWS SES: $0.10 per 1,000 emails

#### 2. Install Resend

```bash
npm install resend
```

#### 3. Update Notification API

Replace `/app/api/notifications/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let emailData;

    switch (type) {
      case 'move_out_intention':
        emailData = {
          to: data.recipients,
          from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
          subject: `Move-Out Intention: ${data.tenantName}`,
          html: `
            <h2>Move-Out Intention Submitted</h2>
            <p><strong>Tenant:</strong> ${data.tenantName}</p>
            <p><strong>Room:</strong> ${data.roomLabel}</p>
            <p><strong>Planned Date:</strong> ${data.plannedDate}</p>
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            <p><a href="${data.appUrl}/coordinator/inspections">View in App</a></p>
          `,
        };
        break;

      case 'inspection_finalized':
        emailData = {
          to: data.recipients,
          from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
          subject: `Inspection Finalized: ${data.roomLabel}`,
          html: `
            <h2>Move-Out Inspection Completed</h2>
            <p><strong>Room:</strong> ${data.roomLabel}</p>
            <p><strong>Tenant:</strong> ${data.tenantName}</p>
            <p><strong>Finalized:</strong> ${new Date().toLocaleDateString()}</p>
            <p><a href="${data.appUrl}/admin">View in App</a></p>
          `,
        };
        break;

      case 'move_in_signed':
        emailData = {
          to: data.recipients,
          from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
          subject: `Move-In Signed: ${data.tenantName}`,
          html: `
            <h2>Move-In Acknowledgement Signed</h2>
            <p><strong>Tenant:</strong> ${data.tenantName}</p>
            <p><strong>Room:</strong> ${data.roomLabel}</p>
            <p><strong>Signed:</strong> ${new Date().toLocaleDateString()}</p>
            <p><a href="${data.appUrl}/admin/tenancies">View in App</a></p>
          `,
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown notification type' },
          { status: 400 }
        );
    }

    const { data: emailResult, error } = await resend.emails.send(emailData);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: emailResult?.id,
    });

  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
```

#### 4. Test Email Sending

Create `/scripts/test-email.ts`:

```typescript
// Test email notification
fetch('http://localhost:3000/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'move_out_intention',
    data: {
      recipients: ['test@example.com'],
      tenantName: 'Test Tenant',
      roomLabel: 'Room 101',
      plannedDate: '2024-03-15',
      notes: 'Test notes',
      appUrl: 'http://localhost:3000',
    },
  }),
})
  .then(res => res.json())
  .then(data => console.log('Email sent:', data))
  .catch(err => console.error('Error:', err));
```

### Day 3: Storage & Auth (4-6 hours)

#### 1. Configure Supabase Storage

**In Supabase Dashboard:**

1. Click "Storage" in sidebar
2. Click "New bucket"
3. Name: `inspection-photos`
   - Public bucket: No (keep private)
   - File size limit: 5MB
   - Allowed MIME types: `image/jpeg,image/png,image/webp`

4. Create another bucket:
   - Name: `signatures`
   - Public bucket: No
   - File size limit: 1MB
   - Allowed MIME types: `image/png`

5. Set up policies for `inspection-photos`:

```sql
-- Allow coordinators to upload
CREATE POLICY "Coordinators can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-photos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('COORDINATOR', 'ADMIN')
  )
);

-- Allow users to view photos for their inspections
CREATE POLICY "Users can view relevant inspection photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-photos' AND
  EXISTS (
    SELECT 1 FROM inspections i
    WHERE i.id::text = (storage.foldername(name))[1]
    AND (
      i.created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') OR
      EXISTS (
        SELECT 1 FROM tenancies t
        WHERE t.id = i.tenancy_id
        AND t.tenant_user_id = auth.uid()
      )
    )
  )
);
```

#### 2. Create Authentication Pages

**Create `/app/login/page.tsx`:**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!supabase) {
      setError('Supabase is not configured');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      // Redirect based on role
      const role = profile?.role;
      if (role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'COORDINATOR') {
        router.push('/coordinator');
      } else {
        router.push('/tenant');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Corporate Living Login
        </h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
```

## 📋 Verification Checklist

After completing the 3-day setup, verify:

- [ ] ✅ Can log in with admin account
- [ ] ✅ Can create a house
- [ ] ✅ Can add rooms to house
- [ ] ✅ Can assign coordinator to house
- [ ] ✅ Can create a tenancy
- [ ] ✅ Tenant can submit move-out intention
- [ ] ✅ Email notification received
- [ ] ✅ Coordinator can create inspection
- [ ] ✅ All checklist items work
- [ ] ✅ Can finalize inspection
- [ ] ✅ Email notification received

## 🚀 Next Phase: Testing & Deployment (Week 2)

1. Deploy to Vercel staging
2. User acceptance testing
3. Fix bugs and polish UI
4. Performance testing
5. Production deployment

## 📞 Support

If you get stuck:
- Check Supabase logs: Dashboard → Logs
- Check Next.js console for errors
- Review SETUP.md for detailed instructions
- Check DEPLOYMENT.md for deployment help

## 🎯 Success Metrics

**End of Week 1:**
- Database fully configured
- Email notifications working
- Authentication working
- Basic workflows tested

**End of Week 2:**
- All features tested
- Deployed to staging
- Ready for production

**End of Week 3:**
- In production
- Real users testing
- Monitoring in place
