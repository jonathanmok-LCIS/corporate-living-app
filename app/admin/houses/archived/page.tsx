'use client';

import { useState, useEffect } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-browser';
import Link from 'next/link';

interface ArchivedHouse {
  id: string;
  name: string;
  address: string;
  created_at: string;
}

export default function ArchivedHousesPage() {
  const [houses, setHouses] = useState<ArchivedHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchArchivedHouses();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchArchivedHouses() {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('houses')
        .select('id, name, address, created_at')
        .eq('is_archived', true)
        .order('name');

      if (error) throw error;
      setHouses(data || []);
    } catch (error) {
      console.error('Error fetching archived houses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id: string) {
    if (!confirm('Restore this house? It will appear in the active houses list again.')) return;

    setRestoring(id);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('houses')
        .update({ is_archived: false, active: true })
        .eq('id', id);

      if (error) throw error;
      fetchArchivedHouses();
    } catch (error) {
      console.error('Error restoring house:', error);
      alert('Failed to restore house');
    } finally {
      setRestoring(null);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-red-900 mb-2">Supabase Not Configured</h2>
        <p className="text-red-800">Please configure your Supabase credentials.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link
            href="/admin/houses"
            className="text-purple-600 hover:text-purple-800 text-sm flex items-center gap-1 mb-2"
          >
            ← Back to Houses
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Archived Houses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Houses that have been archived. Restore them to make them active again.
          </p>
        </div>
      </div>

      {houses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No archived houses</p>
          <p className="text-sm text-gray-400 mt-1">Houses you archive will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
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
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {houses.map((house) => (
                  <tr key={house.id} className="bg-gray-50/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-600">{house.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{house.address || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(house.created_at).toLocaleDateString('en-AU', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleRestore(house.id)}
                        disabled={restoring === house.id}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                      >
                        {restoring === house.id ? 'Restoring...' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
