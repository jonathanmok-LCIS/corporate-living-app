'use server';

import { UserRole } from '@/lib/types';

interface CreateUserData {
  email: string;
  name: string;
  password: string;
  roles: UserRole[];
}

interface UpdateUserData {
  id: string;
  name: string;
  roles: UserRole[];
}

function getAdminClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('Service role key not configured');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function createUser(data: CreateUserData) {
  try {
    // Get the service role key for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      return { error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables.' };
    }

    // Validate roles
    if (!data.roles || data.roles.length === 0) {
      return { error: 'At least one role is required' };
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

    // Create the profile record using admin client to bypass RLS
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: data.email,
        name: data.name,
        roles: data.roles,
        force_password_reset: true,
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

export async function updateUser(data: UpdateUserData) {
  try {
    const supabaseAdmin = getAdminClient();

    // Validate roles
    if (!data.roles || data.roles.length === 0) {
      return { error: 'At least one role is required' };
    }

    // Update the profile record
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        name: data.name,
        roles: data.roles,
      })
      .eq('id', data.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return { error: profileError.message || 'Failed to update user profile' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating user:', error);
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred' };
  }
}

export async function resetUserPassword(userId: string, email: string) {
  try {
    const supabaseAdmin = getAdminClient();

    // Generate a new temporary password
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

    // Update the user's password via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('Error resetting password:', updateError);
      return { error: updateError.message || 'Failed to reset password' };
    }

    // Set force_password_reset flag so user must change on next login
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ force_password_reset: true })
      .eq('id', userId);

    if (profileError) {
      console.error('Error setting force_password_reset:', profileError);
      // Non-fatal — password was already reset
    }

    return { success: true, tempPassword };
  } catch (error) {
    console.error('Unexpected error resetting password:', error);
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred' };
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabaseAdmin = getAdminClient();

    // Delete the profile first (this should cascade or be handled by RLS)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return { error: profileError.message || 'Failed to delete user profile' };
    }

    // Delete the auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      return { error: authError.message || 'Failed to delete user account' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting user:', error);
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred' };
  }
}

export async function fetchUserHistory(userId: string) {
  try {
    const supabaseAdmin = getAdminClient();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, roles, created_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      return { profile: null, tenancies: null, coordinatorHouses: null, error: profileError.message };
    }

    const { data: tenancies, error: tenanciesError } = await supabaseAdmin
      .from('tenancies')
      .select(`
        id,
        start_date,
        end_date,
        status,
        slot,
        rental_price,
        created_at,
        room:rooms(label, house:houses(name))
      `)
      .eq('tenant_user_id', userId)
      .order('start_date', { ascending: false });

    if (tenanciesError) {
      return { profile, tenancies: null, coordinatorHouses: null, error: tenanciesError.message };
    }

    const { data: coordinatorHouses, error: coordinatorError } = await supabaseAdmin
      .from('house_coordinators')
      .select('house:houses(name), created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (coordinatorError) {
      return { profile, tenancies, coordinatorHouses: null, error: coordinatorError.message };
    }

    return { profile, tenancies: tenancies || [], coordinatorHouses: coordinatorHouses || [], error: null };
  } catch (error) {
    return {
      profile: null,
      tenancies: null,
      coordinatorHouses: null,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
