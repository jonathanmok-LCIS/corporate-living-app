# 🔧 Fix: Branch Switch Blocked by Uncommitted Changes

You're getting 404 errors because you're on the `main` branch, but the Quick Setup feature only exists on the `copilot/add-move-out-intention-feature` branch. Additionally, you have uncommitted changes that are preventing you from switching branches.

## ⚡ The Quick Fix (Choose One)

### Solution 1: Stash Changes (✅ RECOMMENDED - Safest)

```bash
# Save your changes temporarily
git stash

# Switch to the feature branch
git checkout copilot/add-move-out-intention-feature

# Install dependencies
npm install

# Start the dev server
npm run dev

# ✅ Quick Setup should now work at /admin/houses/quick-setup
```

**Later, if you want your changes back:**
```bash
git stash pop
```

---

### Solution 2: Discard Changes (If you don't need them)

```bash
# Remove your changes permanently
git reset --hard HEAD

# Switch to the feature branch
git checkout copilot/add-move-out-intention-feature

# Install dependencies
npm install

# Start the dev server
npm run dev

# ✅ Quick Setup should now work
```

---

### Solution 3: Commit Changes (If you want to keep them)

```bash
# Save your changes in main branch
git add package.json package-lock.json
git commit -m "Update dependencies"

# Switch to the feature branch
git checkout copilot/add-move-out-intention-feature

# Install dependencies
npm install

# Start the dev server
npm run dev

# ✅ Quick Setup should now work
```

---

## ✅ Verification

After switching branches, verify everything:

```bash
# 1. Check you're on the right branch
git branch --show-current
# Should show: copilot/add-move-out-intention-feature

# 2. Verify files exist
ls -la app/admin/houses/quick-setup/page.tsx
ls -la app/admin/houses/page.tsx
# Both should exist

# 3. Start server
npm run dev
# Should start without "multiple lockfiles" warning

# 4. Open in browser
# http://localhost:3000/admin/houses/quick-setup
# Should load the Quick Setup wizard!
```

---

## 🎯 Understanding the Problem

### Why am I getting 404 errors?

You're on the `main` branch, which has the old code structure. The Quick Setup feature (and the new `/admin/houses` pages) only exist on the `copilot/add-move-out-intention-feature` branch.

When you try to access `/admin/houses/quick-setup`, Next.js can't find the file because it literally doesn't exist on main:

```bash
# On main branch:
ls app/admin/houses/quick-setup/page.tsx
# No such file or directory ❌

# On copilot/add-move-out-intention-feature branch:
ls app/admin/houses/quick-setup/page.tsx
# File exists! ✅
```

### Why can't I switch branches?

Git is protecting your uncommitted changes. You modified `package.json` and `package-lock.json` (probably from running `npm install @supabase/supabase-js dotenv`), and Git won't let you switch branches because the switch would overwrite these files.

Error you're seeing:
```
error: Your local changes to the following files would be overwritten by checkout:
package-lock.json
package.json
Please commit your changes or stash them before you switch branches.
```

### What are these changes?

When you ran `npm install @supabase/supabase-js dotenv`, npm:
1. Added these packages to `package.json` dependencies
2. Updated `package-lock.json` with the new package versions

These are legitimate changes, but they're uncommitted, so Git won't let you switch branches.

---

## 📊 Solution Comparison

| Method | Keeps Changes | Reversible | Time | Best For |
|--------|---------------|------------|------|----------|
| **Stash** | ✅ Yes (saved for later) | ✅ Yes | 2 min | When unsure |
| **Discard** | ❌ No (permanently lost) | ❌ No | 1 min | Don't need changes |
| **Commit** | ✅ Yes (in main branch) | ⚠️ Sort of | 2 min | Want to keep |

**Recommendation:** Use **Stash** (Solution 1) - it's the safest option if you're not sure whether you need the changes.

---

## 🔍 Step-by-Step: Solution 1 (Stash) Detailed

### Step 1: Save Your Changes
```bash
git stash
```

Expected output:
```
Saved working directory and index state WIP on main: <commit message>
```

What this does: Temporarily saves your changes and reverts files to last commit state.

### Step 2: Switch to Feature Branch
```bash
git checkout copilot/add-move-out-intention-feature
```

Expected output:
```
Switched to branch 'copilot/add-move-out-intention-feature'
Your branch is up to date with 'origin/copilot/add-move-out-intention-feature'.
```

What this does: Changes your working directory to the feature branch code.

### Step 3: Install Dependencies
```bash
npm install
```

Expected output:
```
up to date, audited 382 packages in 1s
```

What this does: Ensures all dependencies from feature branch are installed.

### Step 4: Start Dev Server
```bash
npm run dev
```

Expected output:
```
▲ Next.js 16.1.6 (Turbopack)
- Local:        http://localhost:3000
✓ Ready in XXXms
```

Note: You should NOT see the "multiple lockfiles" warning anymore!

### Step 5: Test Quick Setup
Open in browser:
- http://localhost:3000/admin/houses/quick-setup

You should see the Quick Setup wizard! ✅

### Optional: Restore Changes Later
If you want your package changes back:
```bash
git stash pop
```

This will restore your changes. You can do this now or later.

---

## 🆘 Troubleshooting

### Still getting 404 after switching?

**Check your branch:**
```bash
git branch --show-current
```

Should show: `copilot/add-move-out-intention-feature`

If it shows `main`, the branch switch didn't work. Try again.

### Files still don't exist?

```bash
# Pull latest from remote
git pull origin copilot/add-move-out-intention-feature

# Reinstall
npm install

# Restart
npm run dev
```

### Still seeing "multiple lockfiles" warning?

This is a different issue - you're running from the wrong directory level. See `WRONG_DIRECTORY_FIX.md` for that fix.

### Want to see what's in your stash?

```bash
git stash list
```

Shows all stashed changes.

### Want to get stashed changes back?

```bash
git stash pop
```

Restores most recent stash.

### Made a mistake and want to go back to main?

```bash
git checkout main
```

Your stashed changes are still safe!

---

## 💡 Prevention Tips

### Before Switching Branches

1. Check for uncommitted changes:
   ```bash
   git status
   ```

2. Decide what to do with them:
   - Keep them? → `git commit`
   - Save for later? → `git stash`
   - Don't need them? → `git reset --hard HEAD`

3. Then switch branches

### After Switching Branches

1. Always run `npm install`
2. Clear cache if needed: `rm -rf .next`
3. Restart dev server

### Best Practice

- Keep your branches clean
- Commit changes regularly
- Use feature branches for new work
- Don't mix main and feature branch changes

---

## 📚 Related Documentation

**After you fix this:**
- **YOUR_404_IS_FIXED.md** - Celebrate and move forward
- **ANSWER_BETTER_WAY.md** - Learn about Quick Setup
- **HOUSE_ROOM_SETUP_GUIDE.md** - How to use the feature

**If you still have issues:**
- **WRONG_DIRECTORY_FIX.md** - If you're in the parent directory
- **START_HERE_404.md** - General 404 troubleshooting
- **TROUBLESHOOTING.md** - All common issues

---

## 🎉 Expected Outcome

After following this guide, you should have:

- ✅ Successfully switched to `copilot/add-move-out-intention-feature` branch
- ✅ Handled your uncommitted changes (stashed/discarded/committed)
- ✅ Files exist: `app/admin/houses/page.tsx` and `quick-setup/page.tsx`
- ✅ Quick Setup wizard loads at `/admin/houses/quick-setup`
- ✅ No more 404 errors
- ✅ Ready to create houses and rooms efficiently!

---

**Status:** Ready to fix! Choose Solution 1 (Stash) if unsure - it's the safest option.
