'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in .env.local' };
    }

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
