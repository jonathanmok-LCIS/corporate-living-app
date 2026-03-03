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

export async function submitMoveOutIntention(data: {
  tenancyId: string;
  plannedMoveOutDate: string;
  notes: string | null;
  keyAreaPhotos: string[];
  damagePhotos: string[];
  rentPaidUp: boolean;
  areasCleaned: boolean;
  hasDamage: boolean;
  damageDescription: string | null;
}) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('submitMoveOutIntention: Auth error:', authError);
      return { success: false, error: 'Not authenticated' };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('=== SUBMIT MOVE-OUT INTENTION ===');
      console.log('User ID:', user.id);
      console.log('User Email:', user.email);
      console.log('Tenancy ID:', data.tenancyId);
    }

    // Optional: Verify tenancy ownership for extra security
    // Note: RLS policies on the INSERT below will also enforce ownership
    // We trust the tenancy.id passed from the client since it's already displayed on page
    const supabaseAdmin = getAdminClient();
    const { data: tenancyCheck } = await supabaseAdmin
      .from('tenancies')
      .select('id, tenant_user_id, status')
      .eq('id', data.tenancyId)
      .maybeSingle();

    if (process.env.NODE_ENV !== 'production') {
      console.log('Tenancy check (optional):', tenancyCheck);
    }
    
    // Only validate ownership IF we got tenancy data
    // Don't fail if tenancyCheck is null - trust the client and let RLS handle it
    if (tenancyCheck && tenancyCheck.tenant_user_id !== user.id) {
      console.error('Tenancy ownership mismatch:', {
        tenancy_user_id: tenancyCheck.tenant_user_id,
        auth_user_id: user.id
      });
      return { success: false, error: 'You do not own this tenancy' };
    }

    // Guard: Only allow move-out request if tenancy is ACTIVE
    if (tenancyCheck && tenancyCheck.status !== 'ACTIVE') {
      return { 
        success: false, 
        error: `Cannot submit move-out: tenancy status is ${tenancyCheck.status}. Only ACTIVE tenancies can request move-out.` 
      };
    }

    // Insert move-out intention using server client (has proper auth context)
    // Create payload with snake_case column names matching DB schema
    const payload = {
      tenancy_id: data.tenancyId,
      planned_move_out_date: data.plannedMoveOutDate,
      key_area_photos: data.keyAreaPhotos,
      damage_photos: data.damagePhotos,
      rent_paid_up: data.rentPaidUp,
      areas_cleaned: data.areasCleaned,
      has_damage: data.hasDamage,
      damage_description: data.damageDescription,
      notes: data.notes,
      sign_off_status: 'PENDING',
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log('Inserting move-out intention with payload:', payload);
    }

    const { data: insertedData, error: insertError } = await supabase
      .from('move_out_intentions')
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Move-out intention inserted:', insertedData);
    }

    // Update tenancy status using server client
    if (process.env.NODE_ENV !== 'production') {
      console.log('Updating tenancy status...');
    }
    const { error: updateError } = await supabase
      .from('tenancies')
      .update({ status: 'MOVE_OUT_REQUESTED' })
      .eq('id', data.tenancyId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { success: false, error: updateError.message };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Tenancy status updated to MOVE_OUT_REQUESTED');
      console.log('=== SUBMIT COMPLETE ===');
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('submitMoveOutIntention: Exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
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
      .select('id, email, name, roles')
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
    const activeStatuses = ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING'];
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
      console.log('- All tenancies have status COMPLETED');
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

export async function getTenantMoveOutIntention(tenancyId: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('move_out_intentions')
      .select('*')
      .eq('tenancy_id', tenancyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getTenantMoveOutIntention: Database error:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('getTenantMoveOutIntention: Exception:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function resubmitMoveOutIntention(data: {
  intentionId: string;
  tenancyId: string;
  plannedMoveOutDate: string;
  notes: string | null;
  keyAreaPhotos: string[];
  damagePhotos: string[];
  rentPaidUp: boolean;
  areasCleaned: boolean;
  hasDamage: boolean;
  damageDescription: string | null;
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Update the existing intention
    const payload = {
      planned_move_out_date: data.plannedMoveOutDate,
      key_area_photos: data.keyAreaPhotos,
      damage_photos: data.damagePhotos,
      rent_paid_up: data.rentPaidUp,
      areas_cleaned: data.areasCleaned,
      has_damage: data.hasDamage,
      damage_description: data.damageDescription,
      notes: data.notes,
      sign_off_status: 'PENDING',
      coordinator_notes: null,
      coordinator_signed_off_by: null,
      coordinator_signed_off_at: null,
    };

    const { error: updateError } = await supabase
      .from('move_out_intentions')
      .update(payload)
      .eq('id', data.intentionId);

    if (updateError) {
      console.error('resubmitMoveOutIntention: Update error:', updateError);
      return { success: false, error: updateError.message };
    }

    // Update tenancy status back to MOVE_OUT_REQUESTED
    const { error: tenancyError } = await supabase
      .from('tenancies')
      .update({ status: 'MOVE_OUT_REQUESTED' })
      .eq('id', data.tenancyId);

    if (tenancyError) {
      console.error('resubmitMoveOutIntention: Tenancy update error:', tenancyError);
      // Don't fail the whole operation — intention was updated successfully
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('resubmitMoveOutIntention: Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}
