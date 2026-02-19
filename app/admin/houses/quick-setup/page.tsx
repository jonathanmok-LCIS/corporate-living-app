'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface RoomFormData {
  label: string;
  capacity: 1 | 2;
  tempId: string;
}

export default function QuickSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // House data
  const [houseData, setHouseData] = useState({
    name: '',
    address: '',
  });
  
  // Rooms data
  const [rooms, setRooms] = useState<RoomFormData[]>([
    { label: '', capacity: 1, tempId: '1' }
  ]);

  function addRoom() {
    setRooms([...rooms, { 
      label: '', 
      capacity: 1, 
      tempId: Date.now().toString() 
    }]);
  }

  function removeRoom(tempId: string) {
    if (rooms.length > 1) {
      setRooms(rooms.filter(r => r.tempId !== tempId));
    }
  }

  function updateRoom(tempId: string, field: keyof Omit<RoomFormData, 'tempId'>, value: any) {
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
        tempId: `${Date.now()}-${i}`
      });
    }
    setRooms([...rooms, ...newRooms]);
  }

  async function handleSubmit() {
    if (!supabase) return;
    
    setLoading(true);
    
    try {
      // Create house
      const { data: house, error: houseError } = await supabase
        .from('houses')
        .insert([houseData])
        .select()
        .single();

      if (houseError) throw houseError;

      // Create rooms
      const roomsToInsert = rooms
        .filter(r => r.label.trim() !== '')
        .map(r => ({
          house_id: house.id,
          label: r.label,
          capacity: r.capacity
        }));

      if (roomsToInsert.length > 0) {
        const { error: roomsError } = await supabase
          .from('rooms')
          .insert(roomsToInsert);

        if (roomsError) throw roomsError;
      }

      // Success!
      alert(`Successfully created "${house.name}" with ${roomsToInsert.length} room(s)!`);
      router.push(`/admin/houses/${house.id}/rooms`);
    } catch (error: any) {
      console.error('Error in quick setup:', error);
      alert(error?.message || 'Error creating house and rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-red-900 mb-2">Supabase Not Configured</h2>
        <p className="text-red-800">
          Please configure your Supabase credentials in <code className="bg-red-100 px-1 rounded">.env.local</code> to use this application.
        </p>
      </div>
    );
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
        <h1 className="text-3xl font-bold text-gray-900">Quick Setup: House + Rooms</h1>
        <p className="text-gray-600 mt-2">Create a new house and add multiple rooms in one go</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-2">
          <div className={`flex-1 text-center ${step >= 1 ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            Step 1: House Details
          </div>
          <div className={`flex-1 text-center ${step >= 2 ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            Step 2: Add Rooms
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                House Name *
              </label>
              <input
                type="text"
                required
                value={houseData.name}
                onChange={(e) => setHouseData({ ...houseData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Main House, North Wing, Student House A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={houseData.address}
                onChange={(e) => setHouseData({ ...houseData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
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
                Next: Add Rooms →
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
              <h2 className="text-xl font-semibold">Add Rooms to {houseData.name}</h2>
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
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Room Label *
                      </label>
                      <input
                        type="text"
                        required
                        value={room.label}
                        onChange={(e) => updateRoom(room.tempId, 'label', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500"
                        placeholder={`Room ${index + 1}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Capacity *
                      </label>
                      <select
                        value={room.capacity}
                        onChange={(e) => updateRoom(room.tempId, 'capacity', parseInt(e.target.value) as 1 | 2)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value={1}>1 person</option>
                        <option value={2}>2 people</option>
                      </select>
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
            <h2 className="text-xl font-semibold mb-4">Review Your Setup</h2>
            
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
                  {rooms.filter(r => r.label.trim() !== '').map((room, index) => (
                    <div key={room.tempId} className="bg-gray-50 p-3 rounded flex justify-between items-center">
                      <div>
                        <span className="font-medium">{room.label}</span>
                        <span className="text-gray-500 ml-2">
                          (Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                ✓ House and {rooms.filter(r => r.label.trim() !== '').length} room(s) will be created
              </p>
            </div>
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
                  Creating...
                </>
              ) : (
                <>
                  ✓ Create House & Rooms
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
