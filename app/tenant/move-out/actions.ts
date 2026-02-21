'use server';

import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

export async function getTenantActiveTenancy() {
  try {
    // First, get the authenticated user using server client
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('getTenantActiveTenancy: No authenticated user');
      return { data: null, error: 'Not authenticated' };
    }

    console.log('getTenantActiveTenancy: Fetching for user', user.id);

    // Use admin client to bypass RLS and query by user ID
    const supabaseAdmin = getAdminClient();
    
    const { data, error } = await supabaseAdmin
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
      .in('status', ['OCCUPIED', 'MOVE_OUT_INTENDED', 'MOVE_IN_PENDING_SIGNATURE', 'MOVE_OUT_INSPECTION_DRAFT', 'MOVE_OUT_INSPECTION_FINAL'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getTenantActiveTenancy: Database error:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      console.log('getTenantActiveTenancy: No active tenancy found for user', user.id);
      return { data: null, error: null }; // Return null error when no tenancy (not an error condition)
    }

    console.log('getTenantActiveTenancy: Found tenancy', data.id, 'with status', data.status);
    return { data, error: null };
  } catch (error) {
    console.error('getTenantActiveTenancy: Exception:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}
