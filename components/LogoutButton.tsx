'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    if (!supabase) return;
    
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="hover:bg-opacity-80 px-3 py-1 rounded bg-white bg-opacity-20 text-sm"
    >
      Logout
    </button>
  );
}
