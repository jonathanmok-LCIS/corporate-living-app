'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchHouseFinancialHistory } from '../../actions';

type HistoryRow = {
  id: string;
  recorded_at: string;
  monthly_cost: number | null;
  receivable_amount: number;
  room_rents: Record<string, number>;
  note?: string | null;
};

export default function HouseRentHistoryPage() {
  const params = useParams();
  const houseId = params.id as string;

  const [houseName, setHouseName] = useState('');
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await fetchHouseFinancialHistory(houseId);
      if (result.error) {
        setError(result.error);
      } else {
        setHouseName(result.house?.name || 'House');
        setRows((result.data || []) as HistoryRow[]);
      }
      setLoading(false);
    }

    load();
  }, [houseId]);

  const roomColumns = useMemo(() => {
    const labels = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row.room_rents || {}).forEach((label) => labels.add(label));
    });
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  if (loading) {
    return <div className="text-center py-8">Loading rent history...</div>;
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
        <h1 className="text-2xl font-bold text-gray-900">Rent History</h1>
        <p className="text-sm text-gray-500 mt-1">{houseName}</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Date</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500">Cost</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500">Receivable Amount</th>
              {roomColumns.map((label) => (
                <th key={label} className="text-right px-4 py-2.5 font-medium text-gray-500">{label}</th>
              ))}
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4 + roomColumns.length} className="px-4 py-8 text-center text-gray-500">
                  No history yet. Update room rent or house cost to create snapshots.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-gray-700">{new Date(row.recorded_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {row.monthly_cost != null ? `$${Number(row.monthly_cost).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ${Number(row.receivable_amount || 0).toFixed(2)}
                  </td>
                  {roomColumns.map((label) => (
                    <td key={`${row.id}-${label}`} className="px-4 py-3 text-right text-gray-700">
                      {row.room_rents?.[label] != null ? `$${Number(row.room_rents[label]).toFixed(2)}` : '-'}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-gray-500">{row.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
