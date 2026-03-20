'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createHouseFinancialSnapshot } from '../houses/actions';

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
  } catch (err) {
    console.error('Error in fetchTenanciesAdmin:', err);
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error occurred' };
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

    interface InsertData {
      room_id: string;
      tenant_user_id: string;
      start_date: string;
      status: string;
      slot?: 'A' | 'B';
      end_date?: string;
      rental_price?: number;
    }

    const insertData: InsertData = {
      room_id: tenancyData.room_id,
      tenant_user_id: tenancyData.tenant_user_id,
      start_date: tenancyData.start_date,
      status: 'ACTIVE',
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

    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('house_id, label')
      .eq('id', tenancyData.room_id)
      .single();

    if (roomError) {
      console.error('Failed to lookup room for financial snapshot:', roomError.message);
    } else if (room?.house_id) {
      const snapshot = await createHouseFinancialSnapshot(
        room.house_id,
        `Tenancy created for ${room.label}`
      );
      if (snapshot.error) {
        console.error('Failed to record financial snapshot after tenancy creation:', snapshot.error);
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error in createTenancy:', err);
    return { error: err instanceof Error ? err.message : 'Unknown error occurred' };
  }
}

export async function endTenancy(tenancyId: string) {
  try {
    const supabaseAdmin = getAdminClient();

    // Guard: verify tenancy exists and is in an appropriate state
    const { data: current } = await supabaseAdmin
      .from('tenancies')
      .select('status')
      .eq('id', tenancyId)
      .single();

    if (current && current.status === 'COMPLETED') {
      return { data: null, error: 'Tenancy is already completed' };
    }
    if (current && current.status === 'CANCELLED') {
      return { data: null, error: 'Tenancy is already cancelled' };
    }

    const { data, error } = await supabaseAdmin
      .from('tenancies')
      .update({
        status: 'COMPLETED',
        end_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', tenancyId)
      .select();

    if (error) {
      console.error('Error ending tenancy:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error in endTenancy:', err);
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error occurred' };
  }
}

export async function fetchTenantTenancyHistory(tenantUserId: string) {
  try {
    const supabaseAdmin = getAdminClient();

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .eq('id', tenantUserId)
      .single();

    if (tenantError) {
      return { tenant: null, data: null, error: tenantError.message };
    }

    const { data, error } = await supabaseAdmin
      .from('tenancies')
      .select(`
        id,
        start_date,
        end_date,
        status,
        slot,
        rental_price,
        created_at,
        room:rooms(id, label, house_id, house:houses(name))
      `)
      .eq('tenant_user_id', tenantUserId)
      .order('start_date', { ascending: false });

    if (error) {
      return { tenant, data: null, error: error.message };
    }

    return { tenant, data: data || [], error: null };
  } catch (err) {
    return {
      tenant: null,
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}
