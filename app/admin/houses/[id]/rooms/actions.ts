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

    // Attach tenancies to rooms - prefer OCCUPIED status
    const roomsWithTenancies = rooms.map(room => {
      const roomTenancies = tenanciesByRoom.get(room.id) || [];
      
      // Filter: prefer OCCUPIED, fallback to latest (sorted by created_at desc)
      const occupied = roomTenancies.filter(t => t.status === 'OCCUPIED');
      const activeTenancies = occupied.length > 0 ? occupied : roomTenancies.slice(0, 1);
      
      // Log diagnostic info if no tenancies found
      if (roomTenancies.length === 0) {
        console.log(`[Room ${room.label}] No tenancies found`);
      } else if (occupied.length === 0) {
        console.log(`[Room ${room.label}] No OCCUPIED tenancies, showing latest: ${roomTenancies[0]?.status}`);
      }

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
