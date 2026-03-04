'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { House, Profile, HouseCoordinator } from '@/lib/types';
import { fetchRoomsWithTenancies } from './rooms/actions';
import { assignCoordinator, removeCoordinator } from './coordinators/actions';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RoomWithTenancies {
  id: string;
  label: string;
  capacity: 1 | 2;
  rental_price?: number | null;
  active: boolean;
  tenancies?: Array<{
    id: string;
    status: string;
    start_date: string;
    end_date?: string;
    rental_price?: string;
    slot?: string;
    tenant?: { name: string; email: string };
  }>;
}

interface CoordinatorWithProfile extends HouseCoordinator {
  profile: Profile;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function HouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const houseId = params.id as string;

  const [house, setHouse] = useState<House | null>(null);
  const [rooms, setRooms] = useState<RoomWithTenancies[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorWithProfile[]>([]);
  const [availableCoordinators, setAvailableCoordinators] = useState<Profile[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState('');
  const [loading, setLoading] = useState(true);

  /* ---- data loading --------------------------------------------- */

  const fetchHouse = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('houses')
      .select('*')
      .eq('id', houseId)
      .single();
    if (error) {
      console.error('Error fetching house:', error);
      router.push('/admin/houses');
      return;
    }
    setHouse(data);
  }, [houseId, router]);

  const fetchRooms = useCallback(async () => {
    const result = await fetchRoomsWithTenancies(houseId);
    if (!result.error) setRooms(result.data || []);
  }, [houseId]);

  const fetchCoords = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('house_coordinators')
      .select('*, profile:user_id(id, name, email, roles)')
      .eq('house_id', houseId);
    setCoordinators((data as CoordinatorWithProfile[]) || []);
  }, [houseId]);

  const fetchAvailable = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .overlaps('roles', ['COORDINATOR', 'ADMIN'])
      .order('name');
    setAvailableCoordinators(data || []);
  }, []);

  useEffect(() => {
    Promise.all([fetchHouse(), fetchRooms(), fetchCoords(), fetchAvailable()]).finally(() =>
      setLoading(false)
    );
  }, [fetchHouse, fetchRooms, fetchCoords, fetchAvailable]);

  /* ---- coordinator actions -------------------------------------- */

  async function handleAssign() {
    if (!selectedCoordinator) return;
    const result = await assignCoordinator(houseId, selectedCoordinator);
    if (!result.success) {
      alert(result.error);
      return;
    }
    setSelectedCoordinator('');
    fetchCoords();
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this coordinator?')) return;
    const result = await removeCoordinator(id);
    if (!result.success) {
      alert(result.error);
      return;
    }
    fetchCoords();
  }

  /* ---- derived stats (slot-based: capacity=2 counts as 2 slots) -- */

  const activeRooms = rooms.filter((r) => r.active);
  const ACTIVE_STATUSES = ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING'];
  const totalSlots = activeRooms.reduce((s, r) => s + r.capacity, 0);
  // Each tenancy row = 1 occupied slot
  const occupiedSlots = activeRooms.reduce((s, r) => {
    const activeCount = (r.tenancies || []).filter((t) => ACTIVE_STATUSES.includes(t.status)).length;
    return s + activeCount;
  }, 0);
  const availableSlots = totalSlots - occupiedSlots;
  const totalRevenue = activeRooms.reduce((s, r) => {
    const activeTenancies = (r.tenancies || []).filter((t) => ACTIVE_STATUSES.includes(t.status));
    return s + activeTenancies.reduce((rs, t) => rs + (t.rental_price ? parseFloat(t.rental_price) : 0), 0);
  }, 0);

  const assignedIds = coordinators.map((c) => c.user_id);
  const filteredAvailable = availableCoordinators.filter((c) => !assignedIds.includes(c.id));

  /* ---- loading -------------------------------------------------- */

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading…</div>;
  }

  if (!house) {
    return <div className="text-center py-12 text-gray-500">House not found.</div>;
  }

  /* ---- render --------------------------------------------------- */

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Back link */}
      <button
        onClick={() => router.push('/admin/houses')}
        className="text-purple-600 hover:text-purple-800 flex items-center text-sm"
      >
        ← Back to Houses
      </button>

      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{house.name}</h1>
          {house.address && <p className="text-gray-500 mt-1">{house.address}</p>}
        </div>
        <Link
          href={`/admin/houses/quick-setup?id=${house.id}`}
          className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 text-sm font-medium transition flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit House
        </Link>
      </div>

      {/* ============================================================ */}
      {/*  KPI CARDS                                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{totalSlots}</p>
          <p className="text-xs text-gray-500 font-medium uppercase mt-1">Total Slots</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-purple-700">
            {occupiedSlots}/{totalSlots}
          </p>
          <p className="text-xs text-gray-500 font-medium uppercase mt-1">Occupied</p>
        </div>
        <div className={`border rounded-lg p-4 text-center shadow-sm ${availableSlots > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-2xl font-bold ${availableSlots > 0 ? 'text-green-700' : 'text-gray-400'}`}>
            {availableSlots}
          </p>
          <p className="text-xs text-gray-500 font-medium uppercase mt-1">Available</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 font-medium uppercase mt-1">Monthly Revenue</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROOMS SECTION                                                */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg shadow border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Rooms
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({activeRooms.length} rooms · {totalSlots} slots)
            </span>
          </h2>
        </div>

        {activeRooms.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400">
            <p>No rooms configured.</p>
            <Link
              href={`/admin/houses/quick-setup?id=${house.id}`}
              className="text-purple-600 hover:underline text-sm mt-1 inline-block"
            >
              Add rooms →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-2.5 px-5 text-gray-500 font-medium">Room</th>
                  <th className="text-left py-2.5 px-5 text-gray-500 font-medium">Capacity</th>
                  <th className="text-left py-2.5 px-5 text-gray-500 font-medium">Tenant</th>
                  <th className="text-left py-2.5 px-5 text-gray-500 font-medium">Status</th>
                  <th className="text-right py-2.5 px-5 text-gray-500 font-medium">Rent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeRooms.map((room) => {
                  const tenancy = room.tenancies?.[0];
                  const isOccupied = tenancy && ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING'].includes(tenancy.status);

                  return (
                    <tr key={room.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-medium text-gray-900">{room.label}</td>
                      <td className="py-3 px-5 text-gray-600">
                        {room.capacity} {room.capacity === 1 ? 'person' : 'people'}
                      </td>
                      <td className="py-3 px-5">
                        {isOccupied && tenancy?.tenant ? (
                          <div>
                            <p className="text-gray-900">{tenancy.tenant.name}</p>
                            <p className="text-xs text-gray-400">{tenancy.tenant.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        {isOccupied ? (
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                              tenancy.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : tenancy.status === 'MOVE_OUT_REQUESTED'
                                  ? 'bg-amber-100 text-amber-700'
                                  : tenancy.status === 'MOVE_OUT_APPROVED'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {tenancy.status === 'ACTIVE'
                              ? 'Occupied'
                              : tenancy.status === 'MOVE_OUT_REQUESTED'
                                ? 'Move-Out Requested'
                                : tenancy.status === 'MOVE_OUT_APPROVED'
                                  ? 'Move-Out Approved'
                                  : 'Inspection Pending'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right text-gray-900">
                        {isOccupied && tenancy?.rental_price
                          ? `$${parseFloat(tenancy.rental_price).toFixed(2)}`
                          : room.rental_price
                            ? `$${room.rental_price.toFixed(2)}`
                            : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  COORDINATORS SECTION                                         */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg shadow border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Coordinators
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({coordinators.length} assigned)
            </span>
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Assign form */}
          {filteredAvailable.length > 0 && (
            <div className="flex gap-3">
              <select
                value={selectedCoordinator}
                onChange={(e) => setSelectedCoordinator(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-900"
              >
                <option value="">Assign a coordinator…</option>
                {filteredAvailable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!selectedCoordinator}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>
          )}

          {/* Coordinator list */}
          {coordinators.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No coordinators assigned yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {coordinators.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.profile?.name}</p>
                    <p className="text-xs text-gray-400">{c.profile?.email}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(c.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
