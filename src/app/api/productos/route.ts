import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  
  try {
    if (id) {
      // Get a specific product
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('producto_id', id)
        .single();
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else {
      // Get all products
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre');
        
      if (error) throw error;
      
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error fetching productos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch productos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  try {
    const { data, error } = await supabase
      .from('productos')
      .insert({
        nombre: body.nombre,
        capacidad: body.capacidad,
        unidad: body.unidad,
        tipo_ceramica: body.tipo_ceramica || 'CERÁMICA DE ALTA TEMPERATURA',
        tipo_producto: body.tipo_producto || 'Personalizado',
        descripcion: body.descripcion,
        colores: body.colores,
        precio: body.precio,
        cantidad_inventario: body.cantidad_inventario || 0
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      producto: data
    });
  } catch (error) {
    console.error('Error creating producto:', error);
    return NextResponse.json(
      { error: 'Failed to create producto' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  if (!body.producto_id) {
    return NextResponse.json(
      { error: 'Producto ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const { data, error } = await supabase
      .from('productos')
      .update({
        nombre: body.nombre,
        capacidad: body.capacidad,
        unidad: body.unidad,
        tipo_ceramica: body.tipo_ceramica,
        tipo_producto: body.tipo_producto,
        descripcion: body.descripcion,
        colores: body.colores,
        precio: body.precio,
        cantidad_inventario: body.cantidad_inventario
      })
      .eq('producto_id', body.producto_id)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      producto: data
    });
  } catch (error) {
    console.error('Error updating producto:', error);
    return NextResponse.json(
      { error: 'Failed to update producto' },
      { status: 500 }
    );
  }
}