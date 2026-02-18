# Scripts Not Found - How to Fix

## Your Error

You're seeing this error when trying to run setup scripts:

```bash
zsh: no such file or directory: ./scripts/check-env.sh
zsh: no such file or directory: ./scripts/setup-env.sh
```

## Why This Happens

The most common reason is that **your local repository is outdated**. The scripts exist in the latest version of the repository, but you haven't pulled the recent changes yet.

## ✅ Quick Fix (2 minutes)

### Step 1: Update Your Repository

```bash
# Make sure you're in the project directory
cd corporate-living-app

# Pull the latest changes
git pull

# Alternative if you're on a different branch
git pull origin main
```

### Step 2: Verify Scripts Now Exist

```bash
# Check if scripts directory exists
ls -la scripts/

# Should show:
# check-env.sh
# setup-env.sh
```

### Step 3: Run the Scripts

```bash
# Now these should work:
./scripts/check-env.sh
./scripts/setup-env.sh
```

---

## 🔧 Alternative Solutions

If `git pull` doesn't work or you prefer not to use the scripts, here are alternatives:

### Option A: Manual Environment Setup (No Scripts Needed)

```bash
# 1. Copy the example file
cp .env.example .env.local

# 2. Edit the file with your credentials
# On Mac:
open .env.local

# On Linux:
nano .env.local
# or
vim .env.local

# 3. Replace these placeholders with your actual Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to get Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy the values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### Option B: One-Command Setup (If You Have Credentials Ready)

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

Replace the placeholder values with your actual credentials before running.

### Option C: Check Your Git Status

Sometimes Git might have issues. Try these commands:

```bash
# Check your current Git status
git status

# Check which branch you're on
git branch

# If you're not on main, switch to it
git checkout main
git pull

# If you have uncommitted changes, stash them first
git stash
git pull
git stash pop
```

---

## 🔍 Troubleshooting

### Issue: "Already up to date" but scripts still missing

**Solution:** The scripts might have been added to a different branch. Try:

```bash
# Fetch all changes
git fetch --all

# Check which branch has the scripts
git ls-tree -r --name-only origin/main | grep scripts

# If scripts are in a different branch:
git checkout <branch-name>
```

### Issue: "Permission denied" when running scripts

**Solution:** Make the scripts executable:

```bash
chmod +x scripts/check-env.sh
chmod +x scripts/setup-env.sh
```

### Issue: "I don't want to use Git"

**Solution:** Just follow **Option A** above (Manual Environment Setup). You don't need the scripts to set up the application - they're just convenience tools.

---

## 📋 Verification Checklist

After pulling changes, verify everything is ready:

```bash
# ✓ Check scripts exist
ls scripts/check-env.sh scripts/setup-env.sh

# ✓ Check scripts are executable
ls -l scripts/*.sh

# ✓ Try running check script
./scripts/check-env.sh

# ✓ If configuration is missing, run setup
./scripts/setup-env.sh
```

---

## 🎯 Next Steps

Once you've either:
- ✅ Pulled the latest changes and scripts are available, OR
- ✅ Manually created your `.env.local` file

You can proceed with:

```bash
# Install dependencies (if you haven't already)
npm install

# Start the development server
npm run dev
```

---

## 📚 Related Documentation

- **ENV_SETUP.md** - Complete guide to environment variables
- **QUICK_START.md** - 5-minute setup guide
- **TROUBLESHOOTING.md** - All common errors and solutions
- **CURRENT_ISSUE_SOLUTION.md** - Supabase configuration help

---

## 💡 Key Takeaway

**The scripts are just helpers!** You can always manually create your `.env.local` file by copying `.env.example` and filling in your Supabase credentials. The scripts just make this process easier with validation and interactive prompts.
