'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchTenantTenancyHistory } from '../../actions';

type HistoryItem = {
  id: string;
  start_date: string;
  end_date?: string | null;
  status: string;
  slot?: string | null;
  rental_price?: number | null;
  created_at: string;
  room?: {
    label?: string;
    house?: { name?: string };
  };
};

export default function TenantHistoryPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [tenantName, setTenantName] = useState('Tenant');
  const [tenantEmail, setTenantEmail] = useState('');
  const [rows, setRows] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await fetchTenantTenancyHistory(tenantId);
      if (result.error) {
        setError(result.error);
      } else {
        setTenantName(result.tenant?.name || 'Tenant');
        setTenantEmail(result.tenant?.email || '');
        setRows((result.data || []) as HistoryItem[]);
      }
      setLoading(false);
    }

    load();
  }, [tenantId]);

  if (loading) {
    return <div className="text-center py-8">Loading tenant history...</div>;
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/tenancies" className="text-purple-600 hover:text-purple-800 text-sm">
        ← Back to Tenancies
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenant History</h1>
        <p className="text-sm text-gray-500 mt-1">{tenantName}{tenantEmail ? ` (${tenantEmail})` : ''}</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Created</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">House</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Room</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Slot</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Start Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">End Date</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Weekly Rent</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No tenancy history found for this tenant.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-gray-700">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.room?.house?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.room?.label || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.slot || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{new Date(row.start_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.end_date ? new Date(row.end_date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{row.rental_price != null ? `$${Number(row.rental_price).toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.status.replace(/_/g, ' ')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
