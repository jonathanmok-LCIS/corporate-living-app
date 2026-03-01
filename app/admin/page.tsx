'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

interface PendingCounts {
  moveOutIntentions: number;
  pendingSignatures: number;
  draftInspections: number;
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState<PendingCounts>({
    moveOutIntentions: 0,
    pendingSignatures: 0,
    draftInspections: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Fetch counts in parallel
      const [moveOutResult, signaturesResult, inspectionsResult] = await Promise.all([
        // Move-out intentions awaiting admin review
        supabase
          .from('move_out_intentions')
          .select('id', { count: 'exact', head: true })
          .in('status', ['PENDING', 'SUBMITTED']),
        
        // Tenancies awaiting move-in signature
        supabase
          .from('tenancies')
          .select('id', { count: 'exact', head: true })
          .eq('keys_received', false)
          .eq('status', 'ACTIVE'),
        
        // Draft inspections
        supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'DRAFT'),
      ]);

      setCounts({
        moveOutIntentions: moveOutResult.count || 0,
        pendingSignatures: signaturesResult.count || 0,
        draftInspections: inspectionsResult.count || 0,
      });
      setLoading(false);
    }

    fetchCounts();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/houses"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-purple-600 mb-2">Houses & Rooms</h2>
          <p className="text-gray-600">Manage houses, rooms, and assign coordinators</p>
        </Link>

        <Link
          href="/admin/tenancies"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-purple-600 mb-2">Tenancies</h2>
          <p className="text-gray-600">Create and manage tenant assignments</p>
        </Link>

        <Link
          href="/admin/users"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-purple-600 mb-2">Users</h2>
          <p className="text-gray-600">Create and manage user accounts</p>
        </Link>

        <Link
          href="/admin/inspections"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-purple-600 mb-2">Inspections</h2>
          <p className="text-gray-600">Create and manage house inspections</p>
        </Link>

        <Link
          href="/admin/move-out-intentions"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-purple-600 mb-2">Move-Out Intentions</h2>
          <p className="text-gray-600">View and manage tenant move-out requests</p>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-purple-600 mb-2">Pending Actions</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Move-out intentions</span>
                <span className={`font-semibold ${counts.moveOutIntentions > 0 ? 'text-orange-600' : ''}`}>
                  {counts.moveOutIntentions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending signatures</span>
                <span className={`font-semibold ${counts.pendingSignatures > 0 ? 'text-orange-600' : ''}`}>
                  {counts.pendingSignatures}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Draft inspections</span>
                <span className={`font-semibold ${counts.draftInspections > 0 ? 'text-orange-600' : ''}`}>
                  {counts.draftInspections}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-500">No recent activity to display.</p>
      </div>
    </div>
  );
}
