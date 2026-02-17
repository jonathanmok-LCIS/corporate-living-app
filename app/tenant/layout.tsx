import Link from 'next/link';

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold">
                Corporate Living
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link href="/tenant" className="hover:bg-blue-700 px-3 py-2 rounded">
                  Dashboard
                </Link>
                <Link href="/tenant/move-out" className="hover:bg-blue-700 px-3 py-2 rounded">
                  Move Out
                </Link>
                <Link href="/tenant/move-in" className="hover:bg-blue-700 px-3 py-2 rounded">
                  Move In
                </Link>
              </div>
            </div>
            <div className="text-sm">
              <span className="bg-blue-800 px-3 py-1 rounded">Tenant</span>
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
