'use server';

import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function fetchHousesAdmin() {
  try {
    const supabaseAdmin = getAdminClient();
    
    const { data: houses, error } = await supabaseAdmin
      .from('houses')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching houses:', error);
      return { data: null, error: error.message };
    }

    return { data: houses || [], error: null };
  } catch (err) {
    console.error('Unexpected error in fetchHousesAdmin:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: message };
  }
}

export async function createHouse(houseData: {
  name: string;
  address: string;
  postcode: string;
}) {
  try {
    const supabaseAdmin = getAdminClient();
    
    const { data, error } = await supabaseAdmin
      .from('houses')
      .insert([houseData])
      .select()
      .single();

    if (error) {
      console.error('Error creating house:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in createHouse:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: message };
  }
}

export async function updateHouse(id: string, houseData: {
  name: string;
  address: string;
  postcode: string;
}) {
  try {
    const supabaseAdmin = getAdminClient();
    
    const { data, error } = await supabaseAdmin
      .from('houses')
      .update(houseData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating house:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in updateHouse:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: message };
  }
}

export async function deleteHouse(id: string) {
  try {
    const supabaseAdmin = getAdminClient();
    
    const { error } = await supabaseAdmin
      .from('houses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting house:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error in deleteHouse:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { error: message };
  }
}
