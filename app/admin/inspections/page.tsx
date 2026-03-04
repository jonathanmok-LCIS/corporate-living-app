'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

interface House {
  id: string;
  name: string;
}

interface Room {
  id: string;
  label: string;
}

interface InspectionWithRelations {
  id: string;
  status: string;
  created_at: string;
  finalised_at: string | null;
  notes: string | null;
  house?: {
    id: string;
    name: string;
  };
  created_by_profile?: {
    name: string;
  };
}

// Common areas for house inspection (excludes rooms — those are added dynamically)
const COMMON_AREAS = [
  'House Front',
  'Entrance',
  'Hallway',
  'Lounge',
  'Second Lounge',
  'Kitchen',
  'Dining',
  'Second Level Common Area',
];

export default function AdminInspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<InspectionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form state for creating new inspection
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState('');
  const [houseRooms, setHouseRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    fetchInspections();
    fetchHouses();
  }, []);

  async function fetchInspections() {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          house:houses(id, name),
          created_by_profile:profiles!created_by(name)
        `)
        .not('house_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (err) {
      console.error('Error fetching inspections:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHouses() {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('houses')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      setHouses(data || []);
    } catch (err) {
      console.error('Error fetching houses:', err);
    }
  }

  async function fetchRoomsForHouse(houseId: string) {
    if (!houseId) {
      setHouseRooms([]);
      return;
    }
    const supabase = createClient();
    setLoadingRooms(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, label')
        .eq('house_id', houseId)
        .eq('active', true)
        .order('label');
      if (error) throw error;
      setHouseRooms(data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setHouseRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function handleCreateInspection(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedHouseId) {
      alert('Please select a house');
      return;
    }

    const supabase = createClient();
    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to create inspections');
        return;
      }

      // Create the inspection
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .insert([{
          house_id: selectedHouseId,
          created_by: user.id,
          status: 'DRAFT',
        }])
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      // Create initial areas: common areas + individual room areas
      const roomAreaNames = houseRooms.map(r => r.label);
      const allAreaNames = [
        ...COMMON_AREAS.slice(0, 7),  // House Front → Dining
        ...roomAreaNames,              // Room 1, Room 2, etc.
        ...COMMON_AREAS.slice(7),      // Second Level Common Area
      ];

      const areasToInsert = allAreaNames.map(areaName => ({
        inspection_id: inspection.id,
        area_name: areaName,
        description: '',
        action_items: '',
      }));

      const { error: areasError } = await supabase
        .from('inspection_areas')
        .insert(areasToInsert);

      if (areasError) throw areasError;

      alert('Inspection created successfully');
      setShowCreateForm(false);
      setSelectedHouseId('');
      setHouseRooms([]);
      
      // Navigate to the inspection detail page
      router.push(`/admin/inspections/${inspection.id}`);
    } catch (err) {
      console.error('Error creating inspection:', err);
      const message = err instanceof Error ? err.message : 'Error creating inspection';
      alert(message);
    } finally {
      setCreating(false);
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">House Inspections</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          {showCreateForm ? 'Cancel' : 'Create Inspection'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create New House Inspection</h2>
          <form onSubmit={handleCreateInspection} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                House *
              </label>
              <select
                required
                value={selectedHouseId}
                onChange={(e) => {
                  setSelectedHouseId(e.target.value);
                  fetchRoomsForHouse(e.target.value);
                }}
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 text-base"
              >
                <option value="">Select a house</option>
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <p className="text-sm text-blue-800">
                This will create a house inspection with the following areas:
              </p>
              <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
                {COMMON_AREAS.slice(0, 7).map((area) => (
                  <li key={area}>{area}</li>
                ))}
                {loadingRooms ? (
                  <li className="text-blue-400 italic">Loading rooms…</li>
                ) : houseRooms.length > 0 ? (
                  houseRooms.map((room) => (
                    <li key={room.id} className="font-medium">{room.label}</li>
                  ))
                ) : selectedHouseId ? (
                  <li className="text-blue-400 italic">No rooms found</li>
                ) : (
                  <li className="text-blue-400 italic">Select a house to see rooms</li>
                )}
                {COMMON_AREAS.slice(7).map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !selectedHouseId}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-purple-300"
              >
                {creating ? 'Creating...' : 'Create Inspection'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inspections Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  House
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inspections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No inspections found. Create your first house inspection to get started.
                  </td>
                </tr>
              ) : (
                inspections.map((inspection) => (
                  <tr key={inspection.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(inspection.finalised_at || inspection.created_at)}
                      </div>
                      {inspection.finalised_at && (
                        <div className="text-xs text-gray-500">Finalised</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {inspection.house?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          inspection.status === 'FINAL'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {inspection.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {inspection.created_by_profile?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/inspections/${inspection.id}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
