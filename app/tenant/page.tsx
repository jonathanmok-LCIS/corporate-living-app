import Link from 'next/link';

export default function TenantDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Tenant Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/tenant/move-out"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-2">Submit Move-Out Intention</h2>
          <p className="text-gray-600">Notify coordinators about your planned move-out date</p>
        </Link>

        <Link
          href="/tenant/move-in"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-2">Move-In Acknowledgement</h2>
          <p className="text-gray-600">View room condition and sign move-in acknowledgement</p>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Current Tenancy</h2>
        <p className="text-gray-500">No active tenancy found.</p>
      </div>
    </div>
  );
}
