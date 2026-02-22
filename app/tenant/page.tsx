'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTenantActiveTenancy } from './move-out/actions';

interface TenancyData {
  id: string;
  status: string;
  start_date: string;
  end_date?: string;
  room: {
    label: string;
    house: {
      name: string;
      address?: string;
    };
  };
}

export default function TenantDashboard() {
  const [tenancy, setTenancy] = useState<TenancyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenancy();
  }, []);

  async function fetchTenancy() {
    try {
      console.log('=== DASHBOARD: Fetching tenancy ===');
      const result = await getTenantActiveTenancy();
      
      console.log('=== DASHBOARD: Result received ===');
      console.log('Has data:', !!result.data);
      console.log('Has error:', !!result.error);
      console.log('Full result:', JSON.stringify(result, null, 2));
      
      if (result.error) {
        console.error('DASHBOARD ERROR:', result.error);
        setError(result.error);
        setTenancy(null);
      } else if (result.data) {
        console.log('DASHBOARD SUCCESS: Tenancy data received');
        console.log('Tenancy ID:', result.data.id);
        console.log('Status:', result.data.status);
        console.log('Room:', result.data.room?.label);
        console.log('House:', result.data.room?.house?.name);
        setTenancy(result.data as TenancyData);
        setError(null);
      } else {
        console.log('DASHBOARD: No tenancy data (check server logs for reason)');
        setTenancy(null);
        setError(null);
      }
    } catch (err) {
      console.error('DASHBOARD EXCEPTION:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTenancy(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Tenant Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/tenant/move-out"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-2">Submit Move-Out Intention</h2>
          <p className="text-gray-600">Notify coordinators about your planned move-out date</p>
        </Link>

        <Link
          href="/tenant/move-in"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-2">Move-In Acknowledgement</h2>
          <p className="text-gray-600">View room condition and sign move-in acknowledgement</p>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Current Tenancy</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Error loading tenancy</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button 
              onClick={fetchTenancy}
              className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : tenancy ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">House</p>
                <p className="text-lg font-medium text-gray-900">{tenancy.room?.house?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Room</p>
                <p className="text-lg font-medium text-gray-900">{tenancy.room?.label || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="text-lg font-medium text-gray-900">
                  {tenancy.start_date ? new Date(tenancy.start_date).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-lg font-medium text-gray-900">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tenancy.status === 'OCCUPIED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {tenancy.status?.replace(/_/g, ' ') || '-'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">No active tenancy found</p>
            <p className="text-blue-600 text-sm mt-1">
              You don&apos;t have an active tenancy at the moment. Please contact your administrator if you believe this is an error.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
