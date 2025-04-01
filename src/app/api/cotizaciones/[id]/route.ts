import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Destructure and access the id properly from params
    const { id } = context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Cotización ID es requerido' }, 
        { status: 400 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    
    // Get the cotizacion with its client
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select(`
        *,
        cliente:cliente_id(*)
      `)
      .eq('cotizacion_id', id)
      .single();
      
    if (cotizacionError) {
      console.error('Error fetching quotation:', cotizacionError);
      return NextResponse.json(
        { error: 'Error al obtener la cotización' }, 
        { status: 500 }
      );
    }
    
    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' }, 
        { status: 404 }
      );
    }
    
    // Get the quotation products
    const { data: productos, error: productosError } = await supabase
      .from('cotizacion_productos')
      .select(`
        *,
        producto:producto_id(*)
      `)
      .eq('cotizacion_id', id);
    
    if (productosError) {
      console.error('Error fetching quotation products:', productosError);
      return NextResponse.json(
        { error: 'Error al obtener los productos de la cotización' }, 
        { status: 500 }
      );
    }
    
    // Format the products to match the expected structure
    const formattedProductos = productos.map(item => ({
      id: item.producto.producto_id.toString(),
      nombre: item.producto.nombre,
      cantidad: item.cantidad,
      precio: item.precio_unitario,
      precio_mxn: item.precio_unitario_mxn || item.precio_unitario,
      descuento: item.descuento_producto,
      subtotal: item.subtotal,
      subtotal_mxn: item.subtotal_mxn || item.subtotal,
      sku: item.producto.sku,
      descripcion: item.producto.descripcion,
      colores: item.producto.colores?.split(',') || []
    }));
    
    // Include MXN values in the response
    const cotizacionWithMXN = {
      ...cotizacion,
      subtotal_mxn: cotizacion.subtotal_mxn || cotizacion.subtotal,
      costo_envio_mxn: cotizacion.costo_envio_mxn || cotizacion.costo_envio,
      total_mxn: cotizacion.total_mxn || cotizacion.total,
      productos: formattedProductos
    };
    
    // Return the formatted response
    return NextResponse.json({
      cotizacion: cotizacionWithMXN
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperado al obtener la cotización' },
      { status: 500 }
    );
  }
} 