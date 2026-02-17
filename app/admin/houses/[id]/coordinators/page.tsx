'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { House, Profile, HouseCoordinator } from '@/lib/types';

export default function HouseCoordinatorsPage() {
  const params = useParams();
  const router = useRouter();
  const houseId = params.id as string;
  
  const [house, setHouse] = useState<House | null>(null);
  const [coordinators, setCoordinators] = useState<(HouseCoordinator & { profile: Profile })[]>([]);
  const [availableCoordinators, setAvailableCoordinators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoordinator, setSelectedCoordinator] = useState('');

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchHouse();
      fetchCoordinators();
      fetchAvailableCoordinators();
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

  async function fetchCoordinators() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('house_coordinators')
        .select('*, profile:user_id(id, name, email)')
        .eq('house_id', houseId);

      if (error) throw error;
      setCoordinators(data as any || []);
    } catch (error) {
      console.error('Error fetching coordinators:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableCoordinators() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['COORDINATOR', 'ADMIN'])
        .order('name');

      if (error) throw error;
      setAvailableCoordinators(data || []);
    } catch (error) {
      console.error('Error fetching available coordinators:', error);
    }
  }

  async function handleAssignCoordinator() {
    if (!selectedCoordinator || !supabase) return;

    try {
      const { error } = await supabase
        .from('house_coordinators')
        .insert([{
          house_id: houseId,
          user_id: selectedCoordinator,
        }]);

      if (error) throw error;

      setSelectedCoordinator('');
      fetchCoordinators();
      alert('Coordinator assigned successfully');
    } catch (error: any) {
      console.error('Error assigning coordinator:', error);
      alert(error?.message || 'Error assigning coordinator');
    }
  }

  async function handleRemoveCoordinator(coordinatorId: string) {
    if (!confirm('Are you sure you want to remove this coordinator?')) return;
    
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('house_coordinators')
        .delete()
        .eq('id', coordinatorId);

      if (error) throw error;

      fetchCoordinators();
      alert('Coordinator removed successfully');
    } catch (error) {
      console.error('Error removing coordinator:', error);
      alert('Error removing coordinator');
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

  if (loading || !house) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // Filter out coordinators already assigned
  const assignedIds = coordinators.map(c => c.user_id);
  const filteredAvailable = availableCoordinators.filter(c => !assignedIds.includes(c.id));

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push('/admin/houses')}
          className="text-purple-600 hover:text-purple-800 mb-4 flex items-center"
        >
          ← Back to Houses
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Coordinators for {house.name}</h1>
        <p className="text-gray-600">{house.address}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Assign New Coordinator</h2>
        <div className="flex gap-4">
          <select
            value={selectedCoordinator}
            onChange={(e) => setSelectedCoordinator(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Select a coordinator...</option>
            {filteredAvailable.map(coordinator => (
              <option key={coordinator.id} value={coordinator.id}>
                {coordinator.name} ({coordinator.email}) - {coordinator.role}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssignCoordinator}
            disabled={!selectedCoordinator}
            className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:bg-purple-300"
          >
            Assign
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {coordinators.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No coordinators assigned to this house yet.
                </td>
              </tr>
            ) : (
              coordinators.map((coordinator) => (
                <tr key={coordinator.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {(coordinator.profile as any)?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {(coordinator.profile as any)?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {(coordinator.profile as any)?.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleRemoveCoordinator(coordinator.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
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
