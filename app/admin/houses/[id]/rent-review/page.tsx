'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { fetchRoomsWithTenancies } from '../rooms/actions';
import { fetchHouseFinancialHistory, saveHouseRentReview } from '../../actions';

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

type HistoryRow = {
  id: string;
  recorded_at: string;
  effective_date?: string | null;
  review_status?: 'DRAFT' | 'APPLIED';
  monthly_cost: number | null;
  current_rental_cost?: number | null;
  projected_rental_cost?: number | null;
  buffer_percentage?: number | null;
  total_weighting?: number | null;
  receivable_amount: number;
  room_rents: Record<string, number>;
  note?: string | null;
};

const ACTIVE_STATUSES = ['ACTIVE', 'MOVE_OUT_REQUESTED', 'MOVE_OUT_APPROVED', 'INSPECTION_PENDING'];

function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function todayDateInputValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function HouseRentReviewPage() {
  const params = useParams();
  const houseId = params.id as string;

  const [houseName, setHouseName] = useState('House');
  const [rows, setRows] = useState<CalculatorRow[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [currentRentalCost, setCurrentRentalCost] = useState('0');
  const [projectedRentalCost, setProjectedRentalCost] = useState('0');
  const [bufferPercentage, setBufferPercentage] = useState('0');
  const [effectiveDate, setEffectiveDate] = useState(todayDateInputValue());
  const [note, setNote] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory(targetHouseId: string) {
    const historyResult = await fetchHouseFinancialHistory(targetHouseId);
    if (historyResult.error) {
      setError(historyResult.error);
      return;
    }

    setHouseName(historyResult.house?.name || 'House');
    setHistoryRows((historyResult.data || []) as HistoryRow[]);
  }

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

        const roomsResult = await fetchRoomsWithTenancies(houseId);
        if (roomsResult.error) {
          setError(roomsResult.error);
          setLoading(false);
          return;
        }

        const activeRooms = ((roomsResult.data || []) as RoomLite[]).filter((room) => room.active);

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

        await loadHistory(houseId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rent review data');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [houseId]);

  const projected = Number(projectedRentalCost || 0);
  const current = Number(currentRentalCost || 0);
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

  const finalByRow = useMemo(() => {
    return rows.reduce<Record<string, number>>((acc, row) => {
      const manual = row.manualFinalRent.trim();
      if (!manual) {
        acc[row.id] = calculatedByRow[row.id] || 0;
      } else {
        const parsed = Number(manual);
        acc[row.id] = Number.isFinite(parsed) ? toMoney(parsed) : calculatedByRow[row.id] || 0;
      }
      return acc;
    }, {});
  }, [rows, calculatedByRow]);

  const totalCalculated = toMoney(Object.values(calculatedByRow).reduce((sum, value) => sum + value, 0));
  const totalFinal = toMoney(Object.values(finalByRow).reduce((sum, value) => sum + value, 0));

  const roomColumns = useMemo(() => {
    const labels = new Set<string>();
    historyRows.forEach((row) => {
      Object.keys(row.room_rents || {}).forEach((label) => labels.add(label));
    });
    rows.forEach((row) => labels.add(row.label));
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [historyRows, rows]);

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

  async function handleSave(status: 'DRAFT' | 'APPLIED') {
    const payloadRows = rows.map((row) => ({
      roomId: row.id,
      roomLabel: row.label,
      weighting: row.weighting,
      calculatedRent: calculatedByRow[row.id] || 0,
      finalRent: finalByRow[row.id] || 0,
    }));

    if (status === 'DRAFT') setSavingDraft(true);
    if (status === 'APPLIED') setApplying(true);

    const result = await saveHouseRentReview({
      houseId,
      effectiveDate,
      currentRentalCost: Number.isFinite(current) ? current : 0,
      projectedRentalCost: Number.isFinite(projected) ? projected : 0,
      bufferPercentage: Number.isFinite(buffer) ? buffer : 0,
      totalWeighting,
      rows: payloadRows,
      note: note || null,
      status,
    });

    if (status === 'DRAFT') setSavingDraft(false);
    if (status === 'APPLIED') setApplying(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    setNote('');
    await loadHistory(houseId);
    alert(status === 'DRAFT' ? 'Draft saved' : 'Applied and recorded in rent review history');
  }

  if (loading) {
    return <div className="text-center py-8">Loading rent review...</div>;
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
    <div className="space-y-5">
      <Link href={`/admin/houses/${houseId}`} className="text-purple-600 hover:text-purple-800 text-sm">
        ← Back to House
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rent Review</h1>
        <p className="text-sm text-gray-500 mt-1">{houseName}</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm text-gray-700">
          Current Rental Cost
          <input type="number" min="0" step="0.01" value={currentRentalCost} onChange={(e) => setCurrentRentalCost(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </label>
        <label className="text-sm text-gray-700">
          Projected Rental Cost
          <input type="number" min="0" step="0.01" value={projectedRentalCost} onChange={(e) => setProjectedRentalCost(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </label>
        <label className="text-sm text-gray-700">
          Buffer Percentage (%)
          <input type="number" min="0" step="0.01" value={bufferPercentage} onChange={(e) => setBufferPercentage(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </label>
        <label className="text-sm text-gray-700">
          Effective Date (Record Only)
          <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </label>
      </div>

      <div className="text-xs text-gray-500">
        Formula: projected rent * (room weighting / total weighting) * (1 + buffer percentage / 100)
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
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No active rooms found for this house.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-gray-900">{row.label}</td>
                  <td className="px-4 py-3 text-right text-gray-700">${row.currentRent.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <input type="number" min="0" step="0.1" value={row.weighting} onChange={(e) => updateWeighting(row.id, e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-right" />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">${(calculatedByRow[row.id] || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <input type="number" min="0" step="0.01" value={row.manualFinalRent} onChange={(e) => updateManualFinalRent(row.id, e.target.value)} placeholder={(calculatedByRow[row.id] || 0).toFixed(2)} className="w-32 px-2 py-1 border border-gray-300 rounded text-right" />
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

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 space-y-3">
        <label className="block text-sm text-gray-700">
          Review Note (Optional)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Add context for this review" />
        </label>
        <div className="flex gap-2 justify-end">
          <button onClick={() => handleSave('DRAFT')} disabled={savingDraft || applying} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50">
            {savingDraft ? 'Saving Draft...' : 'Save as Draft'}
          </button>
          <button onClick={() => handleSave('APPLIED')} disabled={savingDraft || applying} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50">
            {applying ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Rent Review History</h2>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Recorded</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Effective Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Cost</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Current Rent</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Projected Rent</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Buffer %</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Receivable</th>
                {roomColumns.map((label) => (
                  <th key={label} className="text-right px-4 py-2.5 font-medium text-gray-500">{label}</th>
                ))}
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historyRows.length === 0 ? (
                <tr>
                  <td colSpan={10 + roomColumns.length} className="px-4 py-8 text-center text-gray-500">No rent review records yet.</td>
                </tr>
              ) : (
                historyRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-gray-700">{new Date(row.recorded_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.effective_date ? new Date(row.effective_date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.review_status || 'APPLIED'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.monthly_cost != null ? `$${Number(row.monthly_cost).toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.current_rental_cost != null ? `$${Number(row.current_rental_cost).toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.projected_rental_cost != null ? `$${Number(row.projected_rental_cost).toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.buffer_percentage != null ? `${Number(row.buffer_percentage).toFixed(2)}%` : '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">${Number(row.receivable_amount || 0).toFixed(2)}</td>
                    {roomColumns.map((label) => (
                      <td key={`${row.id}-${label}`} className="px-4 py-3 text-right text-gray-700">{row.room_rents?.[label] != null ? `$${Number(row.room_rents[label]).toFixed(2)}` : '-'}</td>
                    ))}
                    <td className="px-4 py-3 text-gray-500">{row.note || '-'}</td>
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
