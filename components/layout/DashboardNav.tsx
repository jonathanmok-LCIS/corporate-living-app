'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/auth/actions'

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'ADMIN' | 'COORDINATOR' | 'TENANT'
}

export default function DashboardNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', roles: ['ADMIN', 'COORDINATOR', 'TENANT'] },
    { name: 'Houses', href: '/dashboard/houses', roles: ['ADMIN', 'COORDINATOR'] },
    { name: 'Rooms', href: '/dashboard/rooms', roles: ['ADMIN', 'COORDINATOR'] },
    { name: 'Tenancies', href: '/dashboard/tenancies', roles: ['ADMIN', 'COORDINATOR', 'TENANT'] },
    { name: 'Move-Outs', href: '/dashboard/move-outs', roles: ['ADMIN', 'COORDINATOR', 'TENANT'] },
    { name: 'Inspections', href: '/dashboard/inspections', roles: ['ADMIN', 'COORDINATOR', 'TENANT'] },
  ]

  const userNavigation = [
    { name: 'Profile', href: '/dashboard/profile' },
  ]

  const filteredNavigation = navigation.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  )

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                Corporate Living
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {profile?.full_name || profile?.email}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {profile?.role}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
