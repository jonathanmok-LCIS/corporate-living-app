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
      .eq('is_archived', false)
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

export async function createHouseWithRooms(
  houseData: { name: string; address: string },
  rooms: { label: string; capacity: 1 | 2; rental_price?: number | null }[]
) {
  try {
    const supabaseAdmin = getAdminClient();

    // Create house
    const { data: house, error: houseError } = await supabaseAdmin
      .from('houses')
      .insert([houseData])
      .select()
      .single();

    if (houseError) {
      console.error('Error creating house:', houseError);
      return { data: null, error: houseError.message };
    }

    // Create rooms if any
    if (rooms.length > 0) {
      const roomsToInsert = rooms
        .filter(r => r.label.trim() !== '')
        .map(r => ({
          house_id: house.id,
          label: r.label,
          capacity: r.capacity,
          rental_price: r.rental_price ?? null,
        }));

      if (roomsToInsert.length > 0) {
        const { error: roomsError } = await supabaseAdmin
          .from('rooms')
          .insert(roomsToInsert);

        if (roomsError) {
          console.error('Error creating rooms:', roomsError);
          // House was created but rooms failed - return partial success
          return { 
            data: house, 
            error: `House created but rooms failed: ${roomsError.message}`,
            roomsCreated: 0
          };
        }
      }
    }

    return { 
      data: house, 
      error: null,
      roomsCreated: rooms.filter(r => r.label.trim() !== '').length
    };
  } catch (err) {
    console.error('Unexpected error in createHouseWithRooms:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: message };
  }
}

export async function fetchHouseWithRooms(houseId: string) {
  try {
    const supabaseAdmin = getAdminClient();

    const { data: house, error: houseError } = await supabaseAdmin
      .from('houses')
      .select('*')
      .eq('id', houseId)
      .single();

    if (houseError) {
      return { house: null, rooms: null, error: houseError.message };
    }

    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('house_id', houseId)
      .order('label');

    if (roomsError) {
      return { house, rooms: null, error: roomsError.message };
    }

    return { house, rooms: rooms || [], error: null };
  } catch (err) {
    console.error('Unexpected error in fetchHouseWithRooms:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { house: null, rooms: null, error: message };
  }
}

export async function updateHouseWithRooms(
  houseId: string,
  houseData: { name: string; address: string },
  rooms: { id?: string; label: string; capacity: 1 | 2; rental_price?: number | null }[],
  deletedRoomIds: string[]
) {
  try {
    const supabaseAdmin = getAdminClient();

    // Update house
    const { data: house, error: houseError } = await supabaseAdmin
      .from('houses')
      .update(houseData)
      .eq('id', houseId)
      .select()
      .single();

    if (houseError) {
      console.error('Error updating house:', houseError);
      return { data: null, error: houseError.message };
    }

    // Delete removed rooms
    if (deletedRoomIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('rooms')
        .delete()
        .in('id', deletedRoomIds);

      if (deleteError) {
        console.error('Error deleting rooms:', deleteError);
        return { data: house, error: `House updated but room deletion failed: ${deleteError.message}` };
      }
    }

    // Separate existing rooms (update) from new rooms (insert)
    const existingRooms = rooms.filter(r => r.id && r.label.trim() !== '');
    const newRooms = rooms.filter(r => !r.id && r.label.trim() !== '');

    // Update existing rooms
    for (const room of existingRooms) {
      const { error: updateError } = await supabaseAdmin
        .from('rooms')
        .update({
          label: room.label,
          capacity: room.capacity,
          rental_price: room.rental_price ?? null,
        })
        .eq('id', room.id!);

      if (updateError) {
        console.error('Error updating room:', updateError);
      }
    }

    // Insert new rooms
    if (newRooms.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('rooms')
        .insert(newRooms.map(r => ({
          house_id: houseId,
          label: r.label,
          capacity: r.capacity,
          rental_price: r.rental_price ?? null,
        })));

      if (insertError) {
        console.error('Error inserting new rooms:', insertError);
        return { data: house, error: `House updated but new rooms failed: ${insertError.message}` };
      }
    }

    return { data: house, error: null };
  } catch (err) {
    console.error('Unexpected error in updateHouseWithRooms:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Check if a house can be safely archived.
 * Returns blockers if active tenancies, pending move-outs, or pending inspections exist.
 */
export async function checkArchiveEligibility(houseId: string) {
  try {
    const supabaseAdmin = getAdminClient();

    // Get all rooms for this house
    const { data: rooms } = await supabaseAdmin
      .from('rooms')
      .select('id')
      .eq('house_id', houseId);

    const roomIds = (rooms || []).map(r => r.id);
    const blockers: string[] = [];

    if (roomIds.length > 0) {
      // Check active tenancies
      const { count: activeTenancies } = await supabaseAdmin
        .from('tenancies')
        .select('id', { count: 'exact', head: true })
        .in('room_id', roomIds)
        .in('status', ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING']);

      if (activeTenancies && activeTenancies > 0) {
        blockers.push(`${activeTenancies} active tenancies`);
      }

      // Check pending move-out intentions (via tenancies)
      const { data: tenancyIds } = await supabaseAdmin
        .from('tenancies')
        .select('id')
        .in('room_id', roomIds)
        .neq('status', 'COMPLETED');

      if (tenancyIds && tenancyIds.length > 0) {
        const { count: pendingIntentions } = await supabaseAdmin
          .from('move_out_intentions')
          .select('id', { count: 'exact', head: true })
          .in('tenancy_id', tenancyIds.map(t => t.id))
          .eq('sign_off_status', 'PENDING');

        if (pendingIntentions && pendingIntentions > 0) {
          blockers.push(`${pendingIntentions} pending move-out requests`);
        }
      }

      // Check pending inspections (DRAFT status)
      const { count: draftInspections } = await supabaseAdmin
        .from('inspections')
        .select('id', { count: 'exact', head: true })
        .in('room_id', roomIds)
        .eq('status', 'DRAFT');

      if (draftInspections && draftInspections > 0) {
        blockers.push(`${draftInspections} pending inspections`);
      }
    }

    return { canArchive: blockers.length === 0, blockers, error: null };
  } catch (err) {
    console.error('Error checking archive eligibility:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { canArchive: false, blockers: [], error: message };
  }
}

/**
 * Archive a house (soft-delete).
 */
export async function archiveHouse(houseId: string) {
  try {
    // Pre-flight check
    const eligibility = await checkArchiveEligibility(houseId);
    if (!eligibility.canArchive) {
      return { error: `Cannot archive: ${eligibility.blockers.join(', ')}` };
    }

    const supabaseAdmin = getAdminClient();

    const { error } = await supabaseAdmin
      .from('houses')
      .update({ is_archived: true, active: false })
      .eq('id', houseId);

    if (error) {
      console.error('Error archiving house:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error in archiveHouse:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { error: message };
  }
}
