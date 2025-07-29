import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  console.log("[API /production/moldes-needed GET] === STARTING REQUEST ===");
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
        remove: (name: string, options: any) => cookieStore.set(name, '', { ...options, maxAge: 0 }),
      },
    }
  );

  try {
    // Get active moldes needed requests
    const { data, error } = await supabase
      .from('moldes_needed_active')
      .select('*')
      .order('days_pending', { ascending: false }); // Show most urgent first

    if (error) {
      console.error("[API] Error fetching moldes needed:", error);
      
      // Check if table doesn't exist
      if (error.message.includes('relation "moldes_needed_active" does not exist') || 
          error.message.includes('relation "moldes_needed" does not exist')) {
        console.warn('moldes_needed table does not exist. Please run migration 007_create_moldes_needed_table.sql');
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          message: 'Moldes needed table not yet created. Please run database migration.'
        });
      }
      
      return NextResponse.json({ 
        error: 'Error al obtener moldes necesarios',
        details: error.message 
      }, { status: 500 });
    }

    console.log("[API] Found moldes needed:", data?.length || 0);

    return NextResponse.json({
      success: true,
      data: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('[API /production/moldes-needed GET] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  console.log("[API /production/moldes-needed PATCH] === STARTING REQUEST ===");
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
        remove: (name: string, options: any) => cookieStore.set(name, '', { ...options, maxAge: 0 }),
      },
    }
  );

  try {
    const body = await request.json();
    const { id, action, notes } = body;

    console.log("[API] Updating molde needed:", { id, action, notes });

    if (!id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: id, action' },
        { status: 400 }
      );
    }

    let updateData: any = {
      notes: notes || null
    };

    if (action === 'resolved') {
      updateData.status = 'resolved';
      updateData.resolved_at = new Date().toISOString();
    } else if (action === 'cancelled') {
      updateData.status = 'cancelled';
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('moldes_needed')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("[API] Error updating molde needed:", error);
      return NextResponse.json({ 
        error: 'Error al actualizar molde necesario',
        details: error.message 
      }, { status: 500 });
    }

    console.log("[API] Successfully updated molde needed:", data);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[API /production/moldes-needed PATCH] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}