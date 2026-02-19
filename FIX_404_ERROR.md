# 🔧 Fix: 404 Page Not Found Error

You're seeing **"404 - This page could not be found"** - let's fix it quickly!

## ⚡ Quick Fix (Most Common)

**After pulling new changes, you need to install dependencies and restart the dev server.**

```bash
# 1. Stop the current dev server (Ctrl+C in the terminal)
# Press Ctrl+C

# 2. Install dependencies (in case there are new ones)
npm install

# 3. Restart the dev server
npm run dev

# 4. Wait for "Ready in..." message
# ✓ Ready in 689ms

# 5. Try accessing the page again
# Open http://localhost:3000/admin/houses
```

**⚠️ IMPORTANT:** If this is your first time running the app after cloning/pulling, or if `npm run dev` fails with errors, you MUST run `npm install` first!

> **See IMMEDIATE_FIX_404.md for step-by-step troubleshooting if the above doesn't work.**

---

## 📍 What Page Are You Trying to Access?

### ✅ Available Pages

**Home & Auth:**
- `http://localhost:3000/` - Home page
- `http://localhost:3000/login` - Login page

**Admin Portal:**
- `http://localhost:3000/admin` - Admin dashboard
- `http://localhost:3000/admin/houses` - Houses list
- `http://localhost:3000/admin/houses/quick-setup` - ⚡ **NEW** Quick Setup wizard
- `http://localhost:3000/admin/houses/[id]/rooms` - Rooms for a house
- `http://localhost:3000/admin/houses/[id]/coordinators` - Coordinators for a house
- `http://localhost:3000/admin/tenancies` - Tenancies management

**Coordinator Portal:**
- `http://localhost:3000/coordinator` - Coordinator dashboard
- `http://localhost:3000/coordinator/inspections` - Inspections list
- `http://localhost:3000/coordinator/inspections/[id]` - Inspection details

**Tenant Portal:**
- `http://localhost:3000/tenant` - Tenant dashboard
- `http://localhost:3000/tenant/move-out` - Move-out intention form
- `http://localhost:3000/tenant/move-in` - Move-in signature

---

## 🔍 Common Causes & Solutions

### 1. Dev Server Needs Restart

**Symptom:** Trying to access `/admin/houses/quick-setup` and getting 404

**Why:** New pages require dev server restart to be recognized

**Fix:**
```bash
# Stop server (Ctrl+C)
# Restart server
npm run dev
```

### 2. Not on the Right Branch

**Symptom:** New features missing (like Quick Setup)

**Why:** You're on `main` branch, new features are on feature branch

**Check:**
```bash
git branch
# Should show: * copilot/add-move-out-intention-feature
```

**Fix:**
```bash
git checkout copilot/add-move-out-intention-feature
npm run dev
```

### 3. Haven't Pulled Latest Changes

**Symptom:** Features you just read about don't work

**Why:** Local repository is outdated

**Fix:**
```bash
git pull
npm run dev
```

### 4. Wrong URL

**Symptom:** 404 on specific pages

**Why:** Typo in URL or page doesn't exist

**Fix:**
- Double-check URL spelling
- Use URLs from "Available Pages" list above
- Don't add trailing slashes
- Use correct casing (all lowercase)

### 5. Dynamic Routes Need IDs

**Symptom:** 404 on routes like `/admin/houses/[id]/rooms`

**Why:** `[id]` is a placeholder - you need an actual house ID

**Fix:**
```bash
# Wrong:
http://localhost:3000/admin/houses/[id]/rooms

# Correct (with actual UUID):
http://localhost:3000/admin/houses/123e4567-e89b-12d3-a456-426614174000/rooms
```

**How to get IDs:**
1. Go to `/admin/houses` first
2. Click on a house to see its rooms
3. The URL will have the actual ID

---

## ✅ Verification Steps

After applying the fix, verify:

1. **Dev server is running:**
   ```bash
   # Should see this in terminal:
   ▲ Next.js 16.1.6 (Turbopack)
   - Local: http://localhost:3000
   ✓ Ready in XXXms
   ```

2. **Home page works:**
   - Navigate to `http://localhost:3000/`
   - Should see the home page, not 404

3. **Admin pages work:**
   - Navigate to `http://localhost:3000/admin`
   - Should see admin dashboard

4. **Quick Setup works:**
   - Navigate to `http://localhost:3000/admin/houses/quick-setup`
   - Should see the Quick Setup wizard (3 steps)

---

## 🎯 Most Likely Issue for Quick Setup

If you're trying to access the new **Quick Setup** feature:

**Problem:** Getting 404 on `/admin/houses/quick-setup`

**Solution:**
```bash
# 1. Make sure you're on the feature branch
git checkout copilot/add-move-out-intention-feature

# 2. Pull latest changes (if needed)
git pull

# 3. Restart dev server
# Stop with Ctrl+C
npm run dev

# 4. Access Quick Setup
# Navigate to: http://localhost:3000/admin/houses
# Click the "⚡ Quick Setup" button
# OR directly: http://localhost:3000/admin/houses/quick-setup
```

---

## 📊 Debug Information

If the issue persists, check these:

### Check Next.js Build
```bash
npm run build
# Look for errors in the build output
```

### Check File Exists
```bash
ls -la app/admin/houses/quick-setup/
# Should show: page.tsx
```

### Check Terminal for Errors
Look in the terminal where `npm run dev` is running for:
- Compilation errors
- Module not found errors
- TypeScript errors

### Clear Next.js Cache
```bash
# Stop dev server
rm -rf .next
npm run dev
```

---

## 🆘 Still Getting 404?

**Try these steps in order:**

1. **Full restart:**
   ```bash
   # Stop dev server (Ctrl+C)
   rm -rf .next
   npm run dev
   ```

2. **Verify branch and files:**
   ```bash
   git status
   git branch
   ls app/admin/houses/quick-setup/page.tsx
   ```

3. **Check for port conflicts:**
   ```bash
   # Make sure port 3000 isn't used by another app
   lsof -i :3000
   # If something else is running, kill it or use different port:
   PORT=3001 npm run dev
   ```

4. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

---

## 📖 Related Documentation

- **TROUBLESHOOTING.md** - General troubleshooting
- **YOUR_COMPLETE_JOURNEY.md** - Your setup journey
- **ANSWER_BETTER_WAY.md** - About the Quick Setup feature
- **HOUSE_ROOM_SETUP_GUIDE.md** - How to use Quick Setup

---

## ✅ Success Indicators

You'll know it's fixed when:
- ✅ Home page loads without 404
- ✅ `/admin` page loads without 404
- ✅ `/admin/houses` page loads and shows Quick Setup button
- ✅ `/admin/houses/quick-setup` loads and shows 3-step wizard
- ✅ No errors in terminal

---

## 💡 Pro Tip

**Bookmark these for quick access:**
- Admin Houses: `http://localhost:3000/admin/houses`
- Quick Setup: `http://localhost:3000/admin/houses/quick-setup`

**Or access Quick Setup from:**
1. Navigate to `/admin/houses`
2. Click the green "⚡ Quick Setup" button at the top

---

**Most likely solution:** Restart your dev server with `npm run dev`! 🚀
