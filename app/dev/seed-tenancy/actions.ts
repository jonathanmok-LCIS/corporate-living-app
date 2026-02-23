'use server';

import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

export async function getHousesAndRooms() {
  try {
    // Use admin client to bypass RLS for dev seeding
    const supabaseAdmin = getAdminClient();
    
    const { data: houses, error } = await supabaseAdmin
      .from('houses')
      .select(`
        id,
        name,
        rooms(
          id,
          label,
          capacity
        )
      `)
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error fetching houses:', error);
      return { data: null, error: error.message };
    }

    return { data: houses, error: null };
  } catch (error) {
    console.error('getHousesAndRooms exception:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function createTestTenancy(roomId: string) {
  try {
    // Check if dev seeding is enabled
    const enableDevSeeding = process.env.ENABLE_DEV_SEEDING === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction || !enableDevSeeding) {
      return { 
        success: false, 
        error: 'Dev seeding is not enabled. Set ENABLE_DEV_SEEDING=true in .env.local' 
      };
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    console.log('Creating test tenancy for user:', user.id);

    // Use admin client to create tenancy (bypasses RLS)
    const supabaseAdmin = getAdminClient();

    // Check if user already has an active tenancy
    const { data: existingTenancy } = await supabaseAdmin
      .from('tenancies')
      .select('id, status')
      .eq('tenant_user_id', user.id)
      .in('status', ['OCCUPIED', 'MOVE_OUT_INTENDED', 'MOVE_IN_PENDING_SIGNATURE'])
      .maybeSingle();

    if (existingTenancy) {
      return { 
        success: false, 
        error: `You already have an active tenancy (Status: ${existingTenancy.status})` 
      };
    }

    // Create new tenancy
    const { data: newTenancy, error: createError } = await supabaseAdmin
      .from('tenancies')
      .insert([{
        room_id: roomId,
        tenant_user_id: user.id,
        start_date: new Date().toISOString().split('T')[0],
        status: 'OCCUPIED',
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating tenancy:', createError);
      return { success: false, error: createError.message };
    }

    console.log('Test tenancy created:', newTenancy);

    return { success: true, tenancyId: newTenancy.id, error: null };
  } catch (error) {
    console.error('createTestTenancy exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
