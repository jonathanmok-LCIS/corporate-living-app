'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTenantActiveTenancy } from './move-out/actions';

export default function TenantDashboard() {
  const [tenancy, setTenancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenancy();
  }, []);

  async function fetchTenancy() {
    try {
      const result = await getTenantActiveTenancy();
      
      if (!result.error && result.data) {
        setTenancy(result.data);
      }
    } catch (error) {
      console.error('Error fetching tenancy:', error);
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
          <p className="text-gray-500">No active tenancy found.</p>
        )}
      </div>
    </div>
  );
}
