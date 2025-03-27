import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Get cotizacion ID from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Cotizacion ID is required. Use ?id=123 in the URL.' },
        { status: 400 }
      );
    }
    
    const cotizacionId = parseInt(id, 10);
    
    if (isNaN(cotizacionId)) {
      return NextResponse.json(
        { error: 'Invalid cotizacion ID. Must be a number.' },
        { status: 400 }
      );
    }
    
    // Fetch cotizacion data
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select(`
        *,
        clientes:cliente_id (*),
        vendedores:vendedor_id (*)
      `)
      .eq('cotizacion_id', cotizacionId)
      .single();
    
    if (cotizacionError) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch cotizacion data', 
          details: cotizacionError,
          query: `cotizaciones where cotizacion_id = ${cotizacionId}`
        },
        { status: 500 }
      );
    }
    
    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotizacion not found with the provided ID.' },
        { status: 404 }
      );
    }
    
    // Fetch products for this cotizacion
    const { data: productos, error: productosError } = await supabase
      .from('prodsxcotizacion')
      .select('*')
      .eq('cotizacion_id', cotizacionId);
    
    if (productosError) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch productos data', 
          details: productosError,
          query: `prodsxcotizacion where cotizacion_id = ${cotizacionId}`
        },
        { status: 500 }
      );
    }
    
    // Return all the data for debugging
    return NextResponse.json({
      cotizacion,
      productos,
      
      // Include what we would use for PDF generation
      pdf_info: {
        nombre_archivo: `cotizacion_${cotizacionId}.pdf`,
        num_cotizacion: cotizacionId,
        num_productos: productos?.length || 0,
        cliente: cotizacion.clientes?.nombre || 'Cliente',
        telefono_cliente: cotizacion.clientes?.celular || '',
        vendedor: cotizacion.vendedores?.nombre || 'Vendedor',
        telefono_vendedor: cotizacion.vendedores?.celular || '',
        correo_vendedor: cotizacion.vendedores?.correo || '',
        fecha_cotizacion: new Date().toLocaleDateString('es-MX'),
        valor_iva: cotizacion.iva === 1.16 ? '16%' : '0%',
        tiempo_entrega: `${cotizacion.tiempo_estimado || 7} días`,
        moneda: cotizacion.moneda === 'USD' ? 'Dólares' : 'Pesos',
        tipo_cuenta: cotizacion.tipo_cuenta || 'FISICA',
        iva_value: cotizacion.iva || 1,
        subtotal: cotizacion.precio_total / (cotizacion.iva || 1) || 0,
        descuento: (cotizacion.descuento_total || 0) * (cotizacion.precio_total || 0),
        iva: cotizacion.precio_total - (cotizacion.precio_total / (cotizacion.iva || 1)) || 0,
        envio: cotizacion.envio || 0,
        total: cotizacion.precio_total || 0
      },
      
      // Include database schema info
      table_schemas: {
        cotizaciones: Object.keys(cotizacion),
        cliente_fields: cotizacion.clientes ? Object.keys(cotizacion.clientes) : [],
        vendedor_fields: cotizacion.vendedores ? Object.keys(cotizacion.vendedores) : [],
        productos_fields: productos?.length ? Object.keys(productos[0]) : []
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 