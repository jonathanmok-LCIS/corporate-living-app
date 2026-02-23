# Quick Build Fix

## The Problem

You're getting this error:
```
./corporate-living-app/app/auth/actions.ts:3:30
Type error: Cannot find module '@/utils/supabase/server'
```

## The Solution (Run These Commands)

```bash
# Go to your project directory
cd /Users/jwkmo/corporate-living-app

# Clean everything
rm -rf .next node_modules app/auth

# Get latest code
git checkout copilot/add-move-out-intention-feature
git pull origin copilot/add-move-out-intention-feature

# Rebuild
npm install
npm run build
```

## Why?

You have **outdated files** on your local machine that aren't in the repository:
- ❌ `app/auth/` directory (shouldn't exist)
- ❌ Old import paths using `@/utils/supabase/server` (should be `@/lib/supabase-server`)

The repository is clean and correct. You just need to sync your local files.

## If That Doesn't Work

Do a fresh clone:

```bash
cd /Users/jwkmo
mv corporate-living-app corporate-living-app-backup
git clone https://github.com/jonathanmok-LCIS/corporate-living-app.git
cd corporate-living-app
git checkout copilot/add-move-out-intention-feature
npm install
npm run build
```

## Need More Details?

See `BUILD_ERROR_FIX.md` for the complete guide with explanations and troubleshooting.
