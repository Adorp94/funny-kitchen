import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    // Create admin client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Send invitation with explicit redirect URL to our callback
    // Determine the correct app URL for the environment
    const appUrl = process.env.NODE_ENV === 'production' 
      ? 'https://funny-kitchen.vercel.app' 
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${appUrl}/auth/callback?type=invite`
      }
    );

    if (error) {
      console.error('Debug invite error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Debug invitation sent with explicit redirect URL',
      data,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    });

  } catch (error) {
    console.error('Debug invite error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}