'use client';

import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import RoleSwitcher from '@/components/RoleSwitcher';
import MobileNav from '@/components/MobileNav';

const NAV_LINKS = [
  { href: '/coordinator', label: 'Dashboard' },
  { href: '/coordinator/inspections', label: 'Inspections' },
  { href: '/coordinator/move-out-reviews', label: 'Reviews' },
];

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-green-700 via-green-600 to-green-700 text-white shadow-md relative border-b border-green-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-3 md:space-x-6">
              <Link href="/coordinator" className="flex items-center space-x-2 text-lg font-semibold tracking-tight hover:text-green-100 transition-colors">
                <span className="hidden sm:inline">🏢</span>
                <span>Corporate Living</span>
              </Link>
              <div className="hidden md:block w-px h-6 bg-green-400/40" />
              <MobileNav links={NAV_LINKS} colorScheme="green" />
            </div>
            <div className="flex items-center space-x-2 md:space-x-3">
              <RoleSwitcher currentRole="COORDINATOR" />
              <LogoutButton variant="coordinator" />
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
