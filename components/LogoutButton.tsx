'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type LogoutVariant = 'admin' | 'coordinator' | 'tenant';

const VARIANT_STYLES: Record<LogoutVariant, string> = {
  admin: 'bg-purple-800 hover:bg-purple-900',
  coordinator: 'bg-green-800 hover:bg-green-900',
  tenant: 'bg-blue-800 hover:bg-blue-900',
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
      className={`${VARIANT_STYLES[variant]} px-3 py-1 rounded text-sm shadow-md`}
    >
      Logout
    </button>
  );
}
