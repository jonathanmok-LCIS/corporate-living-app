# Build Error Fix - Missing Components

## Problem

Build is failing with:
```
Module not found: Can't resolve '@/app/auth/actions'
Import trace:
  ./components/layout/DashboardNav.tsx
  ./app/dashboard/layout.tsx
```

## Root Cause

You have **old files on your local machine** that don't exist in the repository:
- ❌ `components/layout/DashboardNav.tsx` (doesn't exist in repo)
- ❌ `app/dashboard/layout.tsx` (doesn't exist in repo)
- ❌ `app/auth/actions.ts` (doesn't exist in repo)

These are leftover files from an old project structure.

Additionally:
- Your `package-lock.json` has local changes that conflict with the remote
- Git is warning about divergent branches

## Solution

### Option 1: Hard Reset (Recommended)

This will **discard all local changes** and match the remote repository exactly:

```bash
cd /Users/jwkmo/corporate-living-app

# Save work if you have any uncommitted changes you want to keep
git stash

# Reset to match remote exactly
git fetch origin
git reset --hard origin/copilot/add-move-out-intention-feature

# Remove old files that shouldn't exist
rm -rf components/layout
rm -rf app/dashboard
rm -rf app/auth

# Clean build
rm -rf .next node_modules
npm install
npm run build
```

### Option 2: Fresh Clone (Nuclear Option)

If Option 1 doesn't work, do a fresh clone:

```bash
cd /Users/jwkmo

# Backup current directory
mv corporate-living-app corporate-living-app.backup

# Fresh clone
git clone https://github.com/jonathanmok-LCIS/corporate-living-app.git
cd corporate-living-app

# Checkout feature branch
git checkout copilot/add-move-out-intention-feature

# Install and build
npm install
npm run build
```

## What These Files Were

The files causing the error are from an old authentication structure that no longer exists:

**Old Structure (deprecated):**
```
app/auth/
  actions.ts         ← Old auth actions
components/layout/
  DashboardNav.tsx   ← Old navigation component
app/dashboard/
  layout.tsx         ← Old dashboard layout
```

**Current Structure:**
```
app/login/
  page.tsx           ← Login page (current)
components/
  LogoutButton.tsx   ← Logout component (current)
lib/
  supabase-browser.ts  ← Client creation (current)
  supabase-server.ts   ← Server client (current)
```

## Verification

After running the fix, verify:

```bash
# Should show ONLY the feature branch commit
git log --oneline -1

# Should show "nothing to commit, working tree clean"
git status

# Should NOT exist
ls components/layout 2>/dev/null && echo "ERROR: Still exists!" || echo "OK: Doesn't exist"
ls app/dashboard 2>/dev/null && echo "ERROR: Still exists!" || echo "OK: Doesn't exist"
ls app/auth 2>/dev/null && echo "ERROR: Still exists!" || echo "OK: Doesn't exist"

# Build should succeed
npm run build
```

## Why This Happened

Based on the errors, you likely:
1. Had an older version of the project
2. Pulled new changes but old files remained
3. Git couldn't merge because of local changes to `package-lock.json`
4. Old component files are still present and trying to import non-existent files

## Need Help?

If the build still fails after trying both options:
1. Share the exact error message
2. Run: `git log --oneline -5` and share output
3. Run: `ls -la app/` and share output
4. Run: `ls -la components/` and share output
