'use client';

import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import RoleSwitcher from '@/components/RoleSwitcher';
import MobileNav from '@/components/MobileNav';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/houses', label: 'Houses' },
  { href: '/admin/tenancies', label: 'Tenancies' },
  { href: '/admin/users', label: 'Users' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-purple-700 via-purple-600 to-purple-700 text-white shadow-md relative border-b border-purple-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-3 md:space-x-6">
              <Link href="/admin" className="flex items-center space-x-2 text-lg font-semibold tracking-tight hover:text-purple-100 transition-colors">
                <span className="hidden sm:inline">🏢</span>
                <span>Corporate Living</span>
              </Link>
              <div className="hidden md:block w-px h-6 bg-purple-400/40" />
              <MobileNav links={NAV_LINKS} colorScheme="purple" />
            </div>
            <div className="flex items-center space-x-2 md:space-x-3">
              <RoleSwitcher currentRole="ADMIN" />
              <LogoutButton variant="admin" />
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-4 md:py-8">
        {children}
      </main>
    </div>
  );
}
