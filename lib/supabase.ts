import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  SUPABASE CONFIGURATION MISSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Supabase credentials are not configured.

QUICK FIX (choose one):

  Option 1: Use the setup script (recommended)
  ┌────────────────────────────────────────┐
  │ ./scripts/setup-env.sh                 │
  └────────────────────────────────────────┘

  Option 2: Manual setup
  ┌────────────────────────────────────────┐
  │ cp .env.example .env.local             │
  │ # Then edit .env.local with your keys  │
  └────────────────────────────────────────┘

Missing variables:
  ${!supabaseUrl ? '❌ NEXT_PUBLIC_SUPABASE_URL' : '✅ NEXT_PUBLIC_SUPABASE_URL'}
  ${!supabaseAnonKey ? '❌ NEXT_PUBLIC_SUPABASE_ANON_KEY' : '✅ NEXT_PUBLIC_SUPABASE_ANON_KEY'}

📖 For detailed instructions, see: ENV_SETUP.md
🔧 For troubleshooting, see: TROUBLESHOOTING.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseAnonKey);
}
