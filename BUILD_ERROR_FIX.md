# Build Error Fix Guide

## Problem

Build failing with error:
```
./corporate-living-app/app/auth/actions.ts:3:30
Type error: Cannot find module '@/utils/supabase/server'
```

## Root Cause

You have **outdated files** on your local machine that aren't in the repository. The error indicates:
1. An `app/auth/actions.ts` file exists on your machine (shouldn't exist)
2. It's trying to import from `@/utils/supabase/server` (old path, should be `@/lib/supabase-server`)
3. You may have a nested directory structure with duplicate package-lock.json files

## Quick Fix

Run these commands in your terminal:

```bash
# Step 1: Navigate to your project directory
cd /Users/jwkmo/corporate-living-app

# Step 2: Check if you have a nested structure
ls -la
# If you see another "corporate-living-app" folder inside, that's the problem

# Step 3: Clean build artifacts
rm -rf .next
rm -rf node_modules

# Step 4: Remove the problematic auth directory
rm -rf app/auth

# Step 5: Ensure you're on the correct branch
git status
git checkout copilot/add-move-out-intention-feature

# Step 6: Stash any local changes (if needed)
git stash

# Step 7: Pull latest changes from remote
git pull origin copilot/add-move-out-intention-feature

# Step 8: Reinstall dependencies
npm install

# Step 9: Try building again
npm run build
```

## If Still Failing - Nuclear Option

If the quick fix doesn't work, do a fresh clone:

```bash
# Navigate to parent directory
cd /Users/jwkmo

# Backup your current directory (just in case)
mv corporate-living-app corporate-living-app-backup

# Fresh clone
git clone https://github.com/jonathanmok-LCIS/corporate-living-app.git
cd corporate-living-app

# Checkout the feature branch
git checkout copilot/add-move-out-intention-feature

# Install dependencies
npm install

# Build
npm run build
```

## Correct File Structure

Your project should look like this:

```
corporate-living-app/
├── app/
│   ├── admin/
│   ├── api/
│   ├── coordinator/
│   ├── dev/
│   ├── login/
│   ├── tenant/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── imageCompression.ts
│   ├── storage.ts
│   ├── supabase-browser.ts  ← Correct location for browser client
│   ├── supabase-server.ts   ← Correct location for server client
│   ├── supabase.ts
│   └── types.ts
├── supabase/
│   └── migrations/
├── package.json
├── package-lock.json  ← Only ONE package-lock.json
├── tsconfig.json
└── next.config.ts
```

**Should NOT exist:**
- ❌ `app/auth/` directory
- ❌ `utils/` directory
- ❌ Nested `corporate-living-app/corporate-living-app/` structure
- ❌ Multiple `package-lock.json` files

## Correct Import Paths

All imports should use these paths:

**For browser/client components:**
```typescript
import { createClient } from '@/lib/supabase-browser';
```

**For server actions:**
```typescript
import { createClient } from '@/lib/supabase-server';
```

**For admin/service role operations:**
```typescript
import { getAdminClient } from '@/lib/supabase-server';
```

## Verification

After fixing, verify everything is correct:

```bash
# 1. Check you're in the right directory
pwd
# Should output: /Users/jwkmo/corporate-living-app (not nested)

# 2. Verify no auth directory
ls app/
# Should NOT show "auth"

# 3. Verify correct lib structure
ls lib/
# Should show: supabase-browser.ts, supabase-server.ts

# 4. Count package-lock.json files (should be only 1)
find . -name "package-lock.json" | wc -l
# Should output: 1

# 5. Try building
npm run build
# Should succeed without errors
```

## What Happened

Based on the warning message about multiple lockfiles, it appears you may have accidentally created a nested directory structure at some point, possibly by cloning the repo inside an existing repo folder. This created:

```
/Users/jwkmo/corporate-living-app/
  └── corporate-living-app/  ← Nested (wrong)
      ├── app/
      ├── package-lock.json
      └── ...
```

The old structure also had different file organization with `utils/supabase/` instead of `lib/supabase-*`. The current repository uses the correct structure with `lib/supabase-browser.ts` and `lib/supabase-server.ts`.

## Need Help?

If you're still experiencing issues:

1. Share the output of:
   ```bash
   pwd
   ls -la
   git status
   git branch
   ```

2. Share the full build error message

3. Verify you're working with the latest code from the feature branch
