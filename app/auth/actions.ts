'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/auth/login?error=Invalid credentials')
  }

  // Redirect to role-based home
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', data.user?.id ?? '')
    .single()

  const roles: string[] = profile?.roles ?? []

  if (roles.includes('ADMIN')) {
    redirect('/admin')
  } else if (roles.includes('COORDINATOR')) {
    redirect('/coordinator')
  } else if (roles.includes('TENANT')) {
    redirect('/tenant')
  }

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    redirect('/auth/signup?error=Could not create account')
  }

  if (authData.user) {
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        roles: ['TENANT'], // Default role
      })

    if (profileError) {
      redirect('/auth/signup?error=Could not create profile')
    }
  }

  redirect('/auth/login?message=Account created! Please sign in.')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
