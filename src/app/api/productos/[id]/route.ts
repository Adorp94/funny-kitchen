import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const id = context.params.id;
    
    // Get a specific product
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('producto_id', id)
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching producto:', error);
    return NextResponse.json(
      { error: 'Failed to fetch producto' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const productoId = context.params.id;
    const body = await request.json();
    
    if (!productoId) {
      return NextResponse.json(
        { error: 'Producto ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Updating product with ID: ${productoId}`, body);
    
    const { data, error } = await supabase
      .from('productos')
      .update({
        nombre: body.nombre,
        tipo_ceramica: body.tipo_ceramica,
        precio: body.precio,
        sku: body.sku,
        capacidad: body.capacidad,
        unidad: body.unidad,
        tipo_producto: body.tipo_producto,
        descripcion: body.descripcion,
        colores: body.colores,
        tiempo_produccion: body.tiempo_produccion,
        cantidad_inventario: body.cantidad_inventario,
        inventario: body.inventario
      })
      .eq('producto_id', productoId)
      .select()
      .single();
      
    if (error) throw error;
    
    console.log('Product updated successfully:', data);
    
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