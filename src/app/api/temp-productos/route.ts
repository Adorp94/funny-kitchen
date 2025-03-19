import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const cotizacionId = searchParams.get('cotizacion_id');
  
  if (!cotizacionId) {
    return NextResponse.json(
      { error: 'Cotización ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const { data, error } = await supabase
      .from('prodsxcot_temp')
      .select('*, producto:productos(nombre)')
      .eq('cotizacion_id', cotizacionId)
      .order('item');
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching temp products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch temp products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  if (!body.cotizacion_id) {
    return NextResponse.json(
      { error: 'Cotización ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Get the max item value for this quote
    const { data: maxItemData, error: maxItemError } = await supabase
      .from('prodsxcot_temp')
      .select('item')
      .eq('cotizacion_id', body.cotizacion_id)
      .order('item', { ascending: false })
      .limit(1)
      .single();
    
    const nextItem = maxItemData ? maxItemData.item + 1 : 1;
      
    const { data, error } = await supabase
      .from('prodsxcot_temp')
      .insert({
        cotizacion_id: body.cotizacion_id,
        item: nextItem,
        cantidad: body.cantidad,
        descuento: body.descuento || 0,
        precio_final: body.precio_final,
        producto_id: body.producto_id,
        nombre: body.nombre,
        capacidad: body.capacidad,
        unidad: body.unidad,
        colores: body.colores,
        acabado: body.acabado,
        descripcion: body.descripcion,
        cantidad_etiquetas: body.cantidad_etiquetas,
        pu_etiqueta: body.pu_etiqueta
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      producto: data
    });
  } catch (error) {
    console.error('Error creating temp product:', error);
    return NextResponse.json(
      { error: 'Failed to create temp product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const cotizacionId = searchParams.get('cotizacion_id');
  
  try {
    if (id) {
      // Delete a specific temp product
      const { error } = await supabase
        .from('prodsxcot_temp')
        .delete()
        .eq('prodsxc_id', id);
        
      if (error) throw error;
    } else if (cotizacionId) {
      // Delete all temp products for a quote
      const { error } = await supabase
        .from('prodsxcot_temp')
        .delete()
        .eq('cotizacion_id', cotizacionId);
        
      if (error) throw error;
    } else {
      return NextResponse.json(
        { error: 'ID or cotizacion_id is required' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting temp product:', error);
    return NextResponse.json(
      { error: 'Failed to delete temp product' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  if (!body.prodsxc_id) {
    return NextResponse.json(
      { error: 'Product ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const { data, error } = await supabase
      .from('prodsxcot_temp')
      .update({
        cantidad: body.cantidad,
        descuento: body.descuento,
        precio_final: body.precio_final,
        colores: body.colores,
        acabado: body.acabado,
        descripcion: body.descripcion,
        cantidad_etiquetas: body.cantidad_etiquetas,
        pu_etiqueta: body.pu_etiqueta
      })
      .eq('prodsxc_id', body.prodsxc_id)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      producto: data
    });
  } catch (error) {
    console.error('Error updating temp product:', error);
    return NextResponse.json(
      { error: 'Failed to update temp product' },
      { status: 500 }
    );
  }
}