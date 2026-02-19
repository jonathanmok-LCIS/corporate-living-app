import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/houses"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-purple-600 mb-2">Houses & Rooms</h2>
          <p className="text-gray-600">Manage houses, rooms, and assign coordinators</p>
        </Link>

        <Link
          href="/admin/tenancies"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-purple-600 mb-2">Tenancies</h2>
          <p className="text-gray-600">Create and manage tenant assignments</p>
        </Link>

        <Link
          href="/admin/users"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-purple-600 mb-2">Users</h2>
          <p className="text-gray-600">Create and manage user accounts</p>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-purple-600 mb-2">Pending Actions</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Move-out intentions</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending signatures</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Draft inspections</span>
              <span className="font-semibold">0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-500">No recent activity to display.</p>
      </div>
    </div>
  );
}
