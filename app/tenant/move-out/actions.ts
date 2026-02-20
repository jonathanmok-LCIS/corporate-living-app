'use server';

import { createClient } from '@/lib/supabase-server';

export async function getTenantActiveTenancy() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('tenancies')
    .select(`
      *,
      room:rooms(
        id,
        label,
        house:houses(
          id,
          name
        )
      )
    `)
    .eq('tenant_user_id', user.id)
    .eq('status', 'OCCUPIED')
    .single();

  return { data, error: error?.message };
}
