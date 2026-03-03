'use server';

import { createClient } from '@/lib/supabase-server';

export async function getTenantPendingTenancy() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get the tenant's pending or newly occupied tenancy
  const { data, error } = await supabase
    .from('tenancies')
    .select(`
      *,
      room:rooms(
        id,
        label,
        house:houses(
          id,
          name,
          address
        )
      )
    `)
    .eq('tenant_user_id', user.id)
    .in('status', ['ACTIVE', 'MOVE_OUT_REQUESTED'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getPreviousTenantMoveOutPhotos(roomId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get the most recent ENDED tenancy for this room with move-out photos
  const { data: previousTenancy, error: tenancyError } = await supabase
    .from('tenancies')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'COMPLETED')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tenancyError || !previousTenancy) {
    console.log('No previous tenancy found for room', roomId);
    return { data: null, error: null }; // No error, just no previous data
  }

  // Get the move-out intention for the previous tenancy
  const { data: moveOutData, error: moveOutError } = await supabase
    .from('move_out_intentions')
    .select('id, key_area_photos, damage_photos, notes, damage_description')
    .eq('tenancy_id', previousTenancy.id)
    .maybeSingle();

  if (moveOutError) {
    console.error('Error fetching previous move-out data:', moveOutError);
    return { data: null, error: null }; // Don't fail, just return no data
  }

  if (!moveOutData) {
    return { data: null, error: null };
  }

  // Generate signed URLs for all photos
  const keyAreaSignedUrls: string[] = [];
  const damageSignedUrls: string[] = [];

  // Generate signed URLs for key area photos
  for (const photoPath of (moveOutData.key_area_photos || [])) {
    const { data: signedData } = await supabase.storage
      .from('move-out-photos')
      .createSignedUrl(photoPath, 3600); // 1 hour expiry
    
    if (signedData?.signedUrl) {
      keyAreaSignedUrls.push(signedData.signedUrl);
    }
  }

  // Generate signed URLs for damage photos
  for (const photoPath of (moveOutData.damage_photos || [])) {
    const { data: signedData } = await supabase.storage
      .from('move-out-photos')
      .createSignedUrl(photoPath, 3600);
    
    if (signedData?.signedUrl) {
      damageSignedUrls.push(signedData.signedUrl);
    }
  }

  return { 
    data: {
      id: moveOutData.id,
      key_area_photos: keyAreaSignedUrls,
      damage_photos: damageSignedUrls,
      notes: moveOutData.notes,
      damage_description: moveOutData.damage_description,
    }, 
    error: null 
  };
}

export async function confirmKeysReceived(tenancyId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Update tenancy to mark keys as received
  const { error } = await supabase
    .from('tenancies')
    .update({
      keys_received: true,
      keys_received_at: new Date().toISOString(),
    })
    .eq('id', tenancyId)
    .eq('tenant_user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function submitMoveInAcknowledgement(data: {
  tenancyId: string;
  conditionAccepted: boolean;
  defectPhotos: string[];
  defectNotes: string;
  previousMoveOutId: string | null;
  signatureDataUrl: string;
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Create the move-in acknowledgement record
  const { error: ackError } = await supabase
    .from('move_in_acknowledgements')
    .insert({
      tenancy_id: data.tenancyId,
      signed_by: user.id,
      signed_at: new Date().toISOString(),
      signature_image_url: data.signatureDataUrl,
      condition_accepted: data.conditionAccepted,
      defect_photos: data.defectPhotos,
      defect_notes: data.defectNotes || null,
      previous_move_out_id: data.previousMoveOutId,
      audit_json: {
        submitted_at: new Date().toISOString(),
        user_agent: 'web',
        condition_accepted: data.conditionAccepted,
        defect_photos_count: data.defectPhotos.length,
      }
    });

  if (ackError) {
    console.error('Error creating acknowledgement:', ackError);
    return { success: false, error: ackError.message };
  }

  // Update tenancy to mark keys as received and set status
  const { error: tenancyError } = await supabase
    .from('tenancies')
    .update({
      keys_received: true,
      keys_received_at: new Date().toISOString(),
      status: 'ACTIVE',
    })
    .eq('id', data.tenancyId)
    .eq('tenant_user_id', user.id);

  if (tenancyError) {
    console.error('Error updating tenancy:', tenancyError);
    return { success: false, error: tenancyError.message };
  }

  return { success: true, error: null };
}
