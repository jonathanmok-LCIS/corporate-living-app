# ✅ SOLVED: Scripts Not Found Issue

## Your Error

You tried to run the setup scripts but got this error:

```bash
jwkmo@Mac corporate-living-app % ./scripts/check-env.sh
zsh: no such file or directory: ./scripts/check-env.sh
jwkmo@Mac corporate-living-app % ./scripts/setup-env.sh
zsh: no such file or directory: ./scripts/setup-env.sh
```

## 🎯 The Problem

Your local copy of the repository **doesn't have the latest changes**. The setup scripts were added in recent commits, but you haven't pulled them yet.

## ✅ The Solution (Choose One)

### Solution 1: Update Your Repository (Recommended - 30 seconds)

This will get you the latest scripts and all recent improvements:

```bash
# Make sure you're in the project directory
cd corporate-living-app

# Pull the latest changes
git pull

# Now the scripts will work:
./scripts/check-env.sh
./scripts/setup-env.sh
```

**That's it!** After pulling, you'll have the scripts and can use them.

---

### Solution 2: Manual Setup (No Scripts Needed - 5 minutes)

Don't want to pull changes? No problem! You can set up the environment manually:

```bash
# Step 1: Copy the example file
cp .env.example .env.local

# Step 2: Open the file in your editor
# On Mac:
open .env.local

# On Linux:
nano .env.local
```

**Step 3: Replace the placeholder values with your actual Supabase credentials:**

```bash
# Change this:
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co

# To your actual URL:
NEXT_PUBLIC_SUPABASE_URL=https://oaepllglgynnrgjzwbrw.supabase.co
```

**Where to get your credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click Settings → API
4. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

**Step 4: Save the file and start the server:**

```bash
npm run dev
```

---

### Solution 3: Quick One-Command Setup (Power Users)

If you have your credentials ready, you can create the `.env.local` file in one command:

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

Replace the placeholder values with the credentials you provided earlier (from your previous messages).

Then start the server:

```bash
npm run dev
```

---

## 🎯 Which Solution Should You Use?

| Solution | Time | Best For |
|----------|------|----------|
| **Pull latest** | 30 sec | Getting future updates easily |
| **Manual setup** | 5 min | Learning what each step does |
| **One-command** | 10 sec | Just want it working NOW |

**Recommendation:** Use **Solution 1** (git pull) if you plan to keep using this project, as it'll make future updates easier.

---

## ✅ Verification

After using any solution above, verify your setup:

```bash
# Check if .env.local exists
ls -la .env.local

# Should show something like:
# -rw-r--r--  1 jwkmo  staff  XXX bytes  .env.local
```

If you pulled the latest changes, you can also verify:

```bash
# Check if scripts exist now
ls scripts/

# Should show:
# check-env.sh
# setup-env.sh
```

---

## 🚀 Next Steps

Once you've completed one of the solutions above:

```bash
# 1. Start the development server
npm run dev

# 2. Open your browser to:
http://localhost:3000

# 3. You should see the app running without errors!
```

---

## 📚 More Help

- **Complete troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Scripts not found details:** [SCRIPTS_NOT_FOUND.md](./SCRIPTS_NOT_FOUND.md)
- **Environment setup guide:** [ENV_SETUP.md](./ENV_SETUP.md)
- **5-minute quick start:** [QUICK_START.md](./QUICK_START.md)

---

## 💡 Key Takeaway

**The scripts are just helper tools!** You never *need* them - they just make setup easier. You can always manually create your `.env.local` file by copying `.env.example` and filling in your credentials.

Choose whichever method works best for you! 🎉
