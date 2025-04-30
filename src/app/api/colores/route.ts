import { type NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { data: colores, error } = await supabase
      .from('colores')
      .select('id, nombre, hex')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching colors:', error);
      return NextResponse.json({ error: error.message || 'Error fetching colors' }, { status: 500 });
    }

    return NextResponse.json(colores);

  } catch (err) {
    console.error('Unexpected error in GET /api/colores:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    
    if (!body.color) {
      return NextResponse.json(
        { error: 'Color name is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('colores')
      .insert({ color: body.color })
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      color: data
    });
  } catch (error) {
    console.error('Error creating color:', error);
    return NextResponse.json(
      { error: 'Failed to create color' },
      { status: 500 }
    );
  }
}