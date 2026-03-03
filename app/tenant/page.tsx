'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTenantActiveTenancy, getTenantMoveOutIntention } from './move-out/actions';
import { StatusBadge, SectionCard, ActionList } from '@/components/dashboard';
import type { ActionItem } from '@/components/dashboard';

/* ── Icons ───────────────────────────────────────────────────────── */
const icons = {
  home: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    </svg>
  ),
  moveOut: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
    </svg>
  ),
  moveIn: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
    </svg>
  ),
  calendar: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  alert: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  check: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  clock: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

/* ── Types ───────────────────────────────────────────────────────── */
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

/* ── Helpers ─────────────────────────────────────────────────────── */
function getStatusBadge(status: string): { label: string; variant: 'green' | 'yellow' | 'orange' | 'blue' | 'gray' } {
  const map: Record<string, { label: string; variant: 'green' | 'yellow' | 'orange' | 'blue' | 'gray' }> = {
    OCCUPIED: { label: 'Active', variant: 'green' },
    MOVE_OUT_INTENDED: { label: 'Move-Out Intended', variant: 'orange' },
    MOVE_OUT_INSPECTION_DRAFT: { label: 'Inspection Draft', variant: 'yellow' },
    MOVE_OUT_INSPECTION_FINAL: { label: 'Inspection Final', variant: 'blue' },
    MOVE_IN_PENDING_SIGNATURE: { label: 'Pending Signature', variant: 'yellow' },
    ENDED: { label: 'Ended', variant: 'gray' },
  };
  return map[status] || { label: status.replace(/_/g, ' '), variant: 'gray' };
}

function getMoveOutStatusConfig(intention: MoveOutIntention) {
  if (intention.sign_off_status === 'REJECTED') {
    return {
      bgClass: 'bg-red-50 border-red-200',
      iconColor: 'text-red-500',
      icon: icons.warning,
      title: 'Move-Out Intention Rejected',
      titleColor: 'text-red-800',
      badge: { label: 'Rejected', variant: 'red' as const },
    };
  }
  if (intention.sign_off_status === 'APPROVED') {
    return {
      bgClass: 'bg-green-50 border-green-200',
      iconColor: 'text-green-500',
      icon: icons.check,
      title: 'Move-Out Approved',
      titleColor: 'text-green-800',
      badge: { label: 'Approved', variant: 'green' as const },
    };
  }
  // PENDING
  if (intention.coordinator_reviewed) {
    return {
      bgClass: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-500',
      icon: icons.clock,
      title: 'Inspection Scheduled',
      titleColor: 'text-blue-800',
      badge: { label: 'Reviewed', variant: 'blue' as const },
    };
  }
  return {
    bgClass: 'bg-yellow-50 border-yellow-200',
    iconColor: 'text-yellow-500',
    icon: icons.clock,
    title: 'Pending Review',
    titleColor: 'text-yellow-800',
    badge: { label: 'Pending', variant: 'yellow' as const },
  };
}

/* ── Component ───────────────────────────────────────────────────── */
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
      const result = await getTenantActiveTenancy();
      if (result.error) {
        setError(result.error);
        setTenancy(null);
      } else if (result.data) {
        setTenancy(result.data as TenancyData);
        setError(null);
        const intentionResult = await getTenantMoveOutIntention(result.data.id);
        if (intentionResult.data) {
          setMoveOutIntention(intentionResult.data as MoveOutIntention);
        }
      } else {
        setTenancy(null);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTenancy(null);
    } finally {
      setLoading(false);
    }
  }

  /* ── Build action items ────────────────────────────────────────── */
  const actionItems: ActionItem[] = [];
  if (moveOutIntention?.sign_off_status === 'REJECTED') {
    actionItems.push({
      id: 'resubmit',
      title: 'Resubmit Move-Out Intention',
      description: 'Your move-out intention was rejected — review feedback and resubmit',
      href: '/tenant/move-out',
      badge: { label: 'Action Needed', variant: 'red', pulse: true },
      icon: <div className="text-red-500">{icons.warning}</div>,
    });
  }
  if (!moveOutIntention && tenancy) {
    actionItems.push({
      id: 'move-out',
      title: 'Submit Move-Out Intention',
      description: 'Notify coordinators about your planned move-out date',
      href: '/tenant/move-out',
      icon: <div className="text-blue-500">{icons.moveOut}</div>,
    });
  }
  if (tenancy) {
    actionItems.push({
      id: 'move-in',
      title: 'Move-In Acknowledgement',
      description: 'View room condition and sign move-in acknowledgement',
      href: '/tenant/move-in',
      icon: <div className="text-blue-500">{icons.moveIn}</div>,
    });
  }

  const moveOutConfig = moveOutIntention ? getMoveOutStatusConfig(moveOutIntention) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tenant Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your tenancy details and available actions
        </p>
      </div>

      {/* Current Tenancy Card */}
      <SectionCard
        title="Current Tenancy"
        icon={icons.home}
        action={tenancy ? <StatusBadge {...getStatusBadge(tenancy.status)} /> : undefined}
      >
        {loading ? (
          <div className="p-5 space-y-3">
            <div className="h-5 bg-gray-100 animate-pulse rounded w-2/3" />
            <div className="h-4 bg-gray-100 animate-pulse rounded w-1/2" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="h-16 bg-gray-100 animate-pulse rounded" />
              <div className="h-16 bg-gray-100 animate-pulse rounded" />
            </div>
          </div>
        ) : error ? (
          <div className="p-5">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium text-sm">Error loading tenancy</p>
              <p className="text-red-600 text-xs mt-1">{error}</p>
              <button onClick={fetchTenancy} className="mt-3 px-3 py-1.5 bg-red-100 text-red-800 rounded hover:bg-red-200 text-xs font-medium transition-colors">
                Retry
              </button>
            </div>
          </div>
        ) : tenancy ? (
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-lg p-2.5 bg-blue-50 flex-shrink-0">
                <div className="text-blue-600">{icons.home}</div>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{tenancy.room?.house?.name || 'Unknown House'}</p>
                <p className="text-sm text-gray-500">Room {tenancy.room?.label || '—'}</p>
                {tenancy.room?.house?.address && (
                  <p className="text-xs text-gray-400 mt-0.5">{tenancy.room.house.address}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {tenancy.start_date ? new Date(tenancy.start_date).toLocaleDateString() : '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                <div className="mt-1">
                  <StatusBadge {...getStatusBadge(tenancy.status)} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <div className="text-blue-500 flex-shrink-0 mt-0.5">{icons.alert}</div>
              <div>
                <p className="text-blue-800 font-medium text-sm">No active tenancy found</p>
                <p className="text-blue-600 text-xs mt-1">
                  You don&apos;t have an active tenancy at the moment. Please contact your administrator if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Move-Out Status Alert (if applicable) */}
      {moveOutConfig && moveOutIntention && (
        <div className={`border rounded-xl p-5 ${moveOutConfig.bgClass}`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 ${moveOutConfig.iconColor}`}>
              {moveOutConfig.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-semibold ${moveOutConfig.titleColor}`}>
                  {moveOutConfig.title}
                </h3>
                <StatusBadge label={moveOutConfig.badge.label} variant={moveOutConfig.badge.variant} />
              </div>

              {moveOutIntention.sign_off_status === 'REJECTED' ? (
                <>
                  <p className="text-sm text-red-700 mt-2">
                    Your move-out intention submitted on {new Date(moveOutIntention.created_at).toLocaleDateString()} was rejected.
                  </p>
                  {moveOutIntention.coordinator_notes && (
                    <div className="mt-3 bg-white/70 p-3 rounded-lg border border-red-100">
                      <p className="text-xs font-medium text-gray-600 mb-1">Coordinator Feedback:</p>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">{moveOutIntention.coordinator_notes}</pre>
                    </div>
                  )}
                  <Link
                    href="/tenant/move-out"
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {icons.moveOut}
                    Review & Resubmit
                  </Link>
                </>
              ) : moveOutIntention.sign_off_status === 'APPROVED' ? (
                <p className="text-sm text-green-700 mt-2">
                  Your move-out for {new Date(moveOutIntention.planned_move_out_date).toLocaleDateString()} has been approved. Please ensure you complete all checkout requirements by this date.
                </p>
              ) : moveOutIntention.coordinator_reviewed ? (
                <p className="text-sm text-blue-700 mt-2">
                  Your move-out intention has been reviewed. An inspection will be conducted before your move-out date of {new Date(moveOutIntention.planned_move_out_date).toLocaleDateString()}.
                </p>
              ) : (
                <p className="text-sm text-yellow-700 mt-2">
                  Your move-out intention for {new Date(moveOutIntention.planned_move_out_date).toLocaleDateString()} is awaiting coordinator review.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <SectionCard
        title={moveOutIntention?.sign_off_status === 'REJECTED' ? 'Required Actions' : 'Available Actions'}
        icon={icons.alert}
        action={
          moveOutIntention?.sign_off_status === 'REJECTED'
            ? <StatusBadge label="Action Needed" variant="red" pulse />
            : undefined
        }
      >
        <ActionList
          items={actionItems}
          emptyMessage="No actions available"
        />
      </SectionCard>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/tenant/move-out"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="rounded-lg p-2 bg-orange-50 group-hover:scale-110 transition-transform">
              <div className="text-orange-600">{icons.moveOut}</div>
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-center">
              {moveOutIntention?.sign_off_status === 'REJECTED' ? 'Resubmit Move-Out' : 'Move Out'}
            </span>
          </Link>
          <Link
            href="/tenant/move-in"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="rounded-lg p-2 bg-blue-50 group-hover:scale-110 transition-transform">
              <div className="text-blue-600">{icons.moveIn}</div>
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-center">Move In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
