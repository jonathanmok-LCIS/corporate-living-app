'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { fetchRoomsWithTenancies } from '../rooms/actions';

type TenancyLite = {
  status: string;
  rental_price?: string | number | null;
};

type RoomLite = {
  id: string;
  label: string;
  active: boolean;
  rental_price?: number | null;
  tenancies?: TenancyLite[];
};

type CalculatorRow = {
  id: string;
  label: string;
  currentRent: number;
  weighting: number;
  manualFinalRent: string;
};

const ACTIVE_STATUSES = ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING'];

function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export default function RentCalculatorPage() {
  const params = useParams();
  const houseId = params.id as string;

  const [houseName, setHouseName] = useState('House');
  const [rows, setRows] = useState<CalculatorRow[]>([]);
  const [currentRentalCost, setCurrentRentalCost] = useState('0');
  const [projectedRentalCost, setProjectedRentalCost] = useState('0');
  const [bufferPercentage, setBufferPercentage] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: houseData } = await supabase
          .from('houses')
          .select('name')
          .eq('id', houseId)
          .single();

        if (houseData?.name) {
          setHouseName(houseData.name);
        }

        const result = await fetchRoomsWithTenancies(houseId);
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        const activeRooms = ((result.data || []) as RoomLite[]).filter((room) => room.active);

        const mappedRows: CalculatorRow[] = activeRooms.map((room) => {
          const activeTenancies = (room.tenancies || []).filter((tenancy) =>
            ACTIVE_STATUSES.includes(tenancy.status)
          );

          const tenancyRent = activeTenancies.reduce((sum, tenancy) => {
            const value = Number(tenancy.rental_price || 0);
            return sum + (Number.isFinite(value) ? value : 0);
          }, 0);

          const currentRent = toMoney(tenancyRent > 0 ? tenancyRent : Number(room.rental_price || 0));

          return {
            id: room.id,
            label: room.label,
            currentRent,
            weighting: 1,
            manualFinalRent: '',
          };
        });

        const totalCurrent = toMoney(mappedRows.reduce((sum, row) => sum + row.currentRent, 0));
        setRows(mappedRows);
        setCurrentRentalCost(totalCurrent.toFixed(2));
        setProjectedRentalCost(totalCurrent.toFixed(2));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load calculator data');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [houseId]);

  const projected = Number(projectedRentalCost || 0);
  const buffer = Number(bufferPercentage || 0);
  const totalWeighting = rows.reduce((sum, row) => sum + (Number.isFinite(row.weighting) ? row.weighting : 0), 0);

  const calculatedByRow = useMemo(() => {
    const factor = 1 + buffer / 100;
    return rows.reduce<Record<string, number>>((acc, row) => {
      const proportion = totalWeighting > 0 ? row.weighting / totalWeighting : 0;
      acc[row.id] = toMoney(projected * proportion * factor);
      return acc;
    }, {});
  }, [rows, projected, buffer, totalWeighting]);

  const totalCalculated = toMoney(Object.values(calculatedByRow).reduce((sum, value) => sum + value, 0));
  const totalFinal = toMoney(
    rows.reduce((sum, row) => {
      const manual = row.manualFinalRent.trim();
      if (!manual) return sum + (calculatedByRow[row.id] || 0);
      const parsed = Number(manual);
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0)
  );

  function updateWeighting(id: string, next: string) {
    const parsed = Number(next);
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, weighting: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 }
          : row
      )
    );
  }

  function updateManualFinalRent(id: string, next: string) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, manualFinalRent: next } : row)));
  }

  if (loading) {
    return <div className="text-center py-8">Loading rent calculator...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href={`/admin/houses/${houseId}`} className="text-purple-600 hover:text-purple-800 text-sm">
          ← Back to House
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={`/admin/houses/${houseId}`} className="text-purple-600 hover:text-purple-800 text-sm">
        ← Back to House
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rent Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">{houseName}</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm text-gray-700">
          Current Rental Cost
          <input
            type="number"
            min="0"
            step="0.01"
            value={currentRentalCost}
            onChange={(e) => setCurrentRentalCost(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </label>

        <label className="text-sm text-gray-700">
          Projected Rental Cost
          <input
            type="number"
            min="0"
            step="0.01"
            value={projectedRentalCost}
            onChange={(e) => setProjectedRentalCost(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </label>

        <label className="text-sm text-gray-700">
          Buffer Percentage (%)
          <input
            type="number"
            min="0"
            step="0.01"
            value={bufferPercentage}
            onChange={(e) => setBufferPercentage(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </label>
      </div>

      <div className="text-xs text-gray-500">
        Formula: projected rent * (room weighting / total weighting) * (1 + buffer percentage)
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Bedroom</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500">Current Rent</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500">Weighting</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500">Calculation</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500">Final Rent (Manual)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No active rooms found for this house.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-gray-900">{row.label}</td>
                  <td className="px-4 py-3 text-right text-gray-700">${row.currentRent.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.weighting}
                      onChange={(e) => updateWeighting(row.id, e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    ${(calculatedByRow[row.id] || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.manualFinalRent}
                      onChange={(e) => updateManualFinalRent(row.id, e.target.value)}
                      placeholder={(calculatedByRow[row.id] || 0).toFixed(2)}
                      className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-100">
            <tr>
              <td className="px-4 py-2.5 font-semibold text-gray-700">Total</td>
              <td className="px-4 py-2.5 text-right text-gray-700">${Number(currentRentalCost || 0).toFixed(2)}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{totalWeighting.toFixed(2)}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-900">${totalCalculated.toFixed(2)}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-900">${totalFinal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
