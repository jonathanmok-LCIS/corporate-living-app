import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-purple-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/admin" className="text-xl font-bold hover:text-purple-100">
                Corporate Living
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link href="/admin" className="hover:bg-purple-700 px-3 py-2 rounded">
                  Dashboard
                </Link>
                <Link href="/admin/houses" className="hover:bg-purple-700 px-3 py-2 rounded">
                  Houses
                </Link>
                <Link href="/admin/tenancies" className="hover:bg-purple-700 px-3 py-2 rounded">
                  Tenancies
                </Link>
                <Link href="/admin/users" className="hover:bg-purple-700 px-3 py-2 rounded">
                  Users
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-purple-800 px-3 py-1 rounded text-sm">Admin</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
