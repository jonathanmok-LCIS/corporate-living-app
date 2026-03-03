'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { KpiCard, SectionCard, ActionList, StatusBadge } from '@/components/dashboard';
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
  users: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9.12 0A4 4 0 0017 10a4 4 0 00-1.88-3.39M9 10a4 4 0 110-8 4 4 0 010 8z" />
    </svg>
  ),
};

/* ── Types ───────────────────────────────────────────────────────── */
interface HouseOverview {
  id: string;
  name: string;
  address?: string;
  totalRooms: number;
  occupiedRooms: number;
  pendingIntentions: number;
}

interface CoordinatorData {
  assignedHouses: number;
  pendingIntentions: number;
  inspections: number;
  totalTenants: number;
  houses: HouseOverview[];
  pendingItems: { id: string; house_name: string; room_label: string; planned_date: string; created_at: string }[];
}

/* ── Component ───────────────────────────────────────────────────── */
export default function CoordinatorDashboard() {
  const [data, setData] = useState<CoordinatorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get assigned houses
      const { data: coordHouses } = await supabase
        .from('house_coordinators')
        .select('house_id')
        .eq('user_id', user.id);

      const houseIds = coordHouses?.map(hc => hc.house_id) || [];

      if (houseIds.length === 0) {
        setData({
          assignedHouses: 0,
          pendingIntentions: 0,
          inspections: 0,
          totalTenants: 0,
          houses: [],
          pendingItems: [],
        });
        setLoading(false);
        return;
      }

      // Fetch in parallel
      const [housesRes, roomsRes, inspectionsRes] = await Promise.all([
        supabase.from('houses').select('id, name, address').in('id', houseIds),
        supabase.from('rooms').select('id, house_id, label').in('house_id', houseIds).eq('active', true),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).in('house_id', houseIds),
      ]);

      const houses = housesRes.data || [];
      const rooms = roomsRes.data || [];
      const roomIds = rooms.map(r => r.id);

      // Tenancies for those rooms
      let tenancies: { id: string; room_id: string; status: string }[] = [];
      if (roomIds.length > 0) {
        const { data: tData } = await supabase
          .from('tenancies')
          .select('id, room_id, status')
          .in('room_id', roomIds)
          .in('status', ['OCCUPIED', 'MOVE_OUT_INTENDED', 'MOVE_OUT_INSPECTION_DRAFT', 'MOVE_OUT_INSPECTION_FINAL', 'MOVE_IN_PENDING_SIGNATURE']);
        tenancies = tData || [];
      }

      const tenancyIds = tenancies.map(t => t.id);

      // Pending move-out intentions
      let pendingItems: { id: string; tenancy_id: string; planned_move_out_date: string; created_at: string }[] = [];
      let intentionsCount = 0;
      if (tenancyIds.length > 0) {
        const { data: moData, count } = await supabase
          .from('move_out_intentions')
          .select('id, tenancy_id, planned_move_out_date, created_at', { count: 'exact' })
          .in('tenancy_id', tenancyIds)
          .eq('coordinator_reviewed', false)
          .order('created_at', { ascending: false })
          .limit(10);
        pendingItems = moData || [];
        intentionsCount = count || 0;
      }

      // Build house overviews
      const houseOverviews: HouseOverview[] = houses.map(h => {
        const houseRooms = rooms.filter(r => r.house_id === h.id);
        const houseRoomIds = houseRooms.map(r => r.id);
        const occupiedCount = tenancies.filter(t => houseRoomIds.includes(t.room_id)).length;
        const houseTenancyIds = tenancies.filter(t => houseRoomIds.includes(t.room_id)).map(t => t.id);
        const housePending = pendingItems.filter(p => houseTenancyIds.includes(p.tenancy_id)).length;
        return {
          id: h.id,
          name: h.name,
          address: h.address,
          totalRooms: houseRooms.length,
          occupiedRooms: occupiedCount,
          pendingIntentions: housePending,
        };
      });

      // Map pending items to display format
      const mappedPending = pendingItems.map(p => {
        const tenancy = tenancies.find(t => t.id === p.tenancy_id);
        const room = tenancy ? rooms.find(r => r.id === tenancy.room_id) : null;
        const house = room ? houses.find(h => h.id === room.house_id) : null;
        return {
          id: p.id,
          house_name: house?.name || 'Unknown',
          room_label: room?.label || '',
          planned_date: p.planned_move_out_date,
          created_at: p.created_at,
        };
      });

      setData({
        assignedHouses: houseIds.length,
        pendingIntentions: intentionsCount,
        inspections: inspectionsRes.count || 0,
        totalTenants: tenancies.length,
        houses: houseOverviews,
        pendingItems: mappedPending,
      });
    } catch (error) {
      console.error('Error fetching coordinator data:', error);
    } finally {
      setLoading(false);
    }
  }

  /* ── Action items ──────────────────────────────────────────────── */
  const actionItems: ActionItem[] = [];
  if (data) {
    data.pendingItems.forEach((p) => {
      actionItems.push({
        id: p.id,
        title: `${p.house_name} — ${p.room_label}`,
        description: `Move-out planned: ${new Date(p.planned_date).toLocaleDateString()}`,
        href: '/coordinator/move-out-reviews',
        badge: { label: 'Review', variant: 'orange', pulse: true },
        icon: <div className="text-orange-500">{icons.moveOut}</div>,
      });
    });
  }

  const totalActions = data?.pendingIntentions || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Coordinator Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your assigned houses and review move-out intentions
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard label="Assigned Houses" value={data?.assignedHouses ?? '—'} icon={icons.home} color="green" loading={loading} />
        <KpiCard label="Active Tenants" value={data?.totalTenants ?? '—'} icon={icons.users} color="blue" loading={loading} />
        <KpiCard label="Inspections" value={data?.inspections ?? '—'} icon={icons.clipboard} color="purple" loading={loading} />
        <KpiCard label="Pending Reviews" value={data?.pendingIntentions ?? '—'} icon={icons.alert} color={totalActions > 0 ? 'orange' : 'gray'} loading={loading} />
      </div>

      {/* No houses warning */}
      {!loading && data?.assignedHouses === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <div className="text-amber-500 flex-shrink-0 mt-0.5">{icons.alert}</div>
          <div>
            <p className="font-medium text-amber-800">No Houses Assigned</p>
            <p className="text-sm text-amber-700 mt-1">
              You have not been assigned to any houses yet. Please contact an administrator to get house assignments.
            </p>
          </div>
        </div>
      )}

      {/* Action Required + Assigned Houses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Action Required */}
        <SectionCard
          title="Action Required"
          icon={icons.alert}
          action={totalActions > 0 ? <StatusBadge label={`${totalActions} pending`} variant="orange" pulse /> : undefined}
        >
          <ActionList
            items={actionItems}
            emptyMessage="No outstanding actions — great work!"
            emptyIcon={<div className="text-green-400">{icons.check}</div>}
          />
        </SectionCard>

        {/* Assigned Houses */}
        <SectionCard
          title="Assigned Houses"
          icon={icons.home}
          action={<span className="text-xs text-gray-400">{data?.houses.length || 0} house{(data?.houses.length || 0) !== 1 ? 's' : ''}</span>}
        >
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />)}
            </div>
          ) : data && data.houses.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {data.houses.map((house) => {
                const occupancyPct = house.totalRooms > 0 ? Math.round((house.occupiedRooms / house.totalRooms) * 100) : 0;
                return (
                  <div key={house.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{house.name}</p>
                        {house.address && <p className="text-xs text-gray-500 truncate">{house.address}</p>}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        {house.pendingIntentions > 0 && (
                          <StatusBadge label={`${house.pendingIntentions} pending`} variant="orange" pulse />
                        )}
                      </div>
                    </div>
                    {/* Mini occupancy bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${occupancyPct >= 80 ? 'bg-green-500' : occupancyPct >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {house.occupiedRooms}/{house.totalRooms} rooms
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No houses assigned</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link
            href="/coordinator/move-out-reviews"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all group"
          >
            <div className="rounded-lg p-2 bg-orange-50 group-hover:scale-110 transition-transform">
              <div className="text-orange-600">{icons.moveOut}</div>
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 text-center">Move-Out Reviews</span>
          </Link>
          <Link
            href="/coordinator/inspections"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all group"
          >
            <div className="rounded-lg p-2 bg-green-50 group-hover:scale-110 transition-transform">
              <div className="text-green-600">{icons.clipboard}</div>
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 text-center">Inspections</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
