'use server';

import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

export async function uploadMoveOutPhotos(
  tenancyId: string,
  files: { name: string; type: string; base64: string }[]
) {
  try {
    const supabaseAdmin = getAdminClient();
    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Create unique filename with tenancy ID prefix
      const filename = `${tenancyId}/${Date.now()}-${file.name}`;
      
      // Decode base64 to buffer
      const buffer = Buffer.from(file.base64, 'base64');
      
      // Upload to storage
      const { data, error } = await supabaseAdmin.storage
        .from('move-out-photos')
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', filename, error);
        continue; // Skip this file, continue with others
      }

      if (data) {
        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('move-out-photos')
          .getPublicUrl(filename);
        
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    return { urls: uploadedUrls, error: null };
  } catch (error) {
    console.error('uploadMoveOutPhotos: Exception:', error);
    return { urls: [], error: error instanceof Error ? error.message : 'Upload failed' };
  }
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

    console.log('=== DIAGNOSTIC START ===');
    console.log('Auth user.id:', user.id);
    console.log('Auth user.email:', user.email);

    // Use admin client to bypass RLS
    const supabaseAdmin = getAdminClient();
    
    // DIAGNOSTIC: Check if profile exists for this auth user
    const { data: profileCheck, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, role')
      .eq('id', user.id)
      .maybeSingle();
    
    console.log('Profile check for user.id:', profileCheck);
    if (profileError) {
      console.error('Profile check error:', profileError);
    }
    
    if (!profileCheck) {
      console.error('CRITICAL: No profile found for auth user.id:', user.id);
      return { 
        data: null, 
        error: `No profile found for user ${user.email}. Profile must be created before tenancy access.` 
      };
    }

    // DIAGNOSTIC: Check ALL tenancies for this user (not just active statuses)
    const { data: allTenancies, error: allError } = await supabaseAdmin
      .from('tenancies')
      .select('id, tenant_user_id, status, start_date, end_date, created_at')
      .eq('tenant_user_id', user.id)
      .order('created_at', { ascending: false });
    
    console.log('All tenancies for user.id:', allTenancies);
    console.log('Total tenancies found:', allTenancies?.length || 0);
    if (allError) {
      console.error('All tenancies check error:', allError);
    }

    // Now query active tenancies with full details
    const activeStatuses = ['OCCUPIED', 'MOVE_OUT_INTENDED', 'MOVE_IN_PENDING_SIGNATURE', 'MOVE_OUT_INSPECTION_DRAFT', 'MOVE_OUT_INSPECTION_FINAL'];
    console.log('Querying active tenancies with statuses:', activeStatuses);
    
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
      .in('status', activeStatuses)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getTenantActiveTenancy: Database error:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      console.log('getTenantActiveTenancy: No ACTIVE tenancy found');
      console.log('Possible reasons:');
      console.log('- All tenancies have status ENDED');
      console.log('- Tenancies exist but tenant_user_id does not match auth user.id');
      console.log('- No tenancy records exist at all');
      console.log('=== DIAGNOSTIC END ===');
      return { data: null, error: null };
    }

    console.log('getTenantActiveTenancy: Found active tenancy:', {
      id: data.id,
      status: data.status,
      tenant_user_id: data.tenant_user_id,
      room: data.room?.label,
      house: data.room?.house?.name
    });
    console.log('=== DIAGNOSTIC END ===');
    return { data, error: null };
  } catch (error) {
    console.error('getTenantActiveTenancy: Exception:', error);
    console.log('=== DIAGNOSTIC END (ERROR) ===');
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}
