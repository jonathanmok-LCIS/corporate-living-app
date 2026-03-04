'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchHousesWithStats, type HouseWithStats } from './actions';

export default function HousesPage() {
  const [houses, setHouses] = useState<HouseWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHouses();
  }, []);

  async function loadHouses() {
    try {
      const result = await fetchHousesWithStats();
      if (result.error) {
        console.error('Error fetching houses:', result.error);
      }
      setHouses(result.data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Houses</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/houses/archived"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            View Archived
          </Link>
          <Link
            href="/admin/houses/quick-setup"
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add House
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {houses.length === 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Getting started:</span> Click{' '}
            <strong>Add House</strong> to create a house and set up all its rooms.
          </p>
        </div>
      )}

      {/* Houses grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {houses.map((house) => {
          const available = house.totalSlots - house.occupiedSlots;
          const hasPending = house.pendingMoveOuts > 0 || house.pendingInspections > 0;

          return (
            <Link
              key={house.id}
              href={`/admin/houses/${house.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 group"
            >
              {/* House name + address */}
              <div className="p-5 pb-3">
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                  {house.name}
                </h2>
                {house.address && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{house.address}</p>
                )}
              </div>

              {/* KPI row */}
              <div className="px-5 pb-4 grid grid-cols-3 gap-3 text-center">
                {/* Slots */}
                <div className="bg-gray-50 rounded-lg py-2">
                  <p className="text-lg font-bold text-gray-900">
                    {house.occupiedSlots}/{house.totalSlots}
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium uppercase">Occupied</p>
                </div>

                {/* Available */}
                <div
                  className={`rounded-lg py-2 ${available > 0 ? 'bg-green-50' : 'bg-gray-50'}`}
                >
                  <p
                    className={`text-lg font-bold ${available > 0 ? 'text-green-700' : 'text-gray-400'}`}
                  >
                    {available}
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium uppercase">Available</p>
                </div>

                {/* Coordinators */}
                <div className="bg-gray-50 rounded-lg py-2">
                  <p className="text-lg font-bold text-gray-900">{house.coordinatorCount}</p>
                  <p className="text-[11px] text-gray-500 font-medium uppercase">Coordinators</p>
                </div>
              </div>

              {/* Pending alerts */}
              {hasPending && (
                <div className="px-5 pb-4 flex flex-wrap gap-2">
                  {house.pendingMoveOuts > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                      </svg>
                      {house.pendingMoveOuts} move-out{house.pendingMoveOuts !== 1 ? 's' : ''} pending
                    </span>
                  )}
                  {house.pendingInspections > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {house.pendingInspections} inspection{house.pendingInspections !== 1 ? 's' : ''} draft
                    </span>
                  )}
                </div>
              )}

              {/* Last inspection footer */}
              <div className="border-t border-gray-100 px-5 py-2.5 text-xs text-gray-400 flex justify-between items-center">
                <span>
                  {house.lastInspectionDate
                    ? `Last inspection: ${new Date(house.lastInspectionDate).toLocaleDateString('en-AU', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}`
                    : 'No inspections'}
                </span>
                <svg
                  className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
