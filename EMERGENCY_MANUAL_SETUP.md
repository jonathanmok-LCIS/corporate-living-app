# Emergency Manual Setup - No Git Required

## Quick Start (2 Minutes)

If you just want to get the app running without dealing with git branches or scripts, follow these steps:

### Step 1: Create .env.local File

Open your terminal in the `corporate-living-app` directory and run:

```bash
cat > .env.local << 'EOF'
# ================================
# SUPABASE CONFIGURATION
# ================================
# Your Supabase project credentials
# Find these at: https://supabase.com/dashboard/project/_/settings/api

# Your Supabase Project URL
# Example: https://abcdefghij.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://oaepllglgynnrgjzwbrw.supabase.co

# Supabase Anonymous (Public) Key
# This is safe to use in client-side code
# Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_fqZ7a2E31wxMY_wc5tdAdg_Elbwq26f

# Supabase Service Role Key
# WARNING: This key has admin access - keep it secret!
# Only use on the server-side, never expose in client code
# Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_KWdram5wQWmfqH39nqL1gg_5gQ99VEu

# ================================
# APP CONFIGURATION
# ================================

# Your application URL (for development)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ================================
# EMAIL SERVICE (OPTIONAL)
# ================================
# Uncomment and configure one of these when you're ready to send emails

# Option 1: Resend (Recommended)
# Get your API key from: https://resend.com/api-keys
# RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Option 2: SendGrid
# Get your API key from: https://app.sendgrid.com/settings/api_keys
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Option 3: AWS SES
# Configure your AWS credentials
# AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxx
# AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxx
# AWS_REGION=us-east-1
EOF
```

### Step 2: Verify File Was Created

```bash
# Check that file exists
ls -la .env.local

# Check file content (should show your configuration)
cat .env.local
```

### Step 3: Start the Development Server

```bash
npm run dev
```

### Step 4: Open Your Browser

Visit: http://localhost:3000

You should see the application running!

## Alternative Method: Create File Manually

If the command above doesn't work, you can create the file manually:

### Using a Text Editor

1. **Create a new file** named `.env.local` in the `corporate-living-app` directory

2. **Copy this content** into the file:

```
# SUPABASE CONFIGURATION
NEXT_PUBLIC_SUPABASE_URL=https://oaepllglgynnrgjzwbrw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_fqZ7a2E31wxMY_wc5tdAdg_Elbwq26f
SUPABASE_SERVICE_ROLE_KEY=sb_secret_KWdram5wQWmfqH39nqL1gg_5gQ99VEu

# APP CONFIGURATION
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Save the file** as `.env.local` (note the dot at the beginning!)

4. **Make sure** it's in the same directory as `package.json`

### Using Mac/Linux Terminal

```bash
# Navigate to project directory
cd corporate-living-app

# Create file with nano editor
nano .env.local

# Paste the content, then:
# Press Ctrl+O to save
# Press Ctrl+X to exit
```

### Using Windows

```powershell
# Navigate to project directory
cd corporate-living-app

# Create file with notepad
notepad .env.local

# Paste the content, then:
# File → Save
# Close notepad
```

## Success Checklist

✅ Verify these steps:

```bash
# 1. Check you're in the right directory
pwd
# Should end with: /corporate-living-app

# 2. Check .env.local exists
ls .env.local
# Should show: .env.local

# 3. Check file has content
cat .env.local | head -5
# Should show the Supabase configuration

# 4. Start the server
npm run dev
# Should start without Supabase configuration errors

# 5. Open browser
# Visit http://localhost:3000
# Should see the application homepage
```

## Troubleshooting

### "I can't see .env.local in my file explorer"

Files starting with a dot (`.`) are hidden by default on Mac/Linux.

**To see it:**
- **Mac Finder:** Press `Cmd + Shift + .` (dot)
- **Linux:** Press `Ctrl + H`
- **Terminal:** Use `ls -la` instead of `ls`

### "I get 'Supabase is not configured' error"

The .env.local file might not be in the right place or have the right content.

**Fix:**
```bash
# Check current directory
pwd
# Should be in the project directory

# Remove old file if exists
rm .env.local

# Create new one with the command from Step 1 above
cat > .env.local << 'EOF'
...
EOF
```

### "The app starts but I can't log in"

This is expected! You need to:
1. Set up your Supabase database (run migrations)
2. Create an admin user

See **SETUP.md** for complete instructions.

## What This File Does

The `.env.local` file tells your application:
- **Where your database is** (Supabase URL)
- **How to connect to it** (Supabase keys)
- **Where the app is running** (localhost:3000)

It's like giving your app the keys to your house - it needs them to get in and do its work!

## Security Note

⚠️ **IMPORTANT:** The credentials shown above were shared publicly and should be regenerated!

If these are real credentials:
1. Go to your Supabase Dashboard
2. Settings → API
3. Click "Reset" or "Regenerate" for the service role key
4. Update this file with the new key

Never share credentials publicly again!

## Next Steps

After the app is running:

1. **Set up the database**
   - See SETUP.md for running migrations
   
2. **Create your first admin user**
   - Instructions in SETUP.md
   
3. **Test the application**
   - Try logging in
   - Explore the features

4. **Optional: Switch to feature branch**
   - To get helper scripts and full documentation
   - See BRANCH_ISSUE.md for instructions

---

**You're all set! The app should now be running at http://localhost:3000** 🎉
