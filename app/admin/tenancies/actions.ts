'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Helper to create admin client
function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Service role key not configured');
  }
  
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function fetchTenanciesAdmin() {
  try {
    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin
      .from('tenancies')
      .select(`
        *,
        room:rooms(id, label, house_id),
        tenant:profiles!tenant_user_id(id, name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenancies:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in fetchTenanciesAdmin:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function createTenancy(tenancyData: {
  room_id: string;
  tenant_user_id: string;
  start_date: string;
  end_date?: string;
  slot?: 'A' | 'B';
  rental_price?: number;
}) {
  try {
    // Create admin client with service role key to bypass RLS
    const supabaseAdmin = getAdminClient();

    const insertData: any = {
      room_id: tenancyData.room_id,
      tenant_user_id: tenancyData.tenant_user_id,
      start_date: tenancyData.start_date,
      status: 'OCCUPIED',
    };

    // Add optional fields if provided
    if (tenancyData.slot) {
      insertData.slot = tenancyData.slot;
    }
    if (tenancyData.end_date) {
      insertData.end_date = tenancyData.end_date;
    }
    if (tenancyData.rental_price !== undefined) {
      insertData.rental_price = tenancyData.rental_price;
    }

    const { data, error } = await supabaseAdmin
      .from('tenancies')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Error creating tenancy:', error);
      return { error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in createTenancy:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}
