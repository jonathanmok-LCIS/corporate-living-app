'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function CoordinatorDashboard() {
  const [counts, setCounts] = useState({
    pendingIntentions: 0,
    inspections: 0,
    assignedHouses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  async function fetchCounts() {
    const supabase = createClient();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get assigned houses for this coordinator
      const { data: coordinatorHouses, count: housesCount } = await supabase
        .from('house_coordinators')
        .select('house_id', { count: 'exact' })
        .eq('user_id', user.id);

      const houseIds = coordinatorHouses?.map(hc => hc.house_id) || [];
      
      let intentionsCount = 0;
      let inspectionsCount = 0;

      if (houseIds.length > 0) {
        // Get rooms for assigned houses
        const { data: rooms } = await supabase
          .from('rooms')
          .select('id')
          .in('house_id', houseIds);
        
        const roomIds = rooms?.map(r => r.id) || [];

        if (roomIds.length > 0) {
          // Get tenancies for those rooms
          const { data: tenancies } = await supabase
            .from('tenancies')
            .select('id')
            .in('room_id', roomIds);
          
          const tenancyIds = tenancies?.map(t => t.id) || [];

          if (tenancyIds.length > 0) {
            // Get pending move-out intentions count (from assigned houses)
            const { count } = await supabase
              .from('move_out_intentions')
              .select('*', { count: 'exact', head: true })
              .in('tenancy_id', tenancyIds)
              .eq('coordinator_reviewed', false);
            
            intentionsCount = count || 0;
          }
        }

        // Get inspections count (only for assigned houses)
        const { count: insCount } = await supabase
          .from('inspections')
          .select('*', { count: 'exact', head: true })
          .in('house_id', houseIds);
        
        inspectionsCount = insCount || 0;
      }

      setCounts({
        pendingIntentions: intentionsCount,
        inspections: inspectionsCount,
        assignedHouses: housesCount || 0,
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Coordinator Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/coordinator/move-out-reviews"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
        >
          <h2 className="text-xl font-semibold text-green-600 mb-2">Pending Intentions</h2>
          <p className="text-4xl font-bold text-gray-900">
            {loading ? '...' : counts.pendingIntentions}
          </p>
          <p className="text-sm text-gray-500 mt-2">Move-out intentions to review</p>
        </Link>

        <Link
          href="/coordinator/inspections"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
        >
          <h2 className="text-xl font-semibold text-green-600 mb-2">Inspections</h2>
          <p className="text-4xl font-bold text-gray-900">
            {loading ? '...' : counts.inspections}
          </p>
          <p className="text-sm text-gray-500 mt-2">House inspections to review</p>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-green-600 mb-2">Assigned Houses</h2>
          <p className="text-4xl font-bold text-gray-900">
            {loading ? '...' : counts.assignedHouses}
          </p>
          <p className="text-sm text-gray-500 mt-2">Houses under your coordination</p>
          {!loading && counts.assignedHouses === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              Ask an admin to assign you to houses
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
