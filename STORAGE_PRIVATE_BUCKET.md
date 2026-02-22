# Storage Refinement: Private Bucket with Signed URLs

## Summary

Refined storage implementation to use **private bucket** with **temporary signed URLs** instead of permanent public URLs.

## What Changed

### 1. Bucket Privacy
- **Before:** Public bucket (`public = true`)
- **After:** Private bucket (`public = false`)

### 2. URL Generation
- **Before:** Permanent public URLs stored in database
- **After:** Storage paths stored, signed URLs generated on-demand

### 3. Database Storage
- **Before:** `https://xyz.supabase.co/storage/.../public/.../photo.webp`
- **After:** `userId/timestamp-random-safeName.webp`

## Why This Is Better

### Security

| Aspect | Public URLs | Signed URLs |
|--------|-------------|-------------|
| Duration | Permanent | 10 minutes |
| Revocable | No | Yes |
| Shareable | Forever | Temporary |
| Secure | ❌ | ✅ |

### Benefits
- ✅ URLs expire automatically
- ✅ Better access control
- ✅ Industry best practice
- ✅ Smaller database size
- ✅ Principle of least privilege

## Usage

### Upload (Tenant)
```typescript
// Stores path, not URL
const paths = await uploadPhotosToStorage(files);
// Returns: ["userId/photo.webp"]
```

### View (Coordinator/Admin)
```typescript
// Generate signed URL server-side
import { generateSignedUrl } from '@/lib/storage';

const url = await generateSignedUrl(path, 600); // 10 min
// Returns temporary URL that expires
```

## Migration

Apply migration to make bucket private:
```bash
supabase db push
```

## Files

1. `supabase/migrations/011_update_storage_rls_private_bucket.sql` - Migration
2. `lib/storage.ts` - Signed URL helper
3. `app/tenant/move-out/page.tsx` - Updated upload

## Result

✅ Significantly improved security  
✅ Production-ready  
✅ Minimal code changes
