'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { KpiCard, SectionCard, ActionList, StatusBadge } from '@/components/dashboard';
import type { ActionItem } from '@/components/dashboard';

/* ── Icons (inline SVGs keep bundle light) ───────────────────────── */
const icons = {
  home: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    </svg>
  ),
  users: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9.12 0A4 4 0 0017 10a4 4 0 00-1.88-3.39M9 10a4 4 0 110-8 4 4 0 010 8z" />
    </svg>
  ),
  key: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  chart: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0h6m-6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m6 0v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4" />
    </svg>
  ),
  moveOut: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
    </svg>
  ),
  clipboard: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  alert: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

/* ── Types ───────────────────────────────────────────────────────── */
interface DashboardData {
  // KPIs
  totalHouses: number;
  activeTenancies: number;
  totalRooms: number;
  occupiedRooms: number;
  // Pending actions
  moveOutIntentions: number;
  pendingSignatures: number;
  draftInspections: number;
  // Recent activity
  recentMoveOuts: { id: string; tenant_name: string; house_name: string; room_label: string; planned_date: string; status: string }[];
  recentInspections: { id: string; house_name: string; status: string; created_at: string }[];
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ── Component ───────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const [
        housesRes,
        roomsRes,
        activeTenanciesRes,
        moveOutRes,
        signaturesRes,
        inspDraftRes,
        recentMoveOutsRes,
        recentInspRes,
      ] = await Promise.all([
        supabase.from('houses').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('rooms').select('id, house_id', { count: 'exact' }).eq('active', true),
        supabase.from('tenancies').select('id, room_id', { count: 'exact' }).in('status', ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING']),
        supabase.from('move_out_intentions').select('id', { count: 'exact', head: true }).in('status', ['PENDING', 'SUBMITTED']),
        supabase.from('tenancies').select('id', { count: 'exact', head: true }).eq('keys_received', false).eq('status', 'ACTIVE'),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('status', 'DRAFT'),
        supabase.from('move_out_intentions').select('id, planned_move_out_date, status, sign_off_status, created_at, tenancy:tenancies(id, tenant_user_id, room:rooms(label, house:houses(name)))').order('created_at', { ascending: false }).limit(5),
        supabase.from('inspections').select('id, status, created_at, house:houses(name)').order('created_at', { ascending: false }).limit(5),
      ]);

      // compute occupied rooms from active tenancies room_ids
      const occupiedRoomIds = new Set((activeTenanciesRes.data || []).map((t: { room_id: string }) => t.room_id));

      setData({
        totalHouses: housesRes.count || 0,
        activeTenancies: activeTenanciesRes.count || 0,
        totalRooms: roomsRes.count || 0,
        occupiedRooms: occupiedRoomIds.size,
        moveOutIntentions: moveOutRes.count || 0,
        pendingSignatures: signaturesRes.count || 0,
        draftInspections: inspDraftRes.count || 0,
        recentMoveOuts: (recentMoveOutsRes.data || []).map((m: Record<string, unknown>) => {
          const tenancy = m.tenancy as Record<string, unknown> | null;
          const room = tenancy?.room as Record<string, unknown> | null;
          const house = room?.house as Record<string, unknown> | null;
          return {
            id: m.id as string,
            tenant_name: '',
            house_name: (house?.name as string) || 'Unknown',
            room_label: (room?.label as string) || '',
            planned_date: m.planned_move_out_date as string,
            status: (m.sign_off_status as string) || (m.status as string) || 'PENDING',
          };
        }),
        recentInspections: (recentInspRes.data || []).map((i: Record<string, unknown>) => {
          const house = i.house as Record<string, unknown> | null;
          return {
            id: i.id as string,
            house_name: (house?.name as string) || 'Unknown',
            status: i.status as string,
            created_at: i.created_at as string,
          };
        }),
      });
      setLoading(false);
    }

    fetchAll();
  }, []);

  const occupancyPct = data && data.totalRooms > 0 ? Math.round((data.occupiedRooms / data.totalRooms) * 100) : 0;
  const totalPending = data ? data.moveOutIntentions + data.pendingSignatures + data.draftInspections : 0;

  /* ── Build action items for approval queue ─────────────────────── */
  const actionItems: ActionItem[] = [];
  if (data) {
    if (data.moveOutIntentions > 0) {
      actionItems.push({
        id: 'move-outs',
        title: `${data.moveOutIntentions} move-out intention${data.moveOutIntentions !== 1 ? 's' : ''} awaiting review`,
        href: '/admin/move-out-intentions',
        badge: { label: 'Urgent', variant: 'red', pulse: true },
        icon: <div className="text-red-500">{icons.moveOut}</div>,
      });
    }
    if (data.draftInspections > 0) {
      actionItems.push({
        id: 'inspections',
        title: `${data.draftInspections} draft inspection${data.draftInspections !== 1 ? 's' : ''} pending`,
        href: '/admin/inspections',
        badge: { label: 'Pending', variant: 'orange' },
        icon: <div className="text-orange-500">{icons.clipboard}</div>,
      });
    }
    if (data.pendingSignatures > 0) {
      actionItems.push({
        id: 'signatures',
        title: `${data.pendingSignatures} tenancy signature${data.pendingSignatures !== 1 ? 's' : ''} outstanding`,
        href: '/admin/tenancies',
        badge: { label: 'Awaiting', variant: 'yellow' },
        icon: <div className="text-yellow-500">{icons.key}</div>,
      });
    }
  }

  /* ── Recent activity feed ──────────────────────────────────────── */
  const activityItems: ActionItem[] = [];
  if (data) {
    data.recentMoveOuts.forEach((m) => {
      const statusMap: Record<string, { label: string; variant: 'red' | 'orange' | 'green' | 'yellow' | 'gray' }> = {
        REJECTED: { label: 'Rejected', variant: 'red' },
        PENDING: { label: 'Pending', variant: 'orange' },
        APPROVED: { label: 'Approved', variant: 'green' },
        SUBMITTED: { label: 'Submitted', variant: 'yellow' },
      };
      const badge = statusMap[m.status] || { label: m.status, variant: 'gray' as const };
      activityItems.push({
        id: `mo-${m.id}`,
        title: `Move-out: ${m.house_name} ${m.room_label}`,
        description: `Planned: ${new Date(m.planned_date).toLocaleDateString()}`,
        href: `/admin/move-out-intentions/${m.id}`,
        badge,
        icon: icons.moveOut,
      });
    });
    data.recentInspections.forEach((i) => {
      activityItems.push({
        id: `ins-${i.id}`,
        title: `Inspection: ${i.house_name}`,
        href: `/admin/inspections/${i.id}`,
        badge: { label: i.status, variant: i.status === 'DRAFT' ? 'orange' : 'green' },
        icon: icons.clipboard,
        meta: timeAgo(i.created_at),
      });
    });
  }

  /* ── Quick links ───────────────────────────────────────────────── */
  const quickLinks = [
    { href: '/admin/houses', label: 'Houses & Rooms', icon: icons.home, color: 'text-purple-600', bg: 'bg-purple-50' },
    { href: '/admin/tenancies', label: 'Tenancies', icon: icons.key, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { href: '/admin/users', label: 'Users', icon: icons.users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { href: '/admin/inspections', label: 'Inspections', icon: icons.clipboard, color: 'text-green-600', bg: 'bg-green-50' },
    { href: '/admin/move-out-intentions', label: 'Move-Outs', icon: icons.moveOut, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of properties, tenancies, and pending actions
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard label="Total Houses" value={data?.totalHouses ?? '—'} icon={icons.home} color="purple" loading={loading} />
        <KpiCard label="Active Tenancies" value={data?.activeTenancies ?? '—'} icon={icons.key} color="blue" loading={loading} />
        <KpiCard label="Occupancy" value={loading ? '—' : `${occupancyPct}%`} icon={icons.chart} color="green" loading={loading} subtitle={data ? `${data.occupiedRooms} of ${data.totalRooms} rooms` : undefined} />
        <KpiCard label="Pending Actions" value={loading ? '—' : totalPending} icon={icons.alert} color={totalPending > 0 ? 'orange' : 'gray'} loading={loading} />
      </div>

      {/* Approval Queue + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Approval Queue */}
        <SectionCard
          title="Approval Queue"
          icon={icons.alert}
          action={totalPending > 0 ? <StatusBadge label={`${totalPending} pending`} variant="red" pulse /> : undefined}
        >
          <ActionList
            items={actionItems}
            emptyMessage="All caught up — no pending actions"
            emptyIcon={<div className="text-green-400">{icons.check}</div>}
          />
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard
          title="Recent Activity"
          icon={icons.chart}
          action={
            <Link href="/admin/move-out-intentions" className="text-xs text-purple-600 hover:text-purple-800 font-medium">
              View all →
            </Link>
          }
        >
          <ActionList
            items={activityItems}
            emptyMessage="No recent activity"
          />
        </SectionCard>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group"
            >
              <div className={`rounded-lg p-2 ${link.bg} group-hover:scale-110 transition-transform`}>
                <div className={link.color}>{link.icon}</div>
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700 text-center">
                {link.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
