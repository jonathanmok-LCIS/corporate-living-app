'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createHouseWithRooms, updateHouseWithRooms, fetchHouseWithRooms, checkArchiveEligibility, archiveHouse } from '../actions';

interface RoomFormData {
  id?: string;
  label: string;
  capacity: 1 | 2;
  rental_price: string;
  tempId: string;
}

export default function QuickSetupPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
      <QuickSetupContent />
    </Suspense>
  );
}

function QuickSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = !!editId;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [deletedRoomIds, setDeletedRoomIds] = useState<string[]>([]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveBlockers, setArchiveBlockers] = useState<string[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [checkingArchive, setCheckingArchive] = useState(false);
  
  // House data
  const [houseData, setHouseData] = useState({
    name: '',
    address: '',
  });
  
  // Rooms data
  const [rooms, setRooms] = useState<RoomFormData[]>([
    { label: '', capacity: 1, rental_price: '', tempId: '1' }
  ]);

  // Load existing house data in edit mode
  useEffect(() => {
    if (editId) {
      loadHouseData(editId);
    }
  }, [editId]);

  async function loadHouseData(houseId: string) {
    setInitialLoading(true);
    try {
      const result = await fetchHouseWithRooms(houseId);
      if (result.error) {
        alert('Error loading house: ' + result.error);
        router.push('/admin/houses');
        return;
      }
      if (result.house) {
        setHouseData({
          name: result.house.name || '',
          address: result.house.address || '',
        });
      }
      if (result.rooms && result.rooms.length > 0) {
        setRooms(result.rooms.map((r: { id: string; label: string; capacity: 1 | 2; rental_price?: number | null }) => ({
          id: r.id,
          label: r.label,
          capacity: r.capacity,
          rental_price: r.rental_price != null ? String(r.rental_price) : '',
          tempId: r.id,
        })));
      }
    } catch (err) {
      console.error('Error loading house:', err);
      alert('Error loading house data.');
      router.push('/admin/houses');
    } finally {
      setInitialLoading(false);
    }
  }

  function addRoom() {
    setRooms([...rooms, { 
      label: '', 
      capacity: 1, 
      rental_price: '',
      tempId: Date.now().toString() 
    }]);
  }

  function removeRoom(tempId: string) {
    if (rooms.length > 1) {
      const room = rooms.find(r => r.tempId === tempId);
      if (room?.id) {
        setDeletedRoomIds([...deletedRoomIds, room.id]);
      }
      setRooms(rooms.filter(r => r.tempId !== tempId));
    }
  }

  function updateRoom(tempId: string, field: keyof Omit<RoomFormData, 'tempId' | 'id'>, value: string | number) {
    setRooms(rooms.map(r => 
      r.tempId === tempId ? { ...r, [field]: value } : r
    ));
  }

  function addMultipleRooms(count: number) {
    const newRooms: RoomFormData[] = [];
    for (let i = 0; i < count; i++) {
      newRooms.push({
        label: `Room ${rooms.length + i + 1}`,
        capacity: 1,
        rental_price: '',
        tempId: `${Date.now()}-${i}`
      });
    }
    setRooms([...rooms, ...newRooms]);
  }

  async function handleArchiveCheck() {
    if (!editId) return;
    setCheckingArchive(true);
    try {
      const result = await checkArchiveEligibility(editId);
      if (result.error) {
        alert('Error checking archive eligibility: ' + result.error);
        return;
      }
      setArchiveBlockers(result.blockers);
      setShowArchiveModal(true);
    } catch {
      alert('Error checking archive eligibility');
    } finally {
      setCheckingArchive(false);
    }
  }

  async function handleArchiveConfirm() {
    if (!editId) return;
    setArchiving(true);
    try {
      const result = await archiveHouse(editId);
      if (result.error) {
        alert('Error archiving house: ' + result.error);
        return;
      }
      alert('House archived successfully');
      router.push('/admin/houses');
    } catch {
      alert('Error archiving house');
    } finally {
      setArchiving(false);
      setShowArchiveModal(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    
    try {
      const roomsData = rooms
        .filter(r => r.label.trim() !== '')
        .map(r => ({
          id: r.id,
          label: r.label,
          capacity: r.capacity,
          rental_price: r.rental_price ? parseFloat(r.rental_price) : null,
        }));

      if (isEditMode && editId) {
        const result = await updateHouseWithRooms(editId, houseData, roomsData, deletedRoomIds);
        if (result.error) {
          throw new Error(result.error);
        }
        alert(`Successfully updated "${result.data!.name}"!`);
        router.push('/admin/houses');
      } else {
        const result = await createHouseWithRooms(houseData, roomsData);
        if (result.error) {
          throw new Error(result.error);
        }
        alert(`Successfully created "${result.data!.name}" with ${result.roomsCreated} room(s)!`);
        router.push('/admin/houses');
      }
    } catch (err) {
      console.error('Error in quick setup:', err);
      const message = err instanceof Error ? err.message : 'Error saving house and rooms. Please try again.';
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return <div className="text-center py-8">Loading house data...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/admin/houses')}
          className="text-purple-600 hover:text-purple-800 mb-4 flex items-center"
        >
          ← Back to Houses
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit House' : 'Add House'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditMode
                ? 'Update house details and manage rooms'
                : 'Create a new house and add rooms in one go'}
            </p>
          </div>
          {isEditMode && (
            <button
              onClick={handleArchiveCheck}
              disabled={checkingArchive}
              className="border border-red-300 text-red-600 px-4 py-2 rounded hover:bg-red-50 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              {checkingArchive ? 'Checking...' : 'Archive House'}
            </button>
          )}
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Archive House</h2>
            {archiveBlockers.length > 0 ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    Cannot archive this house. The following must be resolved first:
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
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to archive <strong>{houseData.name}</strong>? It will be removed from the active houses list but can be restored later.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowArchiveModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    disabled={archiving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleArchiveConfirm}
                    disabled={archiving}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {archiving ? 'Archiving...' : 'Confirm Archive'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-2">
          <div className={`flex-1 text-center ${step >= 1 ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            Step 1: House Details
          </div>
          <div className={`flex-1 text-center ${step >= 2 ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            Step 2: Rooms
          </div>
          <div className={`flex-1 text-center ${step >= 3 ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            Step 3: Review
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: House Details */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">House Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                House Name *
              </label>
              <input
                type="text"
                required
                value={houseData.name}
                onChange={(e) => setHouseData({ ...houseData, name: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 text-base placeholder:text-gray-500"
                placeholder="e.g., Main House, North Wing, Student House A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Address
              </label>
              <input
                type="text"
                value={houseData.address}
                onChange={(e) => setHouseData({ ...houseData, address: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 text-base placeholder:text-gray-500"
                placeholder="123 Main St, City, State ZIP"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => router.push('/admin/houses')}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!houseData.name.trim()}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Next: Rooms →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Add Rooms */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {isEditMode ? `Rooms in ${houseData.name}` : `Add Rooms to ${houseData.name}`}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => addMultipleRooms(3)}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                >
                  + Add 3 Rooms
                </button>
                <button
                  onClick={() => addMultipleRooms(5)}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                >
                  + Add 5 Rooms
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {rooms.map((room, index) => (
                <div key={room.tempId} className="flex gap-3 items-start p-3 bg-gray-50 rounded">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">
                        Room Label *
                      </label>
                      <input
                        type="text"
                        required
                        value={room.label}
                        onChange={(e) => updateRoom(room.tempId, 'label', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder:text-gray-500"
                        placeholder={`Room ${index + 1}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">
                        Capacity *
                      </label>
                      <select
                        value={room.capacity}
                        onChange={(e) => updateRoom(room.tempId, 'capacity', parseInt(e.target.value) as 1 | 2)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                      >
                        <option value={1}>1 person</option>
                        <option value={2}>2 people</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">
                        Rental Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={room.rental_price}
                        onChange={(e) => updateRoom(room.tempId, 'rental_price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder:text-gray-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {rooms.length > 1 && (
                    <button
                      onClick={() => removeRoom(room.tempId)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Remove room"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addRoom}
              className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-purple-400 hover:text-purple-600"
            >
              + Add Another Room
            </button>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={rooms.filter(r => r.label.trim() !== '').length === 0}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Review Your {isEditMode ? 'Changes' : 'Setup'}</h2>
            
            <div className="space-y-6">
              {/* House Summary */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">House</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-semibold text-lg">{houseData.name}</p>
                  {houseData.address && (
                    <p className="text-gray-600">{houseData.address}</p>
                  )}
                </div>
              </div>

              {/* Rooms Summary */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                  Rooms ({rooms.filter(r => r.label.trim() !== '').length})
                </h3>
                <div className="space-y-2">
                  {rooms.filter(r => r.label.trim() !== '').map((room) => (
                    <div key={room.tempId} className="bg-gray-50 p-3 rounded flex justify-between items-center">
                      <div>
                        <span className="font-medium">{room.label}</span>
                        <span className="text-gray-500 ml-2">
                          (Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'})
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {room.rental_price ? `$${parseFloat(room.rental_price).toFixed(2)}` : 'No price set'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                {isEditMode
                  ? `✓ House and ${rooms.filter(r => r.label.trim() !== '').length} room(s) will be updated`
                  : `✓ House and ${rooms.filter(r => r.label.trim() !== '').length} room(s) will be created`
                }
              </p>
            </div>

            {deletedRoomIds.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">
                  ⚠ {deletedRoomIds.length} room(s) will be removed
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              disabled={loading}
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isEditMode ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  ✓ {isEditMode ? 'Save Changes' : 'Create House & Rooms'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
