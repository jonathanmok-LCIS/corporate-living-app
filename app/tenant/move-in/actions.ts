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
      )
    `)
    .eq('tenant_user_id', user.id)
    .in('status', ['PENDING', 'OCCUPIED', 'MOVE_IN_PENDING_SIGNATURE'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getPreviousTenantMoveOutPhotos(roomId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get the most recent ENDED tenancy for this room with move-out photos
  const { data: previousTenancy, error: tenancyError } = await supabase
    .from('tenancies')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'ENDED')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tenancyError || !previousTenancy) {
    console.log('No previous tenancy found for room', roomId);
    return { data: null, error: null }; // No error, just no previous data
  }

  // Get the move-out intention for the previous tenancy
  const { data: moveOutData, error: moveOutError } = await supabase
    .from('move_out_intentions')
    .select('id, key_area_photos, damage_photos, notes, damage_description')
    .eq('tenancy_id', previousTenancy.id)
    .maybeSingle();

  if (moveOutError) {
    console.error('Error fetching previous move-out data:', moveOutError);
    return { data: null, error: null }; // Don't fail, just return no data
  }

  return { data: moveOutData, error: null };
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
