'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

interface MoveOutIntention {
  id: string;
  tenancy_id: string;
  planned_move_out_date: string;
  notes: string | null;
  reason: string | null;
  created_at: string;
  closed_at: string | null;
  closed_by: string | null;
  admin_notes: string | null;
  // Coordinator review fields (new)
  coordinator_reviewed: boolean | null;
  coordinator_reviewed_at: string | null;
  coordinator_reviewed_by: string | null;
  coordinator_notes: string | null;
  // Legacy coordinator sign-off fields
  sign_off_status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  coordinator_signed_off_by: string | null;
  coordinator_signed_off_at: string | null;
  // Admin approval fields
  admin_approved: boolean | null;
  admin_approved_at: string | null;
  admin_approved_by: string | null;
  tenancy?: {
    id: string;
    status: string;
    room?: {
      id: string;
      label: string;
      house?: {
        id: string;
        name: string;
      };
    };
    tenant?: {
      name: string;
      email: string;
    };
  };
  coordinator_reviewed_by_profile?: {
    name: string;
  };
  coordinator_signed_off_by_profile?: {
    name: string;
  };
}

export default function AdminMoveOutIntentionsPage() {
  const [intentions, setIntentions] = useState<MoveOutIntention[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open');

  useEffect(() => {
    fetchIntentions();
  }, []);

  async function fetchIntentions() {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('move_out_intentions')
        .select(`
          *,
          tenancy:tenancies(
            id,
            status,
            room:rooms(id, label, house:houses(id, name)),
            tenant:profiles!tenant_user_id(name, email)
          ),
          coordinator_reviewed_by_profile:profiles!coordinator_reviewed_by(name),
          coordinator_signed_off_by_profile:profiles!coordinator_signed_off_by(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntentions(data || []);
    } catch (err) {
      console.error('Error fetching move-out intentions:', err);
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

  function getWorkflowStatus(intention: MoveOutIntention): { 
    label: string; 
    color: string; 
    subLabel?: string;
  } {
    if (intention.closed_at) {
      return { label: 'Closed', color: 'bg-gray-100 text-gray-800' };
    }
    if (intention.admin_approved === true) {
      return { label: 'Approved', color: 'bg-green-100 text-green-800', subLabel: 'Awaiting bond refund' };
    }
    if (intention.admin_approved === false) {
      return { label: 'Rejected', color: 'bg-red-100 text-red-800', subLabel: 'Tenant to fix issues' };
    }
    // Check new fields first, then fallback to legacy sign_off_status
    if (intention.coordinator_reviewed === true || intention.sign_off_status === 'APPROVED') {
      return { label: 'Ready for Approval', color: 'bg-purple-100 text-purple-800', subLabel: 'Coordinator approved' };
    }
    if (intention.coordinator_reviewed === false || intention.sign_off_status === 'REJECTED') {
      return { label: 'Issues Found', color: 'bg-orange-100 text-orange-800', subLabel: 'Coordinator flagged issues' };
    }
    return { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800', subLabel: 'Awaiting coordinator' };
  }

  const filteredIntentions = intentions.filter((intention) => {
    if (filter === 'open') return !intention.closed_at;
    if (filter === 'closed') return !!intention.closed_at;
    return true;
  });

  const openCount = intentions.filter(i => !i.closed_at).length;
  const closedCount = intentions.filter(i => !!i.closed_at).length;

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Move-Out Intentions</h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('open')}
          className={`px-4 py-2 rounded ${
            filter === 'open'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 rounded ${
            filter === 'closed'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Closed ({closedCount})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All ({intentions.length})
        </button>
      </div>

      {/* Intentions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room / House
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Planned Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coordinator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIntentions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No move-out intentions found.
                  </td>
                </tr>
              ) : (
                filteredIntentions.map((intention) => {
                  const workflowStatus = getWorkflowStatus(intention);
                  return (
                    <tr key={intention.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {intention.tenancy?.tenant?.name || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {intention.tenancy?.tenant?.email || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {intention.tenancy?.room?.label || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {intention.tenancy?.room?.house?.name || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(intention.planned_move_out_date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Submitted: {formatDate(intention.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${workflowStatus.color}`}>
                          {workflowStatus.label}
                        </span>
                        {workflowStatus.subLabel && (
                          <div className="text-xs text-gray-500 mt-1">
                            {workflowStatus.subLabel}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(intention.coordinator_reviewed_by_profile || intention.coordinator_signed_off_by_profile) ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {intention.coordinator_reviewed_by_profile?.name || intention.coordinator_signed_off_by_profile?.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(intention.coordinator_reviewed === true || intention.sign_off_status === 'APPROVED') ? 'Approved' : 
                               (intention.coordinator_reviewed === false || intention.sign_off_status === 'REJECTED') ? 'Flagged issues' : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not reviewed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/admin/move-out-intentions/${intention.id}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
