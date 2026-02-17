# ✅ Solution: "Could not read package.json" Error

## Your Exact Error

```
jwkmo@Mac ~ % npm run dev
npm error code ENOENT
npm error syscall open
npm error path /Users/jwkmo/package.json
npm error errno -2
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/Users/jwkmo/package.json'
```

## 🎯 The Problem

You're running `npm run dev` from your **home directory** (`/Users/jwkmo/`) instead of the **project directory** (`/Users/jwkmo/corporate-living-app/`).

Look at the prompt in your terminal:
```
jwkmo@Mac ~ %           ← The "~" means you're in your home directory
```

## ✅ The Solution

### Step 1: Navigate to the Project Directory

```bash
cd corporate-living-app
```

After running this, your prompt should change to:
```
jwkmo@Mac corporate-living-app %    ← Now you're in the project directory!
```

### Step 2: Verify You're in the Right Place

```bash
ls package.json
```

You should see:
```
package.json
```

If you see "No such file or directory", you're still in the wrong place.

### Step 3: Now Run Your Command

```bash
npm run dev
```

This will now work! ✅

## 📋 Complete Step-by-Step Fix

Here's exactly what to type in your terminal:

```bash
# 1. Navigate to the project
cd corporate-living-app

# 2. Verify you're in the right place
pwd
# Should show: /Users/jwkmo/corporate-living-app

# 3. Check for package.json
ls package.json
# Should show: package.json

# 4. Install dependencies (if you haven't already)
npm install

# 5. Start the development server
npm run dev
```

## 🎓 Understanding the Issue

### Your Home Directory (~)
```
/Users/jwkmo/
├── Desktop/
├── Documents/
├── Downloads/
└── corporate-living-app/    ← Your project is IN a subfolder
```

When you run `npm run dev` from `/Users/jwkmo/`, npm looks for:
```
/Users/jwkmo/package.json    ← Doesn't exist here! ❌
```

### Your Project Directory
```
/Users/jwkmo/corporate-living-app/
├── package.json             ← This is where it should look! ✅
├── app/
├── supabase/
└── ... (other files)
```

When you run `npm run dev` from `/Users/jwkmo/corporate-living-app/`, npm looks for:
```
/Users/jwkmo/corporate-living-app/package.json    ← Found it! ✅
```

## 🚀 Quick Reference

Every time you open a new terminal window:

```bash
# Always start by navigating to the project
cd corporate-living-app

# Then run your npm commands
npm run dev
npm install
npm run build
# etc.
```

## 📚 Need More Help?

- **[QUICK_START.md](./QUICK_START.md)** - 5-minute setup guide
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common errors and solutions
- **[README.md](./README.md)** - Complete documentation

## ✅ Success!

Once you're in the right directory and run `npm run dev`, you should see:

```
> corporate-living-app@0.1.0 dev
> next dev

  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000

✓ Starting...
✓ Ready in 2.5s
```

Then visit **http://localhost:3000** in your browser!

---

**Remember:** The golden rule is to always `cd corporate-living-app` first! 🎯
