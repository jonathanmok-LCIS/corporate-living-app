'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { House, Room } from '@/lib/types';

export default function RoomsPage() {
  const params = useParams();
  const router = useRouter();
  const houseId = params.id as string;
  
  const [house, setHouse] = useState<House | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    capacity: 1,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchHouse();
      fetchRooms();
    } else {
      setLoading(false);
    }
  }, [houseId]);

  async function fetchHouse() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .eq('id', houseId)
        .single();

      if (error) throw error;
      setHouse(data);
    } catch (error) {
      console.error('Error fetching house:', error);
      router.push('/admin/houses');
    }
  }

  async function fetchRooms() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('house_id', houseId)
        .order('label');

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!supabase) return;
    
    try {
      const roomData = {
        ...formData,
        house_id: houseId,
      };

      if (editingId) {
        const { error } = await supabase
          .from('rooms')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert([roomData]);

        if (error) throw error;
      }

      setFormData({ label: '', capacity: 1 });
      setEditingId(null);
      setShowForm(false);
      fetchRooms();
    } catch (error: any) {
      console.error('Error saving room:', error);
      alert(error?.message || 'Error saving room. Please try again.');
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;
      fetchRooms();
    } catch (error) {
      console.error('Error updating room:', error);
    }
  }

  function handleEdit(room: Room) {
    setFormData({ label: room.label, capacity: room.capacity });
    setEditingId(room.id);
    setShowForm(true);
  }

  function handleCancelEdit() {
    setFormData({ label: '', capacity: 1 });
    setEditingId(null);
    setShowForm(false);
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

  if (loading || !house) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push('/admin/houses')}
          className="text-purple-600 hover:text-purple-800 mb-4 flex items-center"
        >
          ← Back to Houses
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{house.name}</h1>
            <p className="text-gray-600">{house.address}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            {showForm ? 'Cancel' : 'Add Room'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Room' : 'Add New Room'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Room Label *
              </label>
              <input
                type="text"
                required
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder:text-gray-400"
                placeholder="e.g., Room 101, Master Bedroom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Capacity *
              </label>
              <select
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) as 1 | 2 })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500 text-gray-900"
              >
                <option value={1}>1 person</option>
                <option value={2}>2 people</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room Label
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No rooms found. Add rooms to this house.
                </td>
              </tr>
            ) : (
              rooms.map((room) => (
                <tr key={room.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{room.label}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{room.capacity} {room.capacity === 1 ? 'person' : 'people'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        room.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {room.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(room)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(room.id, room.active)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {room.active ? 'Archive' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
