import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with roles
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  const roles: string[] = profile?.roles || []

  // Redirect to the appropriate role-based portal
  if (roles.includes('ADMIN')) {
    redirect('/admin')
  } else if (roles.includes('COORDINATOR')) {
    redirect('/coordinator')
  } else if (roles.includes('TENANT')) {
    redirect('/tenant')
  }

  // Fallback
  redirect('/login')
}
