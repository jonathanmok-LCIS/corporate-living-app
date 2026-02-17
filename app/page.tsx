import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Corporate Living App</h1>
        <p className="text-xl text-gray-600 mb-8">
          Manage corporate housing, tenancies, and move-in/out processes with ease
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/auth/login"
            className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
          >
            Sign Up
          </Link>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Property Management</h3>
            <p className="text-gray-600 text-sm">Manage houses, rooms, and availability</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Inspections</h3>
            <p className="text-gray-600 text-sm">Digital checklists with photo upload</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Digital Signatures</h3>
            <p className="text-gray-600 text-sm">Mobile-friendly signature capture</p>
          </div>
        </div>
      </div>
    </div>
  )
}

