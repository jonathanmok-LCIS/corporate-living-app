'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTenantActiveTenancy, getTenantMoveOutIntention } from './move-out/actions';

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

interface MoveOutIntention {
  id: string;
  sign_off_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  coordinator_notes: string | null;
  coordinator_reviewed: boolean;
  planned_move_out_date: string;
  created_at: string;
}

export default function TenantDashboard() {
  const [tenancy, setTenancy] = useState<TenancyData | null>(null);
  const [moveOutIntention, setMoveOutIntention] = useState<MoveOutIntention | null>(null);
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
        
        // Fetch move-out intention if exists
        const intentionResult = await getTenantMoveOutIntention(result.data.id);
        if (intentionResult.data) {
          setMoveOutIntention(intentionResult.data as MoveOutIntention);
        }
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
      
      {/* Rejected Move-Out Intention Alert */}
      {moveOutIntention?.sign_off_status === 'REJECTED' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-semibold text-red-800">Move-Out Intention Rejected</h3>
              <p className="text-sm text-red-700 mt-1">
                Your move-out intention submitted on {new Date(moveOutIntention.created_at).toLocaleDateString()} was rejected by the coordinator.
              </p>
              
              {moveOutIntention.coordinator_notes && (
                <div className="mt-3 bg-white p-4 rounded border border-red-200">
                  <p className="text-sm font-medium text-gray-900 mb-2">Coordinator Feedback:</p>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">{moveOutIntention.coordinator_notes}</pre>
                </div>
              )}
              
              <div className="mt-4">
                <Link
                  href="/tenant/move-out"
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
                >
                  Review & Resubmit
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Move-Out Intention Status */}
      {moveOutIntention?.sign_off_status === 'PENDING' && (
        <div className={`${moveOutIntention.coordinator_reviewed ? 'bg-blue-50 border-blue-500' : 'bg-yellow-50 border-yellow-500'} border-l-4 p-6 rounded-lg`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className={`h-6 w-6 ${moveOutIntention.coordinator_reviewed ? 'text-blue-500' : 'text-yellow-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className={`text-lg font-semibold ${moveOutIntention.coordinator_reviewed ? 'text-blue-800' : 'text-yellow-800'}`}>
                {moveOutIntention.coordinator_reviewed 
                  ? 'Inspection Scheduled' 
                  : 'Move-Out Intention Pending Review'}
              </h3>
              <p className={`text-sm ${moveOutIntention.coordinator_reviewed ? 'text-blue-700' : 'text-yellow-700'} mt-1`}>
                {moveOutIntention.coordinator_reviewed 
                  ? `Your move-out intention has been reviewed. An inspection will be conducted before your move-out date of ${new Date(moveOutIntention.planned_move_out_date).toLocaleDateString()}.`
                  : `Your move-out intention for ${new Date(moveOutIntention.planned_move_out_date).toLocaleDateString()} is awaiting coordinator review.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Approved Move-Out Intention Status */}
      {moveOutIntention?.sign_off_status === 'APPROVED' && (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-green-800">Move-Out Approved</h3>
              <p className="text-sm text-green-700 mt-1">
                Your move-out for {new Date(moveOutIntention.planned_move_out_date).toLocaleDateString()} has been approved. Please ensure you complete all checkout requirements by this date.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/tenant/move-out"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-2">
            {moveOutIntention?.sign_off_status === 'REJECTED' ? 'Resubmit Move-Out Intention' : 'Submit Move-Out Intention'}
          </h2>
          <p className="text-gray-600">
            {moveOutIntention?.sign_off_status === 'REJECTED' 
              ? 'Address coordinator feedback and resubmit your intention'
              : 'Notify coordinators about your planned move-out date'}
          </p>
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
