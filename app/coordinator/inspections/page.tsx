'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Inspection } from '@/lib/types';

export default function InspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<any[]>([]);
  const [pendingIntentions, setPendingIntentions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchInspections();
      fetchPendingIntentions();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchInspections() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          room:rooms(id, label),
          tenancy:tenancies(id, tenant:profiles!tenant_user_id(name, email))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPendingIntentions() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('move_out_intentions')
        .select(`
          *,
          tenancy:tenancies(
            id,
            status,
            room:rooms(id, label),
            tenant:profiles!tenant_user_id(name, email)
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setPendingIntentions(data || []);
    } catch (error) {
      console.error('Error fetching pending intentions:', error);
    }
  }

  async function handleCreateInspection(intentionId: string, tenancyId: string, roomId: string) {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to create inspections');
        return;
      }

      const { data, error } = await supabase
        .from('inspections')
        .insert([{
          tenancy_id: tenancyId,
          room_id: roomId,
          created_by: user.id,
          status: 'DRAFT',
        }])
        .select()
        .single();

      if (error) throw error;

      // Update tenancy status
      await supabase
        .from('tenancies')
        .update({ status: 'MOVE_OUT_INSPECTION_DRAFT' })
        .eq('id', tenancyId);

      alert('Inspection created successfully');
      router.push(`/coordinator/inspections/${data.id}`);
    } catch (error: any) {
      console.error('Error creating inspection:', error);
      alert(error?.message || 'Error creating inspection');
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
      <h1 className="text-3xl font-bold text-gray-900">Inspections</h1>

      {/* Pending Move-Out Intentions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Pending Move-Out Intentions
        </h2>
        {pendingIntentions.length === 0 ? (
          <p className="text-gray-500">No pending move-out intentions.</p>
        ) : (
          <div className="space-y-4">
            {pendingIntentions.map((intention) => (
              <div
                key={intention.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {intention.tenancy?.tenant?.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Room: {intention.tenancy?.room?.label}
                    </p>
                    <p className="text-sm text-gray-600">
                      Planned move-out: {new Date(intention.planned_move_out_date).toLocaleDateString()}
                    </p>
                    {intention.notes && (
                      <p className="text-sm text-gray-500 mt-2">
                        Notes: {intention.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      handleCreateInspection(
                        intention.id,
                        intention.tenancy_id,
                        intention.tenancy?.room?.id
                      )
                    }
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Create Inspection
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Inspections */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">All Inspections</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
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
            {inspections.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No inspections yet. Create an inspection from a move-out intention above.
                </td>
              </tr>
            ) : (
              inspections.map((inspection) => (
                <tr key={inspection.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {inspection.room?.label}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {inspection.tenancy?.tenant?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {inspection.tenancy?.tenant?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        inspection.status === 'FINAL'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {inspection.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(inspection.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => router.push(`/coordinator/inspections/${inspection.id}`)}
                      className="text-green-600 hover:text-green-900"
                    >
                      {inspection.status === 'FINAL' ? 'View' : 'Edit'}
                    </button>
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
