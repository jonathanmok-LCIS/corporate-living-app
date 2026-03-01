'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

export async function assignCoordinator(houseId: string, userId: string) {
  const supabaseAdmin = getAdminClient();
  
  try {
    const { data, error } = await supabaseAdmin
      .from('house_coordinators')
      .insert([{
        house_id: houseId,
        user_id: userId,
      }])
      .select();

    if (error) {
      console.error('Error assigning coordinator:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception assigning coordinator:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function removeCoordinator(coordinatorId: string) {
  const supabaseAdmin = getAdminClient();
  
  try {
    const { error } = await supabaseAdmin
      .from('house_coordinators')
      .delete()
      .eq('id', coordinatorId);

    if (error) {
      console.error('Error removing coordinator:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception removing coordinator:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
