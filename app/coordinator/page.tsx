import Link from 'next/link';

export default function CoordinatorDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Coordinator Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-green-600 mb-2">Pending Intentions</h2>
          <p className="text-4xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500 mt-2">Move-out intentions to review</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-green-600 mb-2">Draft Inspections</h2>
          <p className="text-4xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500 mt-2">Inspections to complete</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-green-600 mb-2">Assigned Houses</h2>
          <p className="text-4xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500 mt-2">Houses under your coordination</p>
        </div>
      </div>

      <Link
        href="/coordinator/inspections"
        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 inline-block"
      >
        View All Inspections
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-500">No recent activity to display.</p>
      </div>
    </div>
  );
}
