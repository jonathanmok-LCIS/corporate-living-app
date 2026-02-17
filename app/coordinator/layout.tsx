import Link from 'next/link';

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-green-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold">
                Corporate Living
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link href="/coordinator" className="hover:bg-green-700 px-3 py-2 rounded">
                  Dashboard
                </Link>
                <Link href="/coordinator/inspections" className="hover:bg-green-700 px-3 py-2 rounded">
                  Inspections
                </Link>
              </div>
            </div>
            <div className="text-sm">
              <span className="bg-green-800 px-3 py-1 rounded">Coordinator</span>
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
