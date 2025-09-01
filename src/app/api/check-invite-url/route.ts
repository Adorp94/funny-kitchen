import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { email } = await request.json();

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

    // Send invitation with explicit redirect to our callback
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `http://localhost:3000/auth/callback`
      }
    );

    if (error) {
      console.error('Invite error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent with explicit callback redirect',
      callbackUrl: 'http://localhost:3000/auth/callback',
      note: 'Check your email and click the link. The server logs should now show callback activity.'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}