# 🚀 Quick Start Guide

**Get the Corporate Living App running in 5 minutes!**

---

## ⚠️ IMPORTANT: Always Be in the Project Directory!

**Before running ANY command, make sure you're in the right place:**

```bash
# Check where you are
pwd

# Should show something like:
# /Users/yourname/corporate-living-app   ✅ GOOD
#
# NOT:
# /Users/yourname                         ❌ WRONG - This is your home directory!
```

**If you're in the wrong place:**
```bash
cd corporate-living-app
```

---

## 📋 5-Minute Setup

### Step 1: Navigate to Project Directory (CRITICAL!)

```bash
# After cloning or downloading, navigate into the folder
cd corporate-living-app

# Verify you're in the right place
ls package.json
# Should show: package.json (not an error)
```

### Step 2: Install Dependencies

```bash
npm install
```

Wait 1-2 minutes for packages to install.

### Step 3: Set Up Environment Variables

**Option A: Interactive Setup (Easiest)**
```bash
./scripts/setup-env.sh
```

**Option B: Manual Setup**
```bash
# Copy the template
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# Get them from: https://app.supabase.com → Your Project → Settings → API
```

### Step 4: Run the App

```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 🎯 Complete First-Time Setup

```bash
# 1️⃣ Navigate to project (MOST IMPORTANT STEP!)
cd corporate-living-app

# 2️⃣ Verify you're in the right place
pwd
ls package.json

# 3️⃣ Install dependencies
npm install

# 4️⃣ Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 5️⃣ Run the app
npm run dev

# 6️⃣ Open browser
# Visit: http://localhost:3000
```

---

## 🚨 Common Mistake: Wrong Directory

### ❌ WRONG - Running from Home Directory
```bash
jwkmo@Mac ~ % pwd
/Users/jwkmo                          # ← Your home directory

jwkmo@Mac ~ % npm run dev             # ← This will FAIL
npm error enoent Could not read package.json
```

### ✅ CORRECT - Running from Project Directory
```bash
jwkmo@Mac ~ % cd corporate-living-app # ← Navigate to project first

jwkmo@Mac corporate-living-app % pwd
/Users/jwkmo/corporate-living-app     # ← Project directory

jwkmo@Mac corporate-living-app % npm run dev  # ← This will WORK
```

---

## 🛠️ Available Commands

**All commands must be run from the project directory!**

```bash
# Always start here:
cd corporate-living-app

# Development server
npm run dev          # Start app at http://localhost:3000

# Production build
npm run build        # Build for production
npm start            # Run production server

# Code quality
npm run lint         # Check code quality
```

---

## 📁 What Should I See?

When in the **correct directory**, running `ls` shows:

```
README.md
package.json         ← This file must be here!
package-lock.json
app/
lib/
supabase/
.env.example
.gitignore
... (more files and folders)
```

When in the **wrong directory** (home), running `ls` shows:
```
Desktop/
Documents/
Downloads/
... (your personal folders - NO package.json)
```

---

## 🆘 Having Issues?

### Check This First:
```bash
# Where am I?
pwd

# Do I see package.json?
ls package.json

# Did I install dependencies?
ls node_modules
```

### Common Issues & Quick Fixes:

| Error | Fix |
|-------|-----|
| "Could not read package.json" | `cd corporate-living-app` |
| "Module not found" | `npm install` |
| "Supabase is not configured" | Set up `.env.local` |
| "Port 3000 in use" | `lsof -ti:3000 \| xargs kill -9` |

**For detailed troubleshooting:** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 🎓 Visual Directory Guide

```
📂 Your Computer
│
├── 📁 Users/
│   └── 📁 yourname/              ← HOME DIRECTORY (don't run npm here!)
│       │
│       ├── 📁 Desktop/
│       ├── 📁 Documents/
│       └── 📁 corporate-living-app/   ← PROJECT DIRECTORY (run npm here!)
│           │
│           ├── 📄 package.json        ← Must see this file!
│           ├── 📄 README.md
│           ├── 📁 app/
│           ├── 📁 supabase/
│           └── ... (other files)
```

**Always navigate INTO the corporate-living-app folder before running commands!**

---

## ✅ Success Checklist

Before starting development, verify:

- [ ] I'm in the project directory (`cd corporate-living-app`)
- [ ] I can see `package.json` when I run `ls`
- [ ] Dependencies are installed (`node_modules` folder exists)
- [ ] Environment variables are set (`.env.local` file exists with real values)
- [ ] App starts without errors (`npm run dev` works)
- [ ] Browser shows the app at http://localhost:3000

---

## 📚 Next Steps

Once the app is running:

1. **Set up the database:** See [SETUP.md](./SETUP.md) for running migrations
2. **Configure Supabase:** See [ENV_SETUP.md](./ENV_SETUP.md) for detailed env setup
3. **Start developing:** See [NEXT_STEPS.md](./NEXT_STEPS.md) for what to do next

---

## 💡 Remember

**The Golden Rule:** Always `cd corporate-living-app` before running any npm command!

```bash
# Every time you open a new terminal:
cd corporate-living-app   # ← Do this FIRST
npm run dev              # ← Then run your commands
```

Happy coding! 🎉
