'use client';

import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import RoleSwitcher from '@/components/RoleSwitcher';
import MobileNav from '@/components/MobileNav';

const NAV_LINKS = [
  { href: '/tenant', label: 'Dashboard' },
  { href: '/tenant/move-out', label: 'Move Out' },
  { href: '/tenant/move-in', label: 'Move In' },
];

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white shadow-lg relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 md:space-x-8">
              <Link href="/tenant" className="text-lg md:text-xl font-bold hover:text-blue-100">
                Corporate Living
              </Link>
              <MobileNav links={NAV_LINKS} colorScheme="blue" />
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <RoleSwitcher currentRole="TENANT" />
              <LogoutButton variant="tenant" />
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
