import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('vendedores')
      .select('*')
      .order('nombre');
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching vendedores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendedores' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  try {
    const { data, error } = await supabase
      .from('vendedores')
      .insert({
        nombre: body.nombre,
        apellidos: body.apellidos,
        correo: body.correo,
        telefono: body.telefono
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      vendedor: data
    });
  } catch (error) {
    console.error('Error creating vendedor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendedor' },
      { status: 500 }
    );
  }
}