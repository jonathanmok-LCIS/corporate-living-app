# ✅ Solution: "Your project's URL and Key are required" Error

## Your Exact Error

```
jwkmo@Mac corporate-living-app % npm run dev
> corporate-living-app@1.0.0 dev
> next dev

▲ Next.js 16.1.6 (Turbopack)
- Local:   http://localhost:3000

✓ Starting...
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
✓ Ready in 689ms

⨯ Error: Your project's URL and Key are required to create a Supabase client!
Check your Supabase project's API settings to find these values
https://supabase.com/dashboard/project/_/settings/api
```

## 🎯 The Problem

The app is starting successfully, but your **Supabase credentials are not configured**. 

You need to create a `.env.local` file with your Supabase project credentials.

## ✅ The Solution

### Quick Fix (Choose One)

#### Option 1: Interactive Setup (Recommended for Beginners)

```bash
./scripts/setup-env.sh
```

This will guide you through entering your credentials step-by-step.

#### Option 2: Manual Setup (Fast if you know what you're doing)

```bash
# 1. Copy the example file
cp .env.example .env.local

# 2. Edit the file
# Use your favorite text editor (nano, vim, VS Code, etc.)
nano .env.local
# or
code .env.local

# 3. Replace the placeholder values with your actual credentials
```

#### Option 3: One-Command Setup (If you have your credentials ready)

Replace the values below with your actual credentials:

```bash
cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Application URL (for local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

**⚠️ IMPORTANT:** Replace `your-project-id`, `your-anon-key-here`, and `your-service-role-key-here` with your actual values!

## 📋 Step-by-Step Instructions

### Step 1: Find Your Supabase Credentials

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (or create one if you don't have it)
3. Go to **Settings** → **API**
4. You'll see:
   - **Project URL** (e.g., `https://abcdefg.supabase.co`)
   - **Project API keys**:
     - `anon` `public` key (safe to use in browser)
     - `service_role` key (⚠️ keep this secret!)

### Step 2: Create .env.local File

```bash
# Make sure you're in the project directory
cd corporate-living-app

# Copy the example file
cp .env.example .env.local
```

### Step 3: Edit .env.local with Your Credentials

Open `.env.local` in your text editor and update these lines:

```bash
# Replace with YOUR actual values
NEXT_PUBLIC_SUPABASE_URL=https://oaepllglgynnrgjzwbrw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example of what it should look like:**

```bash
# Supabase Configuration
# Find these in: Supabase Dashboard → Settings → API

# Your Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://oaepllglgynnrgjzwbrw.supabase.co

# Supabase Anonymous (Public) Key
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YOUR_ANON_KEY_HERE

# Supabase Service Role Key (KEEP THIS SECRET!)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_YOUR_SERVICE_ROLE_KEY_HERE

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Verify Your Configuration

Run the verification script:

```bash
./scripts/check-env.sh
```

You should see:
```
✓ .env.local file exists
✓ NEXT_PUBLIC_SUPABASE_URL - https://your-project.supabase.co
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY - eyJhbGciOiJIUzI1NiI...
✓ SUPABASE_SERVICE_ROLE_KEY - eyJhbGciOiJIUzI1NiI...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Configuration Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 5: Restart the Development Server

```bash
# Stop the server if it's running (Ctrl+C)
# Then start it again
npm run dev
```

You should now see:
```
▲ Next.js 16.1.6 (Turbopack)
- Local:   http://localhost:3000

✓ Starting...
✓ Ready in 689ms
```

**Without the error!** ✅

## 🔍 How to Verify It's Working

1. Open your browser to http://localhost:3000
2. You should see the homepage without errors
3. Check the terminal - no error messages about Supabase

## ❓ Common Issues

### "I don't have Supabase credentials"

You need to create a Supabase project first:

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in project details
5. Wait for project to be created (~2 minutes)
6. Go to Settings → API to get your credentials

### "My credentials look different"

Standard Supabase credentials should look like:
- **URL:** `https://xxxxxxxxxxxxx.supabase.co` (where x's are random letters/numbers)
- **Keys:** Long JWT tokens starting with `eyJ...`

If your credentials have different prefixes (like `sb_publishable_` or `sb_secret_`), they might be:
- Test/placeholder values
- Custom configuration
- Different service

Try them anyway - if they don't work, regenerate them from your Supabase dashboard.

### "I copied .env.example but it still doesn't work"

Make sure you **edited** the `.env.local` file after copying it. The `.env.example` file has placeholder values like:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
```

You need to replace `your-project-url.supabase.co` with your **actual** Supabase URL!

### "The check-env.sh script doesn't run"

Make sure it's executable:

```bash
chmod +x scripts/check-env.sh
./scripts/check-env.sh
```

### "I see a warning about middleware"

This is just a deprecation warning:
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

You can ignore this for now - it won't affect functionality. We'll update this in a future version.

## 🔒 Security Note

⚠️ **NEVER commit your `.env.local` file to git!**

The `.env.local` file is already in `.gitignore`, so it won't be committed. But double-check:

```bash
git status
```

You should NOT see `.env.local` in the list of changes.

## 📚 Next Steps

After fixing the Supabase configuration:

1. **Run database migrations** (see [SETUP.md](./SETUP.md))
   ```bash
   # In Supabase SQL Editor, run migrations from supabase/migrations/
   ```

2. **Create an admin user** (see [SETUP.md](./SETUP.md))
   ```sql
   INSERT INTO profiles (id, email, name, role)
   VALUES ('your-uuid', 'admin@example.com', 'Admin', 'ADMIN');
   ```

3. **Test the application**
   - Visit http://localhost:3000
   - Try logging in
   - Explore the features

## 📖 Additional Resources

- **[ENV_SETUP.md](./ENV_SETUP.md)** - Detailed environment variables guide
- **[SETUP.md](./SETUP.md)** - Complete application setup
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - All common errors
- **[QUICK_START.md](./QUICK_START.md)** - 5-minute setup guide

## ✅ Success Checklist

- [x] Navigated to project directory (`cd corporate-living-app`)
- [x] Created `.env.local` file
- [x] Added Supabase URL
- [x] Added Supabase anon key
- [x] Added Supabase service role key
- [x] Ran verification script (`./scripts/check-env.sh`)
- [x] Restarted dev server (`npm run dev`)
- [x] No Supabase errors in terminal
- [x] App loads in browser

---

**Remember:** Keep your `.env.local` file safe and never share your service role key! 🔒
