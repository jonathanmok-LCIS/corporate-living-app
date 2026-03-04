'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { StatusBadge } from '@/components/dashboard';

interface InspectionWithRelations {
  id: string;
  status: string;
  created_at: string;
  finalised_at: string | null;
  house?: {
    id: string;
    name: string;
  };
  created_by_profile?: {
    name: string;
  };
}

export default function CoordinatorInspectionsPage() {
  const [inspections, setInspections] = useState<InspectionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspections();
  }, []);

  async function fetchInspections() {
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coordinatorHouses, error: hcError } = await supabase
        .from('house_coordinators')
        .select('house_id')
        .eq('user_id', user.id);

      if (hcError) throw hcError;

      const houseIds = coordinatorHouses?.map(hc => hc.house_id) || [];
      
      if (houseIds.length === 0) {
        setInspections([]);
        return;
      }

      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          house:houses(id, name),
          created_by_profile:profiles!created_by(name)
        `)
        .in('house_id', houseIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (err) {
      console.error('Error fetching inspections:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">House Inspections</h1>
        <p className="text-sm text-gray-500 mt-1">Inspections for your assigned houses</p>
      </div>

      {inspections.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 text-sm">No inspections found for your assigned houses.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inspections.map((inspection) => (
            <Link
              key={inspection.id}
              href={`/coordinator/inspections/${inspection.id}`}
              className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all p-5 group"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                      {inspection.house?.name || 'Unknown'}
                    </p>
                    <StatusBadge
                      label={inspection.status === 'FINAL' ? 'Finalised' : 'Draft'}
                      variant={inspection.status === 'FINAL' ? 'green' : 'orange'}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                    <span>{formatDate(inspection.finalised_at || inspection.created_at)}</span>
                    {inspection.created_by_profile?.name && (
                      <span>by {inspection.created_by_profile.name}</span>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
