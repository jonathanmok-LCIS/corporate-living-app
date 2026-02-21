'use server';

import { createClient } from '@/lib/supabase-server';

export async function getTenantActiveTenancy() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('getTenantActiveTenancy: No authenticated user');
      return { data: null, error: 'Not authenticated' };
    }

    console.log('getTenantActiveTenancy: Fetching for user', user.id);

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
      .maybeSingle(); // Use maybeSingle instead of single to avoid error on no results

    if (error) {
      console.error('getTenantActiveTenancy: Database error:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      console.log('getTenantActiveTenancy: No active tenancy found for user', user.id);
      return { data: null, error: 'No active tenancy found' };
    }

    console.log('getTenantActiveTenancy: Found tenancy', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('getTenantActiveTenancy: Exception:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}
