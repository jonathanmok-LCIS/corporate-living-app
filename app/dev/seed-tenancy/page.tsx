'use client';

import { useState, useEffect } from 'react';
import { getHousesAndRooms, createTestTenancy } from './actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Room {
  id: string;
  label: string;
  capacity: number;
}

interface House {
  id: string;
  name: string;
  rooms: Room[];
}

export default function SeedTenancyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check if we're in production or dev seeding is disabled
  const isProduction = process.env.NODE_ENV === 'production';

  useEffect(() => {
    if (isProduction) {
      return;
    }

    async function loadHouses() {
      const result = await getHousesAndRooms();
      
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setHouses(result.data);
      }
      
      setLoading(false);
    }

    loadHouses();
  }, [isProduction]);

  async function handleCreateTenancy() {
    if (!selectedRoomId) {
      alert('Please select a room');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await createTestTenancy(selectedRoomId);
      
      if (result.success) {
        alert('Test tenancy created successfully!');
        router.push('/tenant/move-out');
      } else {
        setError(result.error || 'Failed to create tenancy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setCreating(false);
    }
  }

  if (isProduction) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Not Available in Production</h1>
          <p className="text-red-800">
            This dev seeding tool is only available in development environments.
          </p>
          <Link
            href="/tenant"
            className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <h1 className="text-2xl font-bold text-yellow-900 mb-2">
            🛠️ Development Tool: Create Test Tenancy
          </h1>
          <p className="text-yellow-800">
            This tool creates a test tenancy for the currently logged-in user. 
            This is only available in development mode with ENABLE_DEV_SEEDING=true.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading houses and rooms...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Select a Room to Assign
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                disabled={creating}
              >
                <option value="">-- Select a room --</option>
                {houses.map((house) => (
                  <optgroup key={house.id} label={house.name}>
                    {house.rooms?.map((room) => (
                      <option key={room.id} value={room.id}>
                        {house.name} - Room {room.label} (Capacity: {room.capacity})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">What happens when you click Create:</h3>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>Creates a new tenancy for your account</li>
                <li>Sets status to ACTIVE</li>
                <li>Start date is set to today</li>
                <li>No end date (active tenancy)</li>
                <li>You&apos;ll be redirected to /tenant/move-out</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateTenancy}
                disabled={creating || !selectedRoomId}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Test Tenancy'}
              </button>
              <Link
                href="/tenant"
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-center"
              >
                Cancel
              </Link>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs text-gray-600">
              <strong>Note:</strong> This tool uses the service role key to bypass RLS. 
              In production, tenancies would be created by administrators through the admin interface.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
