'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Tenancy, Room, House, Profile } from '@/lib/types';
import { createTenancy } from './actions';

export default function TenanciesPage() {
  const [tenancies, setTenancies] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [tenants, setTenants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    room_id: '',
    slot: '' as '' | 'A' | 'B',
    tenant_user_id: '',
    start_date: '',
    end_date: '',
    rental_price: '',
  });

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchTenancies();
      fetchRooms();
      fetchHouses();
      fetchTenants();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchTenancies() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('tenancies')
        .select(`
          *,
          room:rooms(id, label, house_id),
          tenant:profiles!tenant_user_id(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenancies(data || []);
    } catch (error) {
      console.error('Error fetching tenancies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRooms() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('active', true)
        .order('label');

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  }

  async function fetchHouses() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setHouses(data || []);
    } catch (error) {
      console.error('Error fetching houses:', error);
    }
  }

  async function fetchTenants() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['TENANT', 'COORDINATOR'])
        .order('name');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const tenancyData: any = {
        room_id: formData.room_id,
        tenant_user_id: formData.tenant_user_id,
        start_date: formData.start_date,
      };

      // Only add slot if room capacity is 2
      const selectedRoom = rooms.find(r => r.id === formData.room_id);
      if (selectedRoom?.capacity === 2 && formData.slot) {
        tenancyData.slot = formData.slot;
      }

      if (formData.end_date) {
        tenancyData.end_date = formData.end_date;
      }

      if (formData.rental_price) {
        tenancyData.rental_price = parseFloat(formData.rental_price);
      }

      const result = await createTenancy(tenancyData);

      if (result.error) {
        throw new Error(result.error);
      }

      setFormData({
        room_id: '',
        slot: '',
        tenant_user_id: '',
        start_date: '',
        end_date: '',
        rental_price: '',
      });
      setShowForm(false);
      fetchTenancies();
      alert('Tenancy created successfully');
    } catch (error: any) {
      console.error('Error creating tenancy:', error);
      alert(error?.message || 'Error creating tenancy');
    }
  }

  async function handleEndTenancy(tenancyId: string) {
    if (!confirm('Are you sure you want to end this tenancy?')) return;
    
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('tenancies')
        .update({
          status: 'ENDED',
          end_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', tenancyId);

      if (error) throw error;

      fetchTenancies();
      alert('Tenancy ended successfully');
    } catch (error) {
      console.error('Error ending tenancy:', error);
      alert('Error ending tenancy');
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

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const selectedRoom = rooms.find(r => r.id === formData.room_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tenancies</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          {showForm ? 'Cancel' : 'Create Tenancy'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create New Tenancy</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room *
              </label>
              <select
                required
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select a room...</option>
                {rooms.map(room => {
                  const house = houses.find(h => h.id === room.house_id);
                  return (
                    <option key={room.id} value={room.id}>
                      {house?.name} - {room.label} (Capacity: {room.capacity})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedRoom?.capacity === 2 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slot *
                </label>
                <select
                  required
                  value={formData.slot}
                  onChange={(e) => setFormData({ ...formData, slot: e.target.value as 'A' | 'B' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select a slot...</option>
                  <option value="A">Slot A</option>
                  <option value="B">Slot B</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenant *
              </label>
              <select
                required
                value={formData.tenant_user_id}
                onChange={(e) => setFormData({ ...formData, tenant_user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select a tenant...</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rental Price (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.rental_price}
                onChange={(e) => setFormData({ ...formData, rental_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                placeholder="0.00"
              />
            </div>

            <button
              type="submit"
              className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
            >
              Create Tenancy
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slot
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
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
            {tenancies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No tenancies found. Create a tenancy to get started.
                </td>
              </tr>
            ) : (
              tenancies.map((tenancy) => (
                <tr key={tenancy.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {tenancy.tenant?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {tenancy.tenant?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{tenancy.room?.label}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{tenancy.slot || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(tenancy.start_date).toLocaleDateString()}
                    </div>
                    {tenancy.end_date && (
                      <div className="text-sm text-gray-500">
                        to {new Date(tenancy.end_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tenancy.status === 'OCCUPIED'
                          ? 'bg-green-100 text-green-800'
                          : tenancy.status === 'ENDED'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {tenancy.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {tenancy.status !== 'ENDED' && (
                      <button
                        onClick={() => handleEndTenancy(tenancy.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        End Tenancy
                      </button>
                    )}
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
