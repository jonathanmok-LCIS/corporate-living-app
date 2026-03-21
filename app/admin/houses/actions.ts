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

function toMoney(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
}

type RentReviewInputRow = {
  roomId: string;
  roomLabel: string;
  weighting: number;
  calculatedRent: number;
  finalRent: number;
};

type SaveRentReviewPayload = {
  houseId: string;
  effectiveDate?: string | null;
  currentRentalCost: number;
  projectedRentalCost: number;
  bufferPercentage: number;
  totalWeighting: number;
  rows: RentReviewInputRow[];
  note?: string | null;
  status: 'DRAFT' | 'APPLIED';
};

type UpdateRentReviewPayload = {
  id: string;
  effectiveDate?: string | null;
  status?: 'DRAFT' | 'APPLIED';
  rentalCost?: number | null;
  projectedRentalCost?: number | null;
  bufferPercentage?: number | null;
  note?: string | null;
};

export async function saveHouseRentReview(payload: SaveRentReviewPayload): Promise<{ error: string | null }> {
  try {
    const supabaseAdmin = getAdminClient();

    if (!payload.houseId) return { error: 'houseId is required' };
    if (!payload.rows || payload.rows.length === 0) return { error: 'At least one room is required' };

    const { data: house, error: houseError } = await supabaseAdmin
      .from('houses')
      .select('id, monthly_cost')
      .eq('id', payload.houseId)
      .single();

    if (houseError || !house) return { error: houseError?.message || 'House not found' };

    const roomRents: Record<string, number> = {};
    for (const row of payload.rows) {
      roomRents[row.roomLabel] = toMoney(row.finalRent);
    }

    const receivableAmount = toMoney(payload.rows.reduce((sum, row) => sum + toMoney(row.finalRent), 0));

    const { error } = await supabaseAdmin
      .from('house_financial_history')
      .insert({
        house_id: payload.houseId,
        effective_date: payload.effectiveDate || null,
        review_status: payload.status,
        monthly_cost: house.monthly_cost,
        current_rental_cost: toMoney(payload.currentRentalCost),
        projected_rental_cost: toMoney(payload.projectedRentalCost),
        buffer_percentage: payload.bufferPercentage,
        total_weighting: payload.totalWeighting,
        receivable_amount: receivableAmount,
        room_rents: roomRents,
        note: payload.note || null,
      });

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateHouseRentReviewRecord(
  payload: UpdateRentReviewPayload
): Promise<{ error: string | null }> {
  try {
    const supabaseAdmin = getAdminClient();

    if (!payload.id) return { error: 'Record id is required' };

    const updateData: {
      effective_date?: string | null;
      review_status?: 'DRAFT' | 'APPLIED';
      current_rental_cost?: number | null;
      projected_rental_cost?: number | null;
      buffer_percentage?: number | null;
      note?: string | null;
    } = {};

    if (payload.effectiveDate !== undefined) updateData.effective_date = payload.effectiveDate;
    if (payload.status !== undefined) updateData.review_status = payload.status;
    if (payload.rentalCost !== undefined) updateData.current_rental_cost = payload.rentalCost;
    if (payload.projectedRentalCost !== undefined) updateData.projected_rental_cost = payload.projectedRentalCost;
    if (payload.bufferPercentage !== undefined) updateData.buffer_percentage = payload.bufferPercentage;
    if (payload.note !== undefined) updateData.note = payload.note;

    const { error } = await supabaseAdmin
      .from('house_financial_history')
      .update(updateData)
      .eq('id', payload.id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteHouseRentReviewRecord(recordId: string): Promise<{ error: string | null }> {
  try {
    const supabaseAdmin = getAdminClient();
    if (!recordId) return { error: 'Record id is required' };

    const { error } = await supabaseAdmin
      .from('house_financial_history')
      .delete()
      .eq('id', recordId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createHouseFinancialSnapshot(
  houseId: string,
  note?: string
): Promise<{ error: string | null }> {
  try {
    const supabaseAdmin = getAdminClient();

    const { data: house, error: houseError } = await supabaseAdmin
      .from('houses')
      .select('id, monthly_cost')
      .eq('id', houseId)
      .single();

    if (houseError || !house) {
      return { error: houseError?.message || 'House not found' };
    }

    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, label, rental_price')
      .eq('house_id', houseId)
      .eq('active', true)
      .order('label');

    if (roomsError) return { error: roomsError.message };

    const roomIds = (rooms || []).map((room) => room.id);
    let activeTenancies: Array<{ room_id: string; rental_price: number | null }> = [];

    if (roomIds.length > 0) {
      const { data: tenancyRows, error: tenanciesError } = await supabaseAdmin
        .from('tenancies')
        .select('room_id, rental_price')
        .in('room_id', roomIds)
        .in('status', ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING']);

      if (tenanciesError) return { error: tenanciesError.message };
      activeTenancies = tenancyRows || [];
    }

    const tenancySumByRoom = new Map<string, number>();
    for (const tenancy of activeTenancies) {
      const current = tenancySumByRoom.get(tenancy.room_id) || 0;
      tenancySumByRoom.set(tenancy.room_id, toMoney(current + toMoney(tenancy.rental_price)));
    }

    const roomRents: Record<string, number> = {};
    for (const room of rooms || []) {
      const activeRent = tenancySumByRoom.get(room.id);
      roomRents[room.label] = toMoney(activeRent ?? room.rental_price ?? 0);
    }

    const receivableAmount = toMoney(Object.values(roomRents).reduce((sum, amount) => sum + amount, 0));

    const { error: insertError } = await supabaseAdmin
      .from('house_financial_history')
      .insert({
        house_id: houseId,
        monthly_cost: house.monthly_cost,
        receivable_amount: receivableAmount,
        room_rents: roomRents,
        note: note || null,
      });

    if (insertError) return { error: insertError.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function fetchHouseFinancialHistory(houseId: string) {
  try {
    const supabaseAdmin = getAdminClient();

    const { data: house, error: houseError } = await supabaseAdmin
      .from('houses')
      .select('id, name, monthly_cost')
      .eq('id', houseId)
      .single();

    if (houseError) {
      return { house: null, data: null, error: houseError.message };
    }

    const { data, error } = await supabaseAdmin
      .from('house_financial_history')
      .select('id, recorded_at, effective_date, review_status, monthly_cost, current_rental_cost, projected_rental_cost, buffer_percentage, total_weighting, receivable_amount, room_rents, note')
      .eq('house_id', houseId)
      .order('recorded_at', { ascending: false });

    if (error) {
      return { house, data: null, error: error.message };
    }

    return { house, data: data || [], error: null };
  } catch (err) {
    return {
      house: null,
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
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

export interface HouseWithStats {
  id: string;
  name: string;
  address: string;
  totalSlots: number;   // sum of room capacities
  occupiedSlots: number; // count of active tenancy rows
  coordinatorCount: number;
  pendingMoveOuts: number;
  pendingInspections: number;
  lastInspectionDate: string | null;
  totalWeeklyRent: number; // sum of active tenancy rental_price values
}

/** Fetches all active houses with aggregated room/tenancy/coordinator stats.
 *  Queries are parallelized where possible to reduce latency. */
export async function fetchHousesWithStats(): Promise<{
  data: HouseWithStats[] | null;
  error: string | null;
}> {
  try {
    const supabaseAdmin = getAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // Phase 1: Houses
    const { data: houses, error: hErr } = await supabaseAdmin
      .from('houses')
      .select('id, name, address')
      .eq('is_archived', false)
      .order('name');

    if (hErr) return { data: null, error: hErr.message };
    if (!houses || houses.length === 0) return { data: [], error: null };

    const houseIds = houses.map((h) => h.id);

    // Phase 2: All queries that only need houseIds — run in parallel
    const [roomsRes, coordsRes, draftRes, latestRes] = await Promise.all([
      supabaseAdmin.from('rooms').select('id, house_id, capacity').in('house_id', houseIds).eq('active', true),
      supabaseAdmin.from('house_coordinators').select('house_id').in('house_id', houseIds),
      supabaseAdmin.from('inspections').select('id, house_id').in('house_id', houseIds).eq('status', 'DRAFT'),
      supabaseAdmin.from('inspections').select('house_id, finalised_at').in('house_id', houseIds).eq('status', 'FINAL').order('finalised_at', { ascending: false }),
    ]);

    const rooms = roomsRes.data || [];
    const allRoomIds = rooms.map((r) => r.id);

    // Build room lookup
    const roomMap = new Map<string, { house_id: string; capacity: number }>();
    for (const r of rooms) {
      roomMap.set(r.id, { house_id: r.house_id, capacity: r.capacity ?? 1 });
    }

    // Phase 3: Tenancy data (needs roomIds from phase 2)
    let tenancyRows: { id: string; room_id: string; rental_price: number | null }[] = [];
    if (allRoomIds.length > 0) {
      const { data: t } = await supabaseAdmin
        .from('tenancies')
        .select('id, room_id, rental_price')
        .in('room_id', allRoomIds)
        .in('status', ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING'])
        .lte('start_date', today)
        .or('end_date.is.null,end_date.gte.' + today);
      tenancyRows = t || [];
    }

    // Phase 4: Move-out intentions (needs tenancy IDs)
    const tenancyIdToHouse: Record<string, string> = {};
    for (const t of tenancyRows) {
      const rm = roomMap.get(t.room_id);
      if (rm) tenancyIdToHouse[t.id] = rm.house_id;
    }

    let pendingMoveOuts: { tenancy_id: string; house_id: string }[] = [];
    const tenancyIds = Object.keys(tenancyIdToHouse);
    if (tenancyIds.length > 0) {
      const { data: moi } = await supabaseAdmin
        .from('move_out_intentions')
        .select('tenancy_id, sign_off_status')
        .in('tenancy_id', tenancyIds)
        .eq('sign_off_status', 'PENDING');
      pendingMoveOuts = (moi || []).map((m) => ({
        tenancy_id: m.tenancy_id,
        house_id: tenancyIdToHouse[m.tenancy_id],
      }));
    }

    // ------ Aggregate per house ------
    const slotsByHouse = new Map<string, number>();
    for (const r of rooms) {
      slotsByHouse.set(r.house_id, (slotsByHouse.get(r.house_id) || 0) + (r.capacity ?? 1));
    }

    const occupiedSlotsByHouse = new Map<string, number>();
    for (const t of tenancyRows) {
      const rm = roomMap.get(t.room_id);
      if (rm) occupiedSlotsByHouse.set(rm.house_id, (occupiedSlotsByHouse.get(rm.house_id) || 0) + 1);
    }

    const coordCountByHouse = new Map<string, number>();
    for (const c of coordsRes.data || []) {
      coordCountByHouse.set(c.house_id, (coordCountByHouse.get(c.house_id) || 0) + 1);
    }

    const moByHouse = new Map<string, number>();
    for (const m of pendingMoveOuts) {
      moByHouse.set(m.house_id, (moByHouse.get(m.house_id) || 0) + 1);
    }

    const draftByHouse = new Map<string, number>();
    for (const d of draftRes.data || []) {
      if (d.house_id) draftByHouse.set(d.house_id, (draftByHouse.get(d.house_id) || 0) + 1);
    }

    const latestByHouse = new Map<string, string>();
    for (const i of latestRes.data || []) {
      if (i.house_id && !latestByHouse.has(i.house_id)) latestByHouse.set(i.house_id, i.finalised_at);
    }

    const rentByHouse = new Map<string, number>();
    for (const t of tenancyRows) {
      const rm = roomMap.get(t.room_id);
      if (rm && t.rental_price) {
        rentByHouse.set(rm.house_id, (rentByHouse.get(rm.house_id) || 0) + t.rental_price);
      }
    }

    const result: HouseWithStats[] = houses.map((h) => ({
      id: h.id,
      name: h.name,
      address: h.address || '',
      totalSlots: slotsByHouse.get(h.id) || 0,
      occupiedSlots: occupiedSlotsByHouse.get(h.id) || 0,
      coordinatorCount: coordCountByHouse.get(h.id) || 0,
      pendingMoveOuts: moByHouse.get(h.id) || 0,
      pendingInspections: draftByHouse.get(h.id) || 0,
      lastInspectionDate: latestByHouse.get(h.id) || null,
      totalWeeklyRent: rentByHouse.get(h.id) || 0,
    }));

    return { data: result, error: null };
  } catch (err) {
    console.error('Unexpected error in fetchHousesWithStats:', err);
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

    // 1. Check for duplicate house name + address
    const { count: dupCount, error: dupError } = await supabaseAdmin
      .from('houses')
      .select('id', { count: 'exact', head: true })
      .ilike('name', houseData.name.trim())
      .ilike('address', houseData.address.trim())
      .eq('is_archived', false);

    if (dupError) {
      return { data: null, error: `Error checking duplicates: ${dupError.message}` };
    }
    if ((dupCount ?? 0) > 0) {
      return { data: null, error: 'A house with this name and address already exists.' };
    }

    // 2. Create house
    const { data: house, error: houseError } = await supabaseAdmin
      .from('houses')
      .insert([{ name: houseData.name.trim(), address: houseData.address.trim() }])
      .select()
      .single();

    if (houseError) {
      console.error('Error creating house:', houseError);
      return { data: null, error: houseError.message };
    }

    // 3. Create rooms (compensating transaction – rollback house on failure)
    const roomsToInsert = rooms
      .filter(r => r.label.trim() !== '')
      .map(r => ({
        house_id: house.id,
        label: r.label.trim(),
        capacity: r.capacity,
        rental_price: r.rental_price ?? null,
      }));

    if (roomsToInsert.length > 0) {
      const { error: roomsError } = await supabaseAdmin
        .from('rooms')
        .insert(roomsToInsert);

      if (roomsError) {
        console.error('Error creating rooms, rolling back house:', roomsError);
        // Compensating transaction: delete the house we just created
        await supabaseAdmin.from('houses').delete().eq('id', house.id);
        return { data: null, error: `Failed to create rooms: ${roomsError.message}` };
      }
    }

    return { 
      data: house, 
      error: null,
      roomsCreated: roomsToInsert.length,
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
 * Check for duplicate house name + address (case-insensitive).
 * Optionally exclude a house by ID (for edit mode).
 */
export async function checkDuplicateHouse(
  name: string,
  address: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; error: string | null }> {
  try {
    const supabaseAdmin = getAdminClient();

    let query = supabaseAdmin
      .from('houses')
      .select('id', { count: 'exact', head: true })
      .ilike('name', name.trim())
      .ilike('address', address.trim())
      .eq('is_archived', false);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;
    if (error) return { isDuplicate: false, error: error.message };
    return { isDuplicate: (count ?? 0) > 0, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { isDuplicate: false, error: message };
  }
}

/**
 * Update house name and address (with duplicate check).
 */
export async function updateHouseInfo(
  houseId: string,
  data: { name: string; address: string; monthly_cost?: number | null }
): Promise<{ error: string | null }> {
  try {
    const supabaseAdmin = getAdminClient();

    if (!data.name.trim()) return { error: 'House name is required' };
    if (!data.address.trim()) return { error: 'Address is required' };

    const dup = await checkDuplicateHouse(data.name, data.address, houseId);
    if (dup.error) return { error: dup.error };
    if (dup.isDuplicate) return { error: 'A house with this name and address already exists.' };

    const { error } = await supabaseAdmin
      .from('houses')
      .update({
        name: data.name.trim(),
        address: data.address.trim(),
        monthly_cost: data.monthly_cost ?? null,
      })
      .eq('id', houseId);

    if (error) return { error: error.message };

    const snapshot = await createHouseFinancialSnapshot(houseId, 'House details updated');
    if (snapshot.error) {
      console.error('Failed to record house financial snapshot:', snapshot.error);
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
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
