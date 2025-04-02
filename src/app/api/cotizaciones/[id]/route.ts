import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    
    const cotizacionId = params.id;
    
    // Get cotizacion details
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select(`
        *,
        cliente:cliente_id (
          nombre,
          celular,
          correo
        )
      `)
      .eq('cotizacion_id', cotizacionId)
      .single();
    
    if (cotizacionError) {
      console.error('Error fetching cotizacion:', cotizacionError);
      return NextResponse.json(
        { error: cotizacionError.message },
        { status: 500 }
      );
    }
    
    // Get products for this cotizacion
    const { data: productos, error: productosError } = await supabase
      .from('cotizacion_productos')
      .select(`
        cotizacion_producto_id,
        producto_id,
        cantidad,
        precio_unitario,
        descuento_producto,
        subtotal,
        productos:producto_id (
          nombre,
          tipo_producto
        )
      `)
      .eq('cotizacion_id', cotizacionId);
    
    if (productosError) {
      console.error('Error fetching products:', productosError);
      return NextResponse.json(
        { error: productosError.message },
        { status: 500 }
      );
    }
    
    // Format productos
    const formattedProductos = productos.map(item => ({
      id: item.cotizacion_producto_id.toString(),
      nombre: item.productos?.nombre || 'Producto sin nombre',
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      precio_total: item.subtotal,
      descuento: item.descuento_producto,
      tipo: item.productos?.tipo_producto
    }));
    
    // Get advance payments if any
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos_anticipos')
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .order('fecha_pago', { ascending: false });
    
    if (pagosError) {
      console.error('Error fetching payments:', pagosError);
      // Continue anyway, just log the error
    }
    
    const cotizacionData = {
      ...cotizacion,
      productos: formattedProductos,
      pagos: pagos || []
    };
    
    return NextResponse.json({ cotizacion: cotizacionData });
    
  } catch (error) {
    console.error('Error in cotizacion details API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
} 