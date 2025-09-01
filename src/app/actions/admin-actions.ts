"use server";

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

interface CreateUserRequest {
  email: string;
  role: "admin" | "user";
  permissions: {
    dashboard: boolean;
    cotizaciones: boolean;
    produccion: boolean;
    finanzas: boolean;
    admin: boolean;
  };
}

export async function createUserWithInvite(userData: CreateUserRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user to verify they are authorized
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { 
        success: false, 
        error: 'No autorizado' 
      };
    }

    // Check if current user is admin or super_admin
    const { data: currentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !currentProfile || 
        !['admin', 'super_admin'].includes(currentProfile.role)) {
      return { 
        success: false, 
        error: 'Permisos insuficientes' 
      };
    }

    // Check if we have the service role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Missing environment variables for admin operations');
      return { 
        success: false, 
        error: 'Configuración del servidor incompleta. Contacte al administrador del sistema.' 
      };
    }

    // Create admin client with service role key
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create the user in Supabase Auth using Admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: userData.email,
      email_confirm: false, // User needs to confirm email
    });

    // Send invitation email manually with correct redirect URL
    if (!createError && newUser.user) {
      // Use production URL explicitly for invitation emails
      const appUrl = process.env.NODE_ENV === 'production' 
        ? 'https://funny-kitchen.vercel.app' 
        : 'http://localhost:3000';
        
      console.log(`Sending invitation to ${userData.email} with redirect: ${appUrl}/auth/callback?type=invite`);
        
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        userData.email,
        {
          // Use explicit production URL for invitations
          redirectTo: `${appUrl}/auth/callback?type=invite`,
          // Try to override any dashboard settings
          data: {
            redirectTo: `${appUrl}/auth/callback?type=invite`
          }
        }
      );
      if (inviteError) {
        console.error('Failed to send invitation email:', inviteError);
        // Don't fail the user creation, but log the issue
      }
    }

    if (createError) {
      console.error('User creation error:', createError);
      return { 
        success: false, 
        error: createError.message || 'Error al crear usuario en el sistema de autenticación' 
      };
    }

    if (!newUser.user) {
      return { 
        success: false, 
        error: 'Error: No se pudo crear el usuario' 
      };
    }

    // Create the user profile (using regular client is fine for this)
    const { error: profileInsertError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: newUser.user.id,
        email: userData.email,
        role: userData.role,
        permissions: userData.permissions,
        created_by: user.id
      }, {
        onConflict: 'user_id'  // Now we have a unique constraint on user_id
      });

    if (profileInsertError) {
      console.error('Profile creation error:', profileInsertError);
      // Try to clean up the auth user if profile creation failed
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return { 
        success: false, 
        error: 'Error al crear el perfil de usuario' 
      };
    }

    return { 
      success: true, 
      data: { 
        id: newUser.user.id, 
        email: newUser.user.email 
      } 
    };

  } catch (error) {
    console.error('Error creating user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido al crear usuario' 
    };
  }
}

export async function deleteUserAccount(profileId: string) {
  try {
    const supabase = await createClient();
    
    // Get the current user to verify they are authorized
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { 
        success: false, 
        error: 'No autorizado' 
      };
    }

    // Check if current user is admin or super_admin
    const { data: currentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !currentProfile || 
        !['admin', 'super_admin'].includes(currentProfile.role)) {
      return { 
        success: false, 
        error: 'Permisos insuficientes' 
      };
    }

    // Get the user profile to find the user_id
    const { data: targetProfile, error: targetError } = await supabase
      .from('user_profiles')
      .select('user_id, role')
      .eq('id', profileId)
      .single();

    if (targetError || !targetProfile) {
      return { 
        success: false, 
        error: 'Usuario no encontrado' 
      };
    }

    // Prevent deleting super_admin
    if (targetProfile.role === 'super_admin') {
      return { 
        success: false, 
        error: 'No se puede eliminar el Super Admin' 
      };
    }

    // Create admin client for deletion
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!serviceRoleKey || !supabaseUrl) {
      return { 
        success: false, 
        error: 'Configuración del servidor incompleta' 
      };
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Delete from auth.users (this will cascade to user_profiles via trigger)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      targetProfile.user_id
    );

    if (deleteError) {
      return { 
        success: false, 
        error: deleteError.message 
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Error deleting user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}