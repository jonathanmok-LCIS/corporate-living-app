# Critical Bugs - Detailed Fix Instructions

This document provides step-by-step fixes for the most critical bugs found during QA testing.

---

## 🔴 BUG #1: Move-In Page Function Hoisting Error (BLOCKER)

**File:** `app/tenant/move-in/page.tsx`  
**Line:** 38  
**Severity:** BLOCKER - Application crashes

### Current Code (BROKEN)
```typescript
export default function TenantMoveInPage() {
  const [loading, setLoading] = useState(true);
  const [tenancy, setTenancy] = useState<any>(null);
  
  useEffect(() => {
    loadTenancyData();  // ❌ ERROR: Function accessed before it's declared
  }, []);
  
  async function loadTenancyData() {  // Function declared AFTER use
    setLoading(true);
    const result = await getTenantPendingTenancy();
    // ...
    setLoading(false);
  }
  // ...
}
```

### Why This Fails
JavaScript/TypeScript hoisting rules mean the function declaration exists but is not yet defined when useEffect runs, causing a runtime error.

### Fixed Code (OPTION 1 - Recommended)
```typescript
export default function TenantMoveInPage() {
  const [loading, setLoading] = useState(true);
  const [tenancy, setTenancy] = useState<any>(null);
  const [previousPhotos, setPreviousPhotos] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ Declare function BEFORE useEffect using useCallback
  const loadTenancyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getTenantPendingTenancy();
      
      if (!result.success || !result.data) {
        setError(result.error || 'No pending tenancy found');
        return;
      }
      
      setTenancy(result.data);
      
      // Fetch previous tenant's photos
      if (result.data.room_id) {
        const photosResult = await getPreviousTenantMoveOutPhotos(result.data.room_id);
        if (photosResult.success && photosResult.data) {
          setPreviousPhotos(photosResult.data);
        }
      }
    } catch (error) {
      console.error('Error loading tenancy:', error);
      setError(error instanceof Error ? error.message : 'Failed to load tenancy');
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps array since function doesn't depend on any state
  
  useEffect(() => {
    loadTenancyData();
  }, [loadTenancyData]); // ✅ Include function in dependencies
  
  // ... rest of component
}
```

### Fixed Code (OPTION 2 - Simple)
```typescript
export default function TenantMoveInPage() {
  const [loading, setLoading] = useState(true);
  const [tenancy, setTenancy] = useState<any>(null);
  
  // ✅ Simply move the function declaration BEFORE useEffect
  async function loadTenancyData() {
    setLoading(true);
    const result = await getTenantPendingTenancy();
    // ... rest of function
    setLoading(false);
  }
  
  useEffect(() => {
    loadTenancyData();
  }, []); // Empty array OK since we only want to run once on mount
  
  // ... rest of component
}
```

### Which Option to Choose?
- **Option 1 (useCallback):** Better for React 18+ strict mode, prevents unnecessary re-renders
- **Option 2 (Simple move):** Simpler, works fine for most cases

### Testing After Fix
1. Navigate to `/tenant/move-in` as a logged-in tenant
2. Page should load without errors
3. Verify loading state shows
4. Verify data loads correctly
5. Check browser console for errors

---

## 🟠 BUG #2: TypeScript `any` Types (38 instances)

### Why This Matters
Using `any` defeats the purpose of TypeScript:
- No compile-time type checking
- No IDE autocomplete
- Runtime errors not caught
- Harder to refactor

### Common Patterns to Fix

#### Pattern 1: Event Handlers
```typescript
// ❌ WRONG
const handleSubmit = async (e: any) => {
  e.preventDefault();
  // ...
}

// ✅ CORRECT
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // ...
}
```

#### Pattern 2: Error Handling
```typescript
// ❌ WRONG
try {
  // ...
} catch (error: any) {
  console.error(error.message);
}

// ✅ CORRECT
try {
  // ...
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

#### Pattern 3: API Response Data
```typescript
// ❌ WRONG
const [data, setData] = useState<any>(null);

// ✅ CORRECT - Define proper type
interface TenancyData {
  id: string;
  room_id: string;
  tenant_user_id: string;
  status: string;
  start_date: string;
  // ... other fields
}

const [data, setData] = useState<TenancyData | null>(null);
```

### Files to Update (Priority Order)

1. **app/tenant/move-in/page.tsx** - 3 instances
   - Line 33: `tenancy` state
   - Line 34: `previousPhotos` state  
   - Line 51, 57: error handling

2. **app/admin/tenancies/page.tsx** - 4 instances
   - Line 15: `handleCreate` event param
   - Line 112, 153, 173: error handling

3. **app/coordinator/move-out-reviews/page.tsx** - 1 instance
   - Line 71: error handling

4. Continue with remaining files

### Proper Type Definitions
Add to `lib/types.ts`:

```typescript
// Database types
export interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'COORDINATOR' | 'TENANT';
  created_at: string;
  updated_at: string;
}

export interface House {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  house_id: string;
  label: string;
  capacity: 1 | 2;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tenancy {
  id: string;
  room_id: string;
  slot: 'A' | 'B' | null;
  tenant_user_id: string;
  start_date: string;
  end_date: string | null;
  status: TenancyStatus;
  created_at: string;
  updated_at: string;
}

export type TenancyStatus = 
  | 'OCCUPIED'
  | 'MOVE_OUT_INTENDED'
  | 'MOVE_OUT_INSPECTION_DRAFT'
  | 'MOVE_OUT_INSPECTION_FINAL'
  | 'MOVE_IN_PENDING_SIGNATURE'
  | 'ENDED';

export interface MoveOutIntention {
  id: string;
  tenancy_id: string;
  planned_move_out_date: string;
  notes: string | null;
  key_area_photos: string[] | null;
  damage_photos: string[] | null;
  damage_description: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

// Server action response types
export interface ServerActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## 🟠 BUG #3: Missing React Hook Dependencies

### Why This Matters
Missing dependencies in useEffect can cause:
- Stale closures (using old values)
- Functions not being called when they should
- Hard-to-debug issues

### Example Fix

#### File: `app/admin/houses/[id]/coordinators/page.tsx`

```typescript
// ❌ WRONG
useEffect(() => {
  fetchCoordinators();
  fetchHouse();
}, []); // Missing dependencies

// ✅ CORRECT
const fetchCoordinators = useCallback(async () => {
  const result = await getHouseCoordinators(houseId);
  if (result.success) {
    setCoordinators(result.data);
  }
}, [houseId]); // Include dependencies

const fetchHouse = useCallback(async () => {
  const result = await getHouse(houseId);
  if (result.success) {
    setHouse(result.data);
  }
}, [houseId]);

useEffect(() => {
  fetchCoordinators();
  fetchHouse();
}, [fetchCoordinators, fetchHouse]); // ✅ Include all dependencies
```

### Pattern to Follow
1. Wrap functions in `useCallback` with their dependencies
2. Include the wrapped functions in `useEffect` dependencies
3. ESLint will guide you on what to include

---

## 🟠 BUG #4: Deprecated Middleware Convention

### Current State
```
⚠ The "middleware" file convention is deprecated. 
Please use "proxy" instead.
```

### Fix Steps

1. **Rename the file:**
```bash
mv middleware.ts proxy.ts
```

2. **Update the file (if needed):**
```typescript
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // ... existing middleware logic
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

3. **Test:**
- Verify authentication still works
- Check protected routes still redirect
- Verify session handling works

---

## 🔍 TESTING CHECKLIST

After fixing each bug, test:

### Bug #1 (Move-in page)
- [ ] Page loads without console errors
- [ ] Loading state shows correctly
- [ ] Data loads and displays
- [ ] Error states work
- [ ] Signature canvas functions

### Bug #2 (TypeScript types)
- [ ] `npm run build` succeeds
- [ ] TypeScript compiler has no errors
- [ ] IDE autocomplete works
- [ ] No runtime type errors

### Bug #3 (Hook dependencies)
- [ ] `npm run lint` shows no hook warnings
- [ ] Data refreshes correctly
- [ ] No stale data issues
- [ ] Functions called at right times

### Bug #4 (Middleware)
- [ ] Authentication works
- [ ] Protected routes redirect
- [ ] Session persists
- [ ] No deprecation warnings

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

1. [ ] All critical bugs fixed
2. [ ] Lint passes with no errors
3. [ ] Build succeeds
4. [ ] Manual testing completed
5. [ ] Database migrations applied
6. [ ] Environment variables configured
7. [ ] RLS policies verified
8. [ ] File upload limits tested
9. [ ] Error handling tested
10. [ ] Security review completed

---

## 📞 NEED HELP?

If you encounter issues while fixing these bugs:

1. Check the TypeScript compiler output: `npm run build`
2. Check ESLint output: `npm run lint`
3. Check browser console for runtime errors
4. Refer to React documentation for hooks
5. Refer to Next.js documentation for middleware/proxy

Good luck! 🎉
