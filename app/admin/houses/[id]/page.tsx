'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { House, Profile, HouseCoordinator } from '@/lib/types';
import {
  fetchRoomsWithTenancies,
  addRoom as addRoomAction,
  updateRoom as updateRoomAction,
  archiveRoom as archiveRoomAction,
  restoreRoom as restoreRoomAction,
} from './rooms/actions';
import { assignCoordinator, removeCoordinator } from './coordinators/actions';
import { updateHouseInfo, checkArchiveEligibility, archiveHouse } from '../actions';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Tenancy {
  id: string;
  status: string;
  start_date: string;
  end_date?: string;
  rental_price?: string;
  slot?: string;
  tenant?: { name: string; email: string };
}

interface RoomWithTenancies {
  id: string;
  label: string;
  capacity: 1 | 2;
  rental_price?: number | null;
  active: boolean;
  tenancies?: Tenancy[];
}

interface CoordinatorWithProfile extends HouseCoordinator {
  profile: Profile;
}

const ACTIVE_STATUSES = ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const houseId = params.id as string;

  /* ---- core data ------------------------------------------------ */
  const [house, setHouse] = useState<House | null>(null);
  const [rooms, setRooms] = useState<RoomWithTenancies[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorWithProfile[]>([]);
  const [availableCoordinators, setAvailableCoordinators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---- house inline editing ------------------------------------- */
  const [editingHouse, setEditingHouse] = useState(false);
  const [houseForm, setHouseForm] = useState({ name: '', address: '' });
  const [houseError, setHouseError] = useState('');
  const [houseSaving, setHouseSaving] = useState(false);

  /* ---- room management ------------------------------------------ */
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);
  const [roomForm, setRoomForm] = useState({ label: '', capacity: 1 as 1 | 2, rental_price: '' });
  const [roomError, setRoomError] = useState('');
  const [roomSaving, setRoomSaving] = useState(false);
  const [showArchivedRooms, setShowArchivedRooms] = useState(false);

  /* ---- coordinator ---------------------------------------------- */
  const [selectedCoordinator, setSelectedCoordinator] = useState('');

  /* ---- archive house -------------------------------------------- */
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveBlockers, setArchiveBlockers] = useState<string[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [checkingArchive, setCheckingArchive] = useState(false);

  /* ================================================================ */
  /*  DATA LOADING                                                     */
  /* ================================================================ */

  const fetchHouse = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from('houses').select('*').eq('id', houseId).single();
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

  /* ================================================================ */
  /*  HOUSE INFO EDITING                                               */
  /* ================================================================ */

  function startEditHouse() {
    if (!house) return;
    setHouseForm({ name: house.name, address: house.address || '' });
    setHouseError('');
    setEditingHouse(true);
  }

  async function saveHouseInfo() {
    if (!houseForm.name.trim()) {
      setHouseError('House name is required');
      return;
    }
    if (!houseForm.address.trim()) {
      setHouseError('Address is required');
      return;
    }
    setHouseSaving(true);
    setHouseError('');

    const result = await updateHouseInfo(houseId, {
      name: houseForm.name.trim(),
      address: houseForm.address.trim(),
    });

    if (result.error) {
      setHouseError(result.error);
      setHouseSaving(false);
      return;
    }

    await fetchHouse();
    setEditingHouse(false);
    setHouseSaving(false);
  }

  /* ================================================================ */
  /*  ROOM MANAGEMENT                                                  */
  /* ================================================================ */

  function startAddRoom() {
    setRoomForm({
      label: `Room ${rooms.filter((r) => r.active).length + 1}`,
      capacity: 1,
      rental_price: '',
    });
    setRoomError('');
    setAddingRoom(true);
    setEditingRoomId(null);
  }

  function startEditRoom(room: RoomWithTenancies) {
    setRoomForm({
      label: room.label,
      capacity: room.capacity,
      rental_price: room.rental_price != null ? String(room.rental_price) : '',
    });
    setRoomError('');
    setEditingRoomId(room.id);
    setAddingRoom(false);
  }

  async function saveRoom() {
    if (!roomForm.label.trim()) {
      setRoomError('Label is required');
      return;
    }
    const price = parseFloat(roomForm.rental_price);
    if (!roomForm.rental_price || isNaN(price) || price <= 0) {
      setRoomError('Enter a rental price greater than 0');
      return;
    }

    setRoomSaving(true);
    setRoomError('');

    const payload = { label: roomForm.label.trim(), capacity: roomForm.capacity, rental_price: price };

    if (addingRoom) {
      const result = await addRoomAction(houseId, payload);
      if (result.error) {
        setRoomError(result.error);
        setRoomSaving(false);
        return;
      }
    } else if (editingRoomId) {
      const result = await updateRoomAction(editingRoomId, payload);
      if (result.error) {
        setRoomError(result.error);
        setRoomSaving(false);
        return;
      }
    }

    await fetchRooms();
    setAddingRoom(false);
    setEditingRoomId(null);
    setRoomSaving(false);
  }

  function cancelRoomEdit() {
    setAddingRoom(false);
    setEditingRoomId(null);
    setRoomError('');
  }

  async function handleArchiveRoom(roomId: string) {
    if (!confirm('Archive this room? It will be hidden from the active list.')) return;
    const result = await archiveRoomAction(roomId);
    if (result.error) {
      alert(result.error);
      return;
    }
    fetchRooms();
  }

  async function handleRestoreRoom(roomId: string) {
    const result = await restoreRoomAction(roomId);
    if (result.error) {
      alert(result.error);
      return;
    }
    fetchRooms();
  }

  /* ================================================================ */
  /*  COORDINATOR MANAGEMENT                                           */
  /* ================================================================ */

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

  /* ================================================================ */
  /*  ARCHIVE HOUSE                                                    */
  /* ================================================================ */

  async function handleArchiveCheck() {
    setCheckingArchive(true);
    try {
      const result = await checkArchiveEligibility(houseId);
      if (result.error) {
        alert('Error: ' + result.error);
        return;
      }
      setArchiveBlockers(result.blockers);
      setShowArchiveModal(true);
    } finally {
      setCheckingArchive(false);
    }
  }

  async function handleArchiveConfirm() {
    setArchiving(true);
    try {
      const result = await archiveHouse(houseId);
      if (result.error) {
        alert('Error: ' + result.error);
        return;
      }
      router.push('/admin/houses');
    } finally {
      setArchiving(false);
      setShowArchiveModal(false);
    }
  }

  /* ================================================================ */
  /*  DERIVED STATS                                                    */
  /* ================================================================ */

  const activeRooms = rooms.filter((r) => r.active);
  const archivedRooms = rooms.filter((r) => !r.active);
  const totalSlots = activeRooms.reduce((s, r) => s + r.capacity, 0);
  const occupiedSlots = activeRooms.reduce((s, r) => {
    return s + (r.tenancies || []).filter((t) => ACTIVE_STATUSES.includes(t.status)).length;
  }, 0);
  const availableSlots = totalSlots - occupiedSlots;
  const totalRevenue = activeRooms.reduce((s, r) => {
    const active = (r.tenancies || []).filter((t) => ACTIVE_STATUSES.includes(t.status));
    return s + active.reduce((rs, t) => rs + (t.rental_price ? parseFloat(t.rental_price) : 0), 0);
  }, 0);

  const assignedIds = coordinators.map((c) => c.user_id);
  const filteredAvailable = availableCoordinators.filter((c) => !assignedIds.includes(c.id));

  /* ================================================================ */
  /*  LOADING / ERROR                                                  */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 animate-pulse">
              <div className="h-8 w-16 bg-gray-200 rounded mx-auto mb-2" />
              <div className="h-3 w-20 bg-gray-100 rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-50 rounded mb-2" />
          ))}
        </div>
      </div>
    );
  }

  if (!house) {
    return <div className="text-center py-12 text-gray-500">House not found.</div>;
  }

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ============================================================ */}
      {/*  ARCHIVE HOUSE MODAL                                          */}
      {/* ============================================================ */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Archive House</h2>
            {archiveBlockers.length > 0 ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    Cannot archive. Resolve first:
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                    {archiveBlockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowArchiveModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to archive <strong>{house.name}</strong>? It will be removed
                  from the active houses list but can be restored later.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowArchiveModal(false)}
                    disabled={archiving}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleArchiveConfirm}
                    disabled={archiving}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 text-sm"
                  >
                    {archiving ? 'Archiving…' : 'Confirm Archive'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  BACK LINK                                                    */}
      {/* ============================================================ */}
      <button
        onClick={() => router.push('/admin/houses')}
        className="text-purple-600 hover:text-purple-800 flex items-center text-sm"
      >
        ← Back to Houses
      </button>

      {/* ============================================================ */}
      {/*  HOUSE INFO (inline editable)                                 */}
      {/* ============================================================ */}
      {editingHouse ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit House Details</h2>
          {houseError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {houseError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House Name *</label>
              <input
                type="text"
                value={houseForm.name}
                onChange={(e) => setHouseForm({ ...houseForm, name: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <input
                type="text"
                value={houseForm.address}
                onChange={(e) => setHouseForm({ ...houseForm, address: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setEditingHouse(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={saveHouseInfo}
              disabled={houseSaving}
              className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {houseSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{house.name}</h1>
            {house.address && <p className="text-gray-500 mt-1">{house.address}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={startEditHouse}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 text-sm font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit Details
            </button>
            <button
              onClick={handleArchiveCheck}
              disabled={checkingArchive}
              className="inline-flex items-center gap-2 border border-red-300 text-red-600 px-4 py-2.5 rounded-lg hover:bg-red-50 text-sm font-medium transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              {checkingArchive ? 'Checking…' : 'Archive'}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  KPI CARDS                                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{totalSlots}</p>
          <p className="text-xs text-gray-500 font-medium uppercase mt-1">Total Slots</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-purple-700">
            {occupiedSlots}/{totalSlots}
          </p>
          <p className="text-xs text-gray-500 font-medium uppercase mt-1">Occupied</p>
        </div>
        <div
          className={`border rounded-xl p-4 text-center shadow-sm ${
            availableSlots > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
          }`}
        >
          <p
            className={`text-2xl font-bold ${
              availableSlots > 0 ? 'text-green-700' : 'text-gray-400'
            }`}
          >
            {availableSlots}
          </p>
          <p className="text-xs text-gray-500 font-medium uppercase mt-1">Available</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 font-medium uppercase mt-1">Monthly Revenue</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROOMS SECTION                                                */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Rooms
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({activeRooms.length} rooms · {totalSlots} slots)
            </span>
          </h2>
          <button
            onClick={startAddRoom}
            disabled={addingRoom || !!editingRoomId}
            className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700 flex items-center gap-1 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Room
          </button>
        </div>

        {/* Room Form (add or edit) */}
        {(addingRoom || editingRoomId) && (
          <div className="px-5 py-4 bg-purple-50/50 border-b border-purple-100">
            <h3 className="text-sm font-semibold text-purple-900 mb-3">
              {addingRoom ? 'Add New Room' : 'Edit Room'}
            </h3>
            {roomError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-2.5 mb-3">
                {roomError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Label *</label>
                <input
                  type="text"
                  value={roomForm.label}
                  onChange={(e) => setRoomForm({ ...roomForm, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="e.g., Room 1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Capacity *</label>
                <select
                  value={roomForm.capacity}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) as 1 | 2 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value={1}>1 person</option>
                  <option value={2}>2 people</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rental Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={roomForm.rental_price}
                    onChange={(e) => setRoomForm({ ...roomForm, rental_price: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button
                onClick={cancelRoomEdit}
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveRoom}
                disabled={roomSaving}
                className="bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm font-medium"
              >
                {roomSaving ? 'Saving…' : addingRoom ? 'Add Room' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Room table */}
        {activeRooms.length === 0 && !addingRoom ? (
          <div className="px-5 py-10 text-center text-gray-400">
            <p>No rooms configured yet.</p>
            <button
              onClick={startAddRoom}
              className="text-purple-600 hover:underline text-sm mt-1"
            >
              Add your first room →
            </button>
          </div>
        ) : activeRooms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-2.5 px-5 text-gray-500 font-medium">Room</th>
                  <th className="text-left py-2.5 px-5 text-gray-500 font-medium">Capacity</th>
                  <th className="text-left py-2.5 px-5 text-gray-500 font-medium">Tenant</th>
                  <th className="text-left py-2.5 px-5 text-gray-500 font-medium">Status</th>
                  <th className="text-right py-2.5 px-5 text-gray-500 font-medium">Rent</th>
                  <th className="text-right py-2.5 px-5 text-gray-500 font-medium w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeRooms.map((room) => {
                  const activeTenancies = (room.tenancies || []).filter((t) =>
                    ACTIVE_STATUSES.includes(t.status)
                  );
                  const hasActiveTenancy = activeTenancies.length > 0;
                  const roomRent = activeTenancies.reduce(
                    (s, t) => s + (t.rental_price ? parseFloat(t.rental_price) : 0),
                    0
                  );

                  return (
                    <tr
                      key={room.id}
                      className={`hover:bg-gray-50/50 ${editingRoomId === room.id ? 'bg-purple-50/30' : ''}`}
                    >
                      <td className="py-3 px-5 font-medium text-gray-900">{room.label}</td>
                      <td className="py-3 px-5 text-gray-600">
                        {room.capacity} {room.capacity === 1 ? 'person' : 'people'}
                      </td>
                      <td className="py-3 px-5">
                        {hasActiveTenancy ? (
                          <div className="space-y-1">
                            {activeTenancies.map((t) => (
                              <div key={t.id}>
                                <p className="text-gray-900">{t.tenant?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-400">{t.tenant?.email}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        {hasActiveTenancy ? (
                          <div className="space-y-1">
                            {activeTenancies.map((t) => (
                              <span
                                key={t.id}
                                className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                                  t.status === 'ACTIVE'
                                    ? 'bg-green-100 text-green-700'
                                    : t.status === 'MOVE_OUT_REQUESTED'
                                      ? 'bg-amber-100 text-amber-700'
                                      : t.status === 'MOVE_OUT_APPROVED'
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {t.status === 'ACTIVE'
                                  ? 'Occupied'
                                  : t.status === 'MOVE_OUT_REQUESTED'
                                    ? 'Move-Out Requested'
                                    : t.status === 'MOVE_OUT_APPROVED'
                                      ? 'Move-Out Approved'
                                      : 'Inspection Pending'}
                              </span>
                            ))}
                            {activeTenancies.length < room.capacity && (
                              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                                +{room.capacity - activeTenancies.length} slot available
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right text-gray-900">
                        {hasActiveTenancy && roomRent > 0 ? (
                          `$${roomRent.toFixed(2)}`
                        ) : room.rental_price ? (
                          <span className="text-gray-400">
                            ${Number(room.rental_price).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEditRoom(room)}
                            disabled={
                              addingRoom ||
                              (!!editingRoomId && editingRoomId !== room.id)
                            }
                            className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Edit room"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          {!hasActiveTenancy && (
                            <button
                              onClick={() => handleArchiveRoom(room.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                              title="Archive room"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Archived rooms */}
        {archivedRooms.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => setShowArchivedRooms(!showArchivedRooms)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showArchivedRooms ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {archivedRooms.length} archived room{archivedRooms.length !== 1 ? 's' : ''}
            </button>
            {showArchivedRooms && (
              <div className="mt-2 space-y-2">
                {archivedRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="text-sm text-gray-500 line-through">{room.label}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {room.capacity} {room.capacity === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRestoreRoom(room.id)}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  COORDINATORS SECTION                                         */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
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
            <p className="text-sm text-gray-400 py-4 text-center">
              No coordinators assigned yet.
            </p>
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
