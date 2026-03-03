'use client';

import { useState, useEffect } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-browser';
import Link from 'next/link';

interface HouseWithInspection {
  id: string;
  name: string;
  address: string;
  active: boolean;
  is_archived: boolean;
  lastInspectionDate?: string | null;
  lastInspectionId?: string | null;
}

export default function HousesPage() {
  const [houses, setHouses] = useState<HouseWithInspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchHouses();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchHouses() {
    const supabase = createClient();
    
    try {
      // Fetch only non-archived houses
      const { data: housesData, error: housesError } = await supabase
        .from('houses')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (housesError) throw housesError;
      
      // For each house, get the latest finalized inspection
      const housesWithInspections: HouseWithInspection[] = [];
      
      for (const house of housesData || []) {
        // Get the latest inspection for this house through rooms
        const { data: inspectionData } = await supabase
          .from('inspections')
          .select(`
            id,
            finalised_at,
            created_at,
            room:rooms!inner(house_id)
          `)
          .eq('room.house_id', house.id)
          .eq('status', 'FINAL')
          .order('finalised_at', { ascending: false })
          .limit(1);
        
        const latestInspection = inspectionData?.[0];
        
        housesWithInspections.push({
          ...house,
          lastInspectionDate: latestInspection?.finalised_at || latestInspection?.created_at || null,
          lastInspectionId: latestInspection?.id || null,
        });
      }
      
      setHouses(housesWithInspections);
    } catch (error) {
      console.error('Error fetching houses:', error);
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

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Houses</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/houses/archived"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            View Archived
          </Link>
          <a
            href="/admin/houses/quick-setup"
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add House
          </a>
        </div>
      </div>

      {/* Empty State Banner */}
      {houses.length === 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Getting started:</span> Click <strong>Add House</strong> to create a house and set up all its rooms in one go.
              </p>
            </div>
          </div>
        </div>
      )}

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
                Last Inspection
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
                    {house.lastInspectionDate ? (
                      <div>
                        <div className="text-sm text-gray-900">
                          {new Date(house.lastInspectionDate).toLocaleDateString('en-AU', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        {house.lastInspectionId && (
                          <Link
                            href={`/admin/inspections/${house.lastInspectionId}`}
                            className="text-xs text-purple-600 hover:underline"
                          >
                            View Report
                          </Link>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No inspections</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <a
                      href={`/admin/houses/quick-setup?id=${house.id}`}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Edit
                    </a>
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
    </div>
  );
}
