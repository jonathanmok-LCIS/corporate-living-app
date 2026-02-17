import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Corporate Living App
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Manage move-in and move-out processes for corporate living houses
        </p>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">Getting Started</h2>
            <p className="text-blue-800 mb-4">
              To use this application, you need to configure your Supabase credentials.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
              <li>Copy <code className="bg-blue-100 px-1 rounded">.env.example</code> to <code className="bg-blue-100 px-1 rounded">.env.local</code></li>
              <li>Add your Supabase URL and keys to <code className="bg-blue-100 px-1 rounded">.env.local</code></li>
              <li>Run the migrations in the <code className="bg-blue-100 px-1 rounded">supabase/migrations/</code> folder</li>
            </ol>
          </div>

          <div className="flex justify-center mb-8">
            <Link
              href="/login"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center font-semibold text-lg"
            >
              Sign In to Get Started
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Link
              href="/admin"
              className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors text-center"
            >
              <h3 className="text-xl font-semibold mb-2">Admin Portal</h3>
              <p className="text-sm opacity-90">Manage houses, rooms, and tenancies</p>
            </Link>

            <Link
              href="/coordinator"
              className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition-colors text-center"
            >
              <h3 className="text-xl font-semibold mb-2">Coordinator Portal</h3>
              <p className="text-sm opacity-90">Manage inspections and photos</p>
            </Link>

            <Link
              href="/tenant"
              className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              <h3 className="text-xl font-semibold mb-2">Tenant Portal</h3>
              <p className="text-sm opacity-90">Submit move-out and sign move-in</p>
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Features</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Tenants submit move-out intentions</li>
            <li>Coordinators complete inspections with checklists and photos</li>
            <li>New tenants view condition reports and sign digitally</li>
            <li>Email notifications for key events</li>
            <li>Role-based access control (Admin, Coordinator, Tenant)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
