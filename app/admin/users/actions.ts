'use server';

import { createClient } from '@/lib/supabase-server';
import { UserRole } from '@/lib/types';

interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

export async function createUser(data: CreateUserData) {
  try {
    // Create Supabase server client
    const supabase = await createClient();

    // Get the service role key for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      return { error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables.' };
    }

    // Create Supabase admin client with service role
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm the email
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return { error: authError.message || 'Failed to create user account' };
    }

    if (!authData.user) {
      return { error: 'User creation failed - no user data returned' };
    }

    // Create the profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: data.email,
        name: data.name,
        role: data.role,
      }]);

    if (profileError) {
      console.error('Error creating profile:', profileError);
      
      // Try to clean up the auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return { error: profileError.message || 'Failed to create user profile' };
    }

    return { success: true, userId: authData.user.id };
  } catch (error) {
    console.error('Unexpected error creating user:', error);
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred' };
  }
}
