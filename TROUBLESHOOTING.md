# 🔧 Troubleshooting Guide

This guide helps you solve common issues when setting up and running the Corporate Living App.

## 🎯 Most Common Issues

| # | Error | Quick Fix | Full Guide |
|---|-------|-----------|------------|
| 0 | **"Scripts not found"** (./scripts/*.sh) | `git pull` | [SCRIPTS_NOT_FOUND.md](./SCRIPTS_NOT_FOUND.md) |
| 1 | "Your project's URL and Key are required" | `cp .env.example .env.local` + edit with credentials | [SUPABASE_ERROR_FIX.md](./SUPABASE_ERROR_FIX.md) |
| 2 | "Could not read package.json" | `cd corporate-living-app` | [ERROR_SOLUTION.md](./ERROR_SOLUTION.md) |
| 3 | "Module not found" | `npm install` | See below |
| 4 | "Port 3000 already in use" | `lsof -ti:3000 \| xargs kill` | See below |

## 📍 Quick Diagnosis

**Before troubleshooting, make sure you're in the right directory!**

```bash
# Check where you are
pwd

# You should see something like:
# /Users/yourname/corporate-living-app
# or
# /home/yourname/corporate-living-app

# If you see just your home directory (/Users/yourname or /home/yourname),
# you need to navigate to the project:
cd corporate-living-app
```

---

## 🚨 Common Error #0: Scripts Not Found

### Error Message
```bash
zsh: no such file or directory: ./scripts/check-env.sh
zsh: no such file or directory: ./scripts/setup-env.sh
```

### What This Means
Your local repository doesn't have the latest changes. The setup scripts were added in recent commits.

### Quick Fix
```bash
# Update your repository
git pull

# Verify scripts now exist
ls scripts/
```

### If git pull doesn't work
See the complete guide: **[SCRIPTS_NOT_FOUND.md](./SCRIPTS_NOT_FOUND.md)**

**Alternative:** You don't need the scripts! Just manually create your `.env.local`:
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

---

## 🚨 Common Error #1: "Your project's URL and Key are required"

### Error Message
```
⨯ Error: Your project's URL and Key are required to create a Supabase client!
Check your Supabase project's API settings to find these values
https://supabase.com/dashboard/project/_/settings/api
```

### Why This Happens
Your Supabase credentials are not configured. You need a `.env.local` file with your credentials.

### ✅ Solution

**Quick Fix:**
```bash
# Option 1: Interactive setup (recommended)
./scripts/setup-env.sh

# Option 2: Manual setup
cp .env.example .env.local
# Then edit .env.local with your actual Supabase credentials

# Option 3: Verify your configuration
./scripts/check-env.sh
```

**📖 Detailed Instructions:** See [SUPABASE_ERROR_FIX.md](./SUPABASE_ERROR_FIX.md)

---

## 🚨 Common Error #2: "Could not read package.json"

### Error Message
```
npm error code ENOENT
npm error syscall open
npm error path /Users/yourname/package.json
npm error errno -2
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory
```

### Why This Happens
You're running npm commands from your home directory instead of the project directory.

### ✅ Solution

**Step 1:** Check where you are
```bash
pwd
# Output shows: /Users/yourname (WRONG - this is your home directory)
```

**Step 2:** Navigate to the project directory
```bash
cd corporate-living-app
```

**Step 3:** Verify you're in the right place
```bash
pwd
# Output should show: /Users/yourname/corporate-living-app (CORRECT!)

# Double-check by listing files
ls
# You should see: package.json, app/, supabase/, etc.
```

**Step 4:** Now run your command
```bash
npm install
# or
npm run dev
```

**📖 Full Solution:** See [ERROR_SOLUTION.md](./ERROR_SOLUTION.md)

### 💡 Pro Tip
Always make sure you see `package.json` when you run `ls`:
```bash
ls package.json
# Should show: package.json (not an error)
```

---

## 🚨 Common Error #3: "Module not found" or "Cannot find module"

### Error Message
```
Error: Cannot find module 'next' or similar
Module not found: Can't resolve '@/lib/...'
```

### Why This Happens
Dependencies are not installed.

### ✅ Solution

```bash
# Make sure you're in the project directory first!
cd corporate-living-app

# Install all dependencies
npm install

# Wait for it to complete (may take 1-2 minutes)
# You should see a message about packages being added
```

If the error persists:
```bash
# Try cleaning and reinstalling
rm -rf node_modules package-lock.json
npm install
```

---

## 🚨 Common Error #4: "Port 3000 already in use"

### Error Message
```
Error: listen EADDRINUSE: address already in use :::3000
```

### Why This Happens
Another application is already using port 3000 (possibly a previous instance of this app).

### ✅ Solution

**Option 1: Kill the process using port 3000**
```bash
# On Mac/Linux
lsof -ti:3000 | xargs kill -9

# On Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

**Option 2: Use a different port**
```bash
# Start on port 3001 instead
PORT=3001 npm run dev
```

---

## 🚨 Common Error #5: Database/Authentication Errors

### Error Messages
```
Error: relation "profiles" does not exist
Error: authentication failed
Error: Invalid JWT
```

### Why This Happens
Database migrations haven't been run, or Supabase credentials are incorrect.

### ✅ Solution

**Step 1: Verify your Supabase credentials**
```bash
# Check your .env.local file
cat .env.local

# Make sure the URL and keys are correct
# Go to Supabase Dashboard → Settings → API to verify
```

**Step 2: Run database migrations**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy content from `supabase/migrations/001_initial_schema.sql`
4. Paste and run it
5. Repeat for `002_rls_policies.sql`

See [SETUP.md](./SETUP.md) for detailed migration instructions.

---

## 🚨 Common Error #6: "Permission denied" when running scripts

### Error Message
```
bash: ./scripts/setup-env.sh: Permission denied
```

### Why This Happens
The script doesn't have execute permissions.

### ✅ Solution

```bash
# Give the script execute permission
chmod +x scripts/setup-env.sh

# Now run it
./scripts/setup-env.sh
```

Or run it with bash directly:
```bash
bash scripts/setup-env.sh
```

---

## 🚨 Common Error #7: Build Errors

### Error Messages
```
Type error: ...
Error: Failed to compile
```

### Why This Happens
TypeScript compilation errors or incorrect dependencies.

### ✅ Solution

**Step 1: Make sure dependencies are installed**
```bash
npm install
```

**Step 2: Check Node.js version**
```bash
node --version
# Should be v18 or higher

# If lower, update Node.js:
# Download from https://nodejs.org/
```

**Step 3: Clear Next.js cache**
```bash
rm -rf .next
npm run build
```

---

## 📋 Quick Checklist for Fresh Start

If you're having multiple issues, start fresh:

```bash
# 1. Navigate to project directory
cd /path/to/corporate-living-app

# 2. Verify you're in the right place
ls package.json  # Should show package.json

# 3. Clean install
rm -rf node_modules package-lock.json .next
npm install

# 4. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 5. Start development server
npm run dev
```

---

## 🆘 Still Having Issues?

### Check These:

1. **Are you in the project directory?**
   ```bash
   pwd
   ls package.json  # Should not show an error
   ```

2. **Is Node.js installed and up to date?**
   ```bash
   node --version  # Should be v18 or higher
   npm --version   # Should be 9 or higher
   ```

3. **Are environment variables set?**
   ```bash
   cat .env.local  # Should show your Supabase credentials
   ```

4. **Are dependencies installed?**
   ```bash
   ls node_modules  # Should show many folders
   ```

5. **Is Supabase configured correctly?**
   - Check your Supabase Dashboard
   - Verify the project URL and API keys
   - Ensure RLS policies are enabled

### Common Mistakes to Avoid

❌ Running commands from home directory  
❌ Forgetting to run `npm install`  
❌ Using placeholder values in .env.local  
❌ Not running database migrations  
❌ Using the wrong Supabase project credentials  

✅ Always `cd corporate-living-app` first  
✅ Run `npm install` after cloning  
✅ Use actual Supabase values in .env.local  
✅ Run migrations in Supabase SQL Editor  
✅ Double-check credentials match your project  

---

## 📚 Helpful Resources

- **[ENV_SETUP.md](./ENV_SETUP.md)** - Detailed environment variables guide
- **[SETUP.md](./SETUP.md)** - Complete setup instructions
- **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Step-by-step implementation guide
- **[WHATS_NEXT.md](./WHATS_NEXT.md)** - Quick reference

---

## 💬 Getting More Help

If you've tried everything above and still have issues:

1. **Check the error message carefully** - The exact error often tells you what's wrong
2. **Google the error message** - Many npm/Next.js errors are well-documented
3. **Check Supabase logs** - Dashboard → Logs may show what's failing
4. **Review the documentation** - All setup guides are in the repo

---

**Remember:** 99% of setup issues are solved by:
1. Being in the correct directory (`cd corporate-living-app`)
2. Installing dependencies (`npm install`)
3. Setting up environment variables correctly (`.env.local`)

Good luck! 🚀
