import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get statistics based on role
  let stats = {
    houses: 0,
    rooms: 0,
    tenancies: 0,
    pendingMoveOuts: 0,
  }

  if (profile?.role === 'ADMIN' || profile?.role === 'COORDINATOR') {
    const [housesResult, roomsResult, tenanciesResult, moveOutsResult] = await Promise.all([
      supabase.from('houses').select('*', { count: 'exact', head: true }),
      supabase.from('rooms').select('*', { count: 'exact', head: true }),
      supabase.from('tenancies').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabase.from('move_out_intentions').select('*', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
    ])

    stats = {
      houses: housesResult.count || 0,
      rooms: roomsResult.count || 0,
      tenancies: tenanciesResult.count || 0,
      pendingMoveOuts: moveOutsResult.count || 0,
    }
  } else {
    // Tenant view - show their own tenancies
    const { count } = await supabase
      .from('tenancies')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.id)
      .eq('status', 'ACTIVE')

    stats.tenancies = count || 0
  }

  return (
    <div>
      <div className="px-4 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {profile?.full_name || 'User'}
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          Role: <span className="font-medium">{profile?.role}</span>
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {(profile?.role === 'ADMIN' || profile?.role === 'COORDINATOR') && (
          <>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Houses
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {stats.houses}
                    </dd>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <Link href="/dashboard/houses" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  View all
                </Link>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Rooms
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {stats.rooms}
                    </dd>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <Link href="/dashboard/rooms" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  View all
                </Link>
              </div>
            </div>
          </>
        )}

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Tenancies
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.tenancies}
                </dd>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link href="/dashboard/tenancies" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all
            </Link>
          </div>
        </div>

        {(profile?.role === 'ADMIN' || profile?.role === 'COORDINATOR') && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Move-Outs
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats.pendingMoveOuts}
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <Link href="/dashboard/move-outs" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                View all
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(profile?.role === 'ADMIN' || profile?.role === 'COORDINATOR') && (
            <>
              <Link
                href="/dashboard/houses"
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Manage Houses
              </Link>
              <Link
                href="/dashboard/tenancies"
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Manage Tenancies
              </Link>
              <Link
                href="/dashboard/inspections"
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Inspections
              </Link>
            </>
          )}
          {profile?.role === 'TENANT' && (
            <>
              <Link
                href="/dashboard/tenancies"
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                My Tenancies
              </Link>
              <Link
                href="/dashboard/move-outs"
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Request Move-Out
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
