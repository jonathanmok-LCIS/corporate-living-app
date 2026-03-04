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

export async function fetchRoomsWithTenancies(houseId: string) {
  try {
    const supabaseAdmin = getAdminClient();
    
    // Fetch rooms for this house
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('house_id', houseId)
      .order('label');

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
      return { data: null, error: roomsError.message };
    }

    if (!rooms || rooms.length === 0) {
      return { data: [], error: null };
    }

    // Fetch tenancies for all rooms - prefer OCCUPIED, fallback to latest
    const roomIds = rooms.map(r => r.id);
    const { data: tenancies, error: tenanciesError } = await supabaseAdmin
      .from('tenancies')
      .select(`
        id,
        room_id,
        tenant_user_id,
        start_date,
        end_date,
        rental_price,
        status,
        slot,
        created_at
      `)
      .in('room_id', roomIds)
      .order('created_at', { ascending: false });

    if (tenanciesError) {
      console.error('Error fetching tenancies:', tenanciesError);
      // Still return rooms even if tenancies fail
      return { 
        data: rooms.map(room => ({ ...room, tenancies: [] })), 
        error: null 
      };
    }

    // Fetch tenant profiles for all tenancies
    const tenantIds = (tenancies || [])
      .map(t => t.tenant_user_id)
      .filter((id): id is string => id != null);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .in('id', tenantIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a profile lookup map
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Group tenancies by room and attach tenant data
    const tenanciesWithTenant = (tenancies || []).map(t => ({
      ...t,
      tenant: t.tenant_user_id ? profileMap.get(t.tenant_user_id) : null
    }));

    // Group by room
    const tenanciesByRoom = new Map<string, typeof tenanciesWithTenant>();
    tenanciesWithTenant.forEach(t => {
      const existing = tenanciesByRoom.get(t.room_id) || [];
      tenanciesByRoom.set(t.room_id, [...existing, t]);
    });

    // Attach tenancies to rooms - prefer ACTIVE status
    const roomsWithTenancies = rooms.map(room => {
      const roomTenancies = tenanciesByRoom.get(room.id) || [];
      
      // Return all tenancies with active-like statuses (supports capacity-2 rooms)
      const ACTIVE_STATUSES = ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING'];
      const activeTenancies = roomTenancies.filter(t => ACTIVE_STATUSES.includes(t.status));

      return {
        ...room,
        tenancies: activeTenancies
      };
    });

    return { data: roomsWithTenancies, error: null };

  } catch (err) {
    console.error('Unexpected error in fetchRoomsWithTenancies:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: message };
  }
}

/* ------------------------------------------------------------------ */
/*  Room CRUD                                                          */
/* ------------------------------------------------------------------ */

export async function addRoom(
  houseId: string,
  data: { label: string; capacity: 1 | 2; rental_price: number | null }
): Promise<{ data: unknown | null; error: string | null }> {
  try {
    const supabaseAdmin = getAdminClient();

    // Duplicate label check (active rooms only)
    const { count, error: checkErr } = await supabaseAdmin
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('house_id', houseId)
      .ilike('label', data.label.trim())
      .eq('active', true);

    if (checkErr) return { data: null, error: checkErr.message };
    if ((count ?? 0) > 0) return { data: null, error: 'A room with this label already exists in this house.' };

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .insert({
        house_id: houseId,
        label: data.label.trim(),
        capacity: data.capacity,
        rental_price: data.rental_price,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: room, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateRoom(
  roomId: string,
  data: { label: string; capacity: 1 | 2; rental_price: number | null }
): Promise<{ error: string | null }> {
  try {
    const supabaseAdmin = getAdminClient();

    // Get current room to find house_id
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('rooms')
      .select('house_id')
      .eq('id', roomId)
      .single();

    if (fetchErr || !existing) return { error: 'Room not found' };

    // Duplicate label check (excluding self)
    const { count } = await supabaseAdmin
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('house_id', existing.house_id)
      .ilike('label', data.label.trim())
      .eq('active', true)
      .neq('id', roomId);

    if ((count ?? 0) > 0) return { error: 'A room with this label already exists.' };

    const { error } = await supabaseAdmin
      .from('rooms')
      .update({
        label: data.label.trim(),
        capacity: data.capacity,
        rental_price: data.rental_price,
      })
      .eq('id', roomId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function archiveRoom(roomId: string): Promise<{ error: string | null }> {
  try {
    const supabaseAdmin = getAdminClient();

    // Check for active tenancies
    const { count } = await supabaseAdmin
      .from('tenancies')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .in('status', ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING']);

    if (count && count > 0) {
      return { error: 'Cannot archive: room has active tenancies.' };
    }

    const { error } = await supabaseAdmin
      .from('rooms')
      .update({ active: false })
      .eq('id', roomId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function restoreRoom(roomId: string): Promise<{ error: string | null }> {
  try {
    const supabaseAdmin = getAdminClient();

    const { error } = await supabaseAdmin
      .from('rooms')
      .update({ active: true })
      .eq('id', roomId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
