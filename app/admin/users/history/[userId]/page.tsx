'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchUserHistory } from '../../actions';

type TenancyRow = {
  id: string;
  start_date: string;
  end_date?: string | null;
  status: string;
  slot?: string | null;
  rental_price?: number | null;
  created_at: string;
  room?: {
    label?: string;
    house?: {
      name?: string;
    };
  };
};

type CoordinatorRow = {
  house?: {
    name?: string;
  };
  created_at: string;
};

function fullLegalName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  const legal = `${firstName || ''} ${lastName || ''}`.trim();
  return legal || fallback || 'User';
}

export default function UserHistoryPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [name, setName] = useState('User');
  const [preferredName, setPreferredName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [isArchived, setIsArchived] = useState(false);
  const [tenancies, setTenancies] = useState<TenancyRow[]>([]);
  const [coordinatorHouses, setCoordinatorHouses] = useState<CoordinatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await fetchUserHistory(userId);
      if (result.error) {
        setError(result.error);
      } else {
        setName(fullLegalName(result.profile?.first_name, result.profile?.last_name, result.profile?.name));
        setPreferredName(result.profile?.preferred_name || '');
        setEmail(result.profile?.email || '');
        setRoles(result.profile?.roles || []);
        setIsArchived(Boolean(result.profile?.is_archived));
        setTenancies((result.tenancies || []) as TenancyRow[]);
        setCoordinatorHouses((result.coordinatorHouses || []) as CoordinatorRow[]);
      }
      setLoading(false);
    }

    load();
  }, [userId]);

  if (loading) {
    return <div className="text-center py-8">Loading user history...</div>;
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="text-purple-600 hover:text-purple-800 text-sm">
        ← Back to Users
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">User History</h1>
        <p className="text-sm text-gray-500 mt-1">
          {name}
          {preferredName ? ` (Preferred: ${preferredName})` : ''}
          {email ? ` (${email})` : ''}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      )}

      {!error && (
        <>
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Roles and Status</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              {roles.length === 0 ? (
                <span className="text-sm text-gray-500">No roles</span>
              ) : (
                roles.map((role) => (
                  <span key={role} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                    {role}
                  </span>
                ))
              )}
            </div>
            <span className={`inline-flex px-2 py-1 text-xs rounded-full font-semibold ${
              isArchived ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
            }`}>
              {isArchived ? 'Archived' : 'Active'}
            </span>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Tenancy History</h2>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Created</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">House</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Room</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Start</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">End</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Weekly Rent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenancies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No tenancy history</td>
                  </tr>
                ) : (
                  tenancies.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-gray-700">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-700">{row.room?.house?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{row.room?.label || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{row.status.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-gray-700">{new Date(row.start_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-700">{row.end_date ? new Date(row.end_date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{row.rental_price != null ? `$${Number(row.rental_price).toFixed(2)}` : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Coordinator Assignment History</h2>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Assigned Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">House</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coordinatorHouses.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">No coordinator assignments</td>
                  </tr>
                ) : (
                  coordinatorHouses.map((row, idx) => (
                    <tr key={`${row.created_at}-${idx}`}>
                      <td className="px-4 py-3 text-gray-700">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-700">{row.house?.name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
