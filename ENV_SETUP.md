# Environment Variables Setup Guide

**Confused about environment variables?** This guide will explain everything step by step! 🚀

## What Are Environment Variables?

Environment variables are like **secret settings** for your application. They store things like:
- Database passwords
- API keys
- URLs to services
- Email credentials

Think of them like a **configuration file** that tells your app how to connect to services like Supabase.

## Why Use `.env.local`?

- **`.env.example`** = A template file (safe to share, tracked in git)
- **`.env.local`** = Your actual secrets (NEVER share, ignored by git)

We keep them separate so that:
1. ✅ You can share the template (`.env.example`) with teammates
2. ✅ You NEVER accidentally share your passwords (`.env.local` is ignored by git)
3. ✅ Each person can have their own credentials

## Step-by-Step Setup

### Step 1: Copy the Template File

You need to create your own `.env.local` file from the example template.

**On Mac or Linux:**
```bash
# Open your terminal and run:
cp .env.example .env.local
```

**On Windows (Command Prompt):**
```cmd
REM Open Command Prompt and run:
copy .env.example .env.local
```

**On Windows (PowerShell):**
```powershell
# Open PowerShell and run:
Copy-Item .env.example .env.local
```

**What this does:**
- Creates a copy of `.env.example`
- Names it `.env.local`
- Now you can edit `.env.local` without changing the template

**Visual explanation:**
```
Before:
  .env.example    ← Template (don't edit this)

After running the command:
  .env.example    ← Template (still here)
  .env.local      ← Your copy (edit this one!)
```

### Step 2: Get Your Supabase Credentials

Now you need to get your actual values from Supabase:

1. **Go to Supabase:**
   - Visit [https://supabase.com](https://supabase.com)
   - Sign in to your account
   - Select your project (or create one if you haven't)

2. **Find Your Credentials:**
   - Click on **Settings** (gear icon on the left sidebar)
   - Click on **API**
   - You'll see a page with your credentials

3. **Copy These Three Values:**

   **a) Project URL**
   - Look for "Project URL"
   - It looks like: `https://abcdefgh.supabase.co`
   - Copy the entire URL

   **b) Anon Key (Public Key)**
   - Look for "Project API keys"
   - Find the one labeled "anon" or "public"
   - It's a long string starting with "eyJ..."
   - Click the "Copy" button

   **c) Service Role Key**
   - Still in "Project API keys"
   - Find the one labeled "service_role"
   - ⚠️ **Important:** This is a SECRET key with admin powers!
   - Click "Reveal" then "Copy"

### Step 3: Edit Your `.env.local` File

1. **Open the file:**
   - In VS Code: File → Open → select `.env.local`
   - Or use any text editor (Notepad, TextEdit, etc.)

2. **Find these lines:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Replace the placeholder text:**
   
   **Before (example template):**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   ```
   
   **After (your actual values):**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   ```

4. **Do the same for all three variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **Save the file** (Ctrl+S or Cmd+S)

### Step 4: Verify It Worked

1. **Restart your development server:**
   ```bash
   # Press Ctrl+C to stop the server
   # Then run:
   npm run dev
   ```

2. **Visit the app:**
   - Go to [http://localhost:3000](http://localhost:3000)
   - Try to log in at [http://localhost:3000/login](http://localhost:3000/login)

3. **Success indicators:**
   - ✅ You DON'T see "Supabase is not configured" errors
   - ✅ The login page loads without errors
   - ✅ You can connect to the database

## Common Issues & Solutions

### ❌ "Supabase is not configured"

**Problem:** The app can't find your credentials.

**Solutions:**
1. Make sure the file is named `.env.local` (not `.env.example`)
2. Make sure it's in the root folder of the project
3. Make sure you replaced ALL the "your-xxx" placeholders
4. Restart your dev server (Ctrl+C, then `npm run dev`)

### ❌ "Invalid API key" or "Unauthorized"

**Problem:** The credentials are wrong.

**Solutions:**
1. Double-check you copied the ENTIRE key (they're very long)
2. Make sure there are no extra spaces before or after the values
3. Go back to Supabase and copy the keys again
4. Make sure you're using the right project in Supabase

### ❌ I don't see `.env.local` in my editor

**Problem:** The file might be hidden.

**Solutions:**
1. In VS Code: Make sure "Files: Exclude" isn't hiding it
2. Make sure you created it (run the `cp` or `copy` command again)
3. Check if it's in the right folder (should be at the root, next to package.json)

### ❌ "Cannot find module" errors

**Problem:** Next.js isn't reading the environment variables.

**Solutions:**
1. Make sure the file is named EXACTLY `.env.local` (with the dot at the start)
2. Restart your dev server
3. Clear Next.js cache: `rm -rf .next` then `npm run dev`

## Visual File Structure

Your project should look like this:

```
corporate-living-app/
├── .env.example        ← Template (tracked by git) ✅
├── .env.local          ← Your secrets (NOT tracked) ✅ YOU CREATE THIS
├── .gitignore          ← Contains .env.local so it's never committed
├── package.json
├── app/
├── lib/
└── ... other files
```

## Security Best Practices

### ✅ DO:
- Keep `.env.local` on your computer only
- Use different credentials for development and production
- Regularly rotate your service role key
- Share `.env.example` with teammates

### ❌ DON'T:
- Never commit `.env.local` to git
- Never share your service role key
- Never post your credentials on forums or chat
- Never use production credentials in development

## Quick Reference

| File | Purpose | Share? | In Git? |
|------|---------|--------|---------|
| `.env.example` | Template with placeholders | ✅ Yes | ✅ Yes |
| `.env.local` | Your actual secrets | ❌ NO! | ❌ No |

## Still Need Help?

1. **Check the main documentation:**
   - [SETUP.md](./SETUP.md) - Complete setup guide
   - [NEXT_STEPS.md](./NEXT_STEPS.md) - Day-by-day implementation

2. **Supabase Documentation:**
   - [Supabase Docs](https://supabase.com/docs)
   - [Environment Variables Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

3. **Next.js Documentation:**
   - [Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

## Video Tutorial (Recommended!)

If you're a visual learner, search YouTube for:
- "How to use environment variables in Next.js"
- "Supabase Next.js setup tutorial"

These videos will show you exactly what to do!

---

**You've got this!** 🎉 Once you complete these steps, your app will be connected to Supabase and ready to use!
