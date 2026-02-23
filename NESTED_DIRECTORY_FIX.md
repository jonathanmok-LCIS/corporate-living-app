# Fix Nested Directory Structure

## The Problem

Your build error shows a **nested directory structure**:

```
./corporate-living-app/corporate-living-app/app/auth/actions.ts
                        ^^^^^^^^^^^^^^^^^^^^
                        This is DUPLICATED
```

This means you have:
```
/Users/jwkmo/corporate-living-app/
  └── corporate-living-app/    ← Nested duplicate!
       └── app/
           └── auth/
               └── actions.ts  ← Old file here
```

## Why This Happened

This typically happens when:
1. You cloned the repo into a folder named `corporate-living-app`
2. Then cloned again or moved files, creating another `corporate-living-app` inside it
3. Now you have `/Users/jwkmo/corporate-living-app/corporate-living-app/`

## The Fix

### Option 1: Automated Script (Recommended)

```bash
cd /Users/jwkmo/corporate-living-app
./FIX_NESTED_DIRECTORY.sh
```

The script will:
1. Detect the nested structure
2. Ask for your confirmation
3. Fix it automatically
4. Remove old files
5. Rebuild

### Option 2: Manual Fix

```bash
cd /Users/jwkmo/corporate-living-app

# Check if nested directory exists
ls -la | grep corporate-living-app

# If you see a corporate-living-app subdirectory:

# Move everything from nested directory up
mv corporate-living-app/* .
mv corporate-living-app/.[!.]* .

# Remove the empty nested directory
rm -rf corporate-living-app

# Remove old files
rm -rf app/auth app/dashboard components/layout utils/supabase

# Clean rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Option 3: Fresh Start

If the above doesn't work, start completely fresh:

```bash
# Backup current directory
cd /Users/jwkmo
mv corporate-living-app corporate-living-app.backup

# Fresh clone
git clone https://github.com/jonathanmok-LCIS/corporate-living-app.git
cd corporate-living-app

# Checkout the correct branch
git checkout copilot/add-move-out-intention-feature

# Build
npm install
npm run build
```

## Verification

After fixing, verify your structure:

```bash
# You should be in ONE corporate-living-app directory
pwd
# Should show: /Users/jwkmo/corporate-living-app

# Should NOT have nested corporate-living-app
ls -la | grep corporate-living-app
# Should show nothing (or just show the directory you're in)

# Check for old files (none should exist)
ls app/auth 2>/dev/null && echo "ERROR: app/auth still exists" || echo "OK"
ls app/dashboard 2>/dev/null && echo "ERROR: app/dashboard still exists" || echo "OK"

# Build should work
npm run build
```

## What the Error Means

```
./corporate-living-app/corporate-living-app/app/auth/actions.ts
```

The path `corporate-living-app/corporate-living-app/` shows Next.js found files in a nested location. This is wrong because:

1. The repository structure should be flat: `/Users/jwkmo/corporate-living-app/app/...`
2. Not nested: `/Users/jwkmo/corporate-living-app/corporate-living-app/app/...`

## Need Help?

If none of these work, please share:

```bash
# Your current location
pwd

# Directory structure
ls -la

# Check for nested directory
find . -name "corporate-living-app" -type d

# Check for old files
find . -name "actions.ts" | grep -E "(auth|dashboard)"
```

This will help diagnose the exact issue.
