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
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-green-600 text-white shadow-lg relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 md:space-x-8">
              <Link href="/coordinator" className="text-lg md:text-xl font-bold hover:text-green-100">
                Corporate Living
              </Link>
              <MobileNav links={NAV_LINKS} colorScheme="green" />
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
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
