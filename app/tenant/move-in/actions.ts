'use server';

import { createClient } from '@/lib/supabase-server';

export async function getTenantPendingTenancy() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get the tenant's pending or newly occupied tenancy
  const { data, error } = await supabase
    .from('tenancies')
    .select(`
      *,
      room:rooms(
        id,
        label,
        house:houses(
          id,
          name,
          address
        )
      ),
      move_out_intentions!tenancy_id(
        id,
        key_area_photos,
        damage_photos,
        notes,
        planned_move_out_date
      )
    `)
    .eq('tenant_user_id', user.id)
    .in('status', ['PENDING', 'OCCUPIED'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function confirmKeysReceived(tenancyId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Update tenancy to mark keys as received
  const { error } = await supabase
    .from('tenancies')
    .update({
      keys_received: true,
      keys_received_at: new Date().toISOString(),
    })
    .eq('id', tenancyId)
    .eq('tenant_user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
