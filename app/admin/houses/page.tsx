'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { House } from '@/lib/types';

export default function HousesPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchHouses();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchHouses() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHouses(data || []);
    } catch (error) {
      console.error('Error fetching houses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!supabase) return;
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from('houses')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('houses')
          .insert([formData]);

        if (error) throw error;
      }

      setFormData({ name: '', address: '' });
      setEditingId(null);
      setShowForm(false);
      fetchHouses();
    } catch (error) {
      console.error('Error saving house:', error);
      alert('Error saving house. Please try again.');
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('houses')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;
      fetchHouses();
    } catch (error) {
      console.error('Error updating house:', error);
    }
  }

  function handleEdit(house: House) {
    setFormData({ name: house.name, address: house.address || '' });
    setEditingId(house.id);
    setShowForm(true);
  }

  function handleCancelEdit() {
    setFormData({ name: '', address: '' });
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

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Houses</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          {showForm ? 'Cancel' : 'Add House'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit House' : 'Add New House'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
              />
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
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
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
            {houses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No houses found. Add your first house to get started.
                </td>
              </tr>
            ) : (
              houses.map((house) => (
                <tr key={house.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{house.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{house.address || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        house.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {house.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(house)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(house.id, house.active)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {house.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <a
                      href={`/admin/houses/${house.id}/rooms`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Rooms
                    </a>
                    <a
                      href={`/admin/houses/${house.id}/coordinators`}
                      className="text-green-600 hover:text-green-900"
                    >
                      Coordinators
                    </a>
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
