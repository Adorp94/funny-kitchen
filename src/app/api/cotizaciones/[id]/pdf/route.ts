import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET handler for returning cotización data for PDF generation
 * URL: /api/cotizaciones/[id]/pdf
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Get cotización data
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select(`
        *,
        cliente:cliente_id (*)
      `)
      .eq('cotizacion_id', params.id)
      .single();

    if (cotizacionError || !cotizacion) {
      console.error('Error fetching cotización:', cotizacionError);
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    // Get productos for this cotizacion
    const { data: productosData, error: productosError } = await supabase
      .from('cotizacion_productos')
      .select(`
        *,
        producto:producto_id (*)
      `)
      .eq('cotizacion_id', params.id);

    if (productosError) {
      console.error('Error fetching productos:', productosError);
      return NextResponse.json(
        { error: 'Error al obtener los productos' },
        { status: 500 }
      );
    }

    // Format productos data
    const productos = productosData.map((item) => {
      const coloresArray = item.colores
        ? typeof item.colores === 'string'
          ? item.colores.split(',')
          : item.colores
        : [];

      return {
        id: item.cotizacion_producto_id.toString(),
        nombre: item.producto?.nombre || 'Producto personalizado',
        cantidad: item.cantidad,
        precio: item.precio_unitario,
        precio_mxn: item.precio_unitario_mxn,
        descuento: item.descuento_producto || 0,
        subtotal: item.subtotal,
        subtotal_mxn: item.subtotal_mxn,
        sku: item.producto?.sku || '',
        descripcion: item.descripcion || item.producto?.descripcion || '',
        colores: coloresArray,
        acabado: item.acabado || '',
      };
    });

    // Create formatted cotizacion object
    const cotizacionFormatted = {
      id: cotizacion.cotizacion_id.toString(),
      folio: cotizacion.folio,
      moneda: cotizacion.moneda,
      subtotal: cotizacion.subtotal,
      subtotal_mxn: cotizacion.subtotal_mxn,
      descuento_global: cotizacion.descuento_global,
      iva: cotizacion.iva,
      monto_iva: cotizacion.monto_iva,
      incluye_envio: cotizacion.incluye_envio,
      costo_envio: cotizacion.costo_envio,
      costo_envio_mxn: cotizacion.costo_envio_mxn,
      total: cotizacion.total,
      total_mxn: cotizacion.total_mxn,
      tipo_cambio: cotizacion.tipo_cambio,
      productos: productos,
      cliente: cotizacion.cliente,
    };

    // Instead of generating a PDF on the server, return the data
    // and let the client generate the PDF
    return NextResponse.json({ 
      cotizacion: cotizacionFormatted,
      success: true
    });
  } catch (error) {
    console.error('Error fetching data for PDF:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos para el PDF' },
      { status: 500 }
    );
  }
} 