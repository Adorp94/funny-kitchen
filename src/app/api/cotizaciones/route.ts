import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  
  try {
    if (id) {
      // Get a specific quote with its products and client
      const { data: cotizacion, error: cotizacionError } = await supabase
        .from('cotizaciones')
        .select('*, clientes(*), vendedores(*)')
        .eq('cotizacion_id', id)
        .single();
        
      if (cotizacionError) throw cotizacionError;
      
      const { data: productos, error: productosError } = await supabase
        .from('prodsxcotizacion')
        .select('*, productos(*)')
        .eq('cotizacion_id', id);
        
      if (productosError) throw productosError;
      
      return NextResponse.json({ cotizacion, productos });
    } else {
      // Get all quotes with basic info
      const { data: cotizaciones, error } = await supabase
        .from('cotizaciones')
        .select('*, clientes(nombre), vendedores(nombre, apellidos)')
        .order('fecha_cotizacion', { ascending: false });
        
      if (error) throw error;
      
      return NextResponse.json({ cotizaciones });
    }
  } catch (error) {
    console.error('Error fetching cotizaciones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cotizaciones' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  try {
    // First insert the client if it's a new client
    let clienteId = body.cliente_id;
    
    if (!clienteId && body.cliente) {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .insert(body.cliente)
        .select()
        .single();
        
      if (clienteError) throw clienteError;
      clienteId = clienteData.cliente_id;
    }
    
    // Then prepare the quote data
    const cotizacionInsertData = {
      cliente_id: clienteId,
      vendedor_id: body.vendedor_id,
      fecha_cotizacion: body.fecha_cotizacion,
      moneda: body.moneda,
      tipo_cambio: body.tipo_cambio,
      iva: body.iva,
      tipo_cuenta: body.tipo_cuenta,
      descuento_total: body.descuento_total,
      precio_total: body.precio_total,
      tiempo_estimado: body.tiempo_estimado,
      estatus: 'Pendiente', // Default status
      envio: body.envio || null,
      monto_broker: body.monto_broker || null,
      estatus_pago: 'No completo' // Default payment status
    };
    
    // Insert the quote
    const { data: cotizacionResult, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .insert(cotizacionInsertData)
      .select()
      .single();
      
    if (cotizacionError) throw cotizacionError;
    
    // Finally insert all products
    if (body.productos && body.productos.length > 0) {
      const productosData = body.productos.map((producto: any) => ({
        cotizacion_id: cotizacionResult.cotizacion_id,
        producto_id: producto.producto_id,
        colores: producto.colores,
        descuento: producto.descuento,
        cantidad: producto.cantidad,
        precio_final: producto.precio_final,
        acabado: producto.acabado,
        descripcion: producto.descripcion,
        cantidad_etiquetas: producto.cantidad_etiquetas,
        pu_etiqueta: producto.pu_etiqueta
      }));
      
      const { error: productosError } = await supabase
        .from('prodsxcotizacion')
        .insert(productosData);
        
      if (productosError) throw productosError;
    }
    
    return NextResponse.json({
      success: true,
      cotizacion_id: cotizacionResult.cotizacion_id
    });
  } catch (error) {
    console.error('Error creating cotización:', error);
    return NextResponse.json(
      { error: 'Failed to create cotización' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { error: 'Cotización ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // First delete related products
    const { error: productosError } = await supabase
      .from('prodsxcotizacion')
      .delete()
      .eq('cotizacion_id', id);
      
    if (productosError) throw productosError;
    
    // Then delete the quote
    const { error: cotizacionError } = await supabase
      .from('cotizaciones')
      .delete()
      .eq('cotizacion_id', id);
      
    if (cotizacionError) throw cotizacionError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cotización:', error);
    return NextResponse.json(
      { error: 'Failed to delete cotización' },
      { status: 500 }
    );
  }
}