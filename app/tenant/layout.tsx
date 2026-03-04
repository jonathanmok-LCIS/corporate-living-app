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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white shadow-md relative border-b border-blue-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-3 md:space-x-6">
              <Link href="/tenant" className="flex items-center space-x-2 text-lg font-semibold tracking-tight hover:text-blue-100 transition-colors">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
                </svg>
                <span>Corporate Living</span>
              </Link>
              <div className="hidden md:block w-px h-6 bg-blue-400/40" />
              <MobileNav links={NAV_LINKS} colorScheme="blue" />
            </div>
            <div className="flex items-center space-x-2 md:space-x-3">
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
