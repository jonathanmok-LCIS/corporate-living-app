'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type LogoutVariant = 'admin' | 'coordinator' | 'tenant';

const VARIANT_STYLES: Record<LogoutVariant, string> = {
  admin: 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30',
  coordinator: 'bg-green-500/20 hover:bg-green-500/30 border border-green-400/30',
  tenant: 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30',
};

interface LogoutButtonProps {
  variant?: LogoutVariant;
}

export default function LogoutButton({ variant = 'admin' }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className={`${VARIANT_STYLES[variant]} px-3 py-1 rounded-md text-sm font-medium transition-colors`}
    >
      Logout
    </button>
  );
}
