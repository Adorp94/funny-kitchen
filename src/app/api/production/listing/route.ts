import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Define the structure for production listing items
type ProductionListingItem = {
  cotizacion_id: number;
  cotizacion_folio: string;
  cliente_id: number;
  cliente_nombre: string;
  productos: {
    producto_id: number;
    producto_nombre: string;
    cantidad: number;
    production_status: string;
  }[];
  fecha_movido_produccion: string | null;
  total_cotizacion: number;
  anticipo_porcentaje: number;
  anticipo_monto: number;
  eta: string | null; // Will be blank for now
  estado: string;
  prioridad: boolean; // Add priority field
  created_at: string;
};

export async function GET(request: NextRequest) {
  console.log("[API /production/listing GET] === STARTING REQUEST ===");
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value;
        },
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.remove(name, options);
        },
      },
    }
  );

  try {
    console.log("[API /production/listing GET] Fetching cotizaciones in production...");

    // Get all cotizaciones in production status
    const { data: cotizacionesProduccion, error: cotizacionesError } = await supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        cliente_id,
        estado,
        total,
        prioridad,
        fecha_creacion
      `)
      .eq('estado', 'producción')
      .order('prioridad', { ascending: false }) // Priority first
      .order('fecha_creacion', { ascending: false }); // Then by creation date

    if (cotizacionesError) {
      console.error("[API /production/listing GET] Error fetching cotizaciones:", cotizacionesError);
      return NextResponse.json({ error: 'Error al obtener cotizaciones en producción' }, { status: 500 });
    }

    console.log("[API /production/listing GET] Found cotizaciones in production:", cotizacionesProduccion?.length || 0);

    if (!cotizacionesProduccion || cotizacionesProduccion.length === 0) {
      return NextResponse.json({
        items: [],
        debug: {
          message: "No cotizaciones found in production status"
        }
      });
    }

    // Process each cotización to get detailed information
    const productionListing: ProductionListingItem[] = [];

    for (const cotizacion of cotizacionesProduccion) {
      console.log(`[API /production/listing GET] Processing cotización ${cotizacion.folio}...`);

      // Get client information
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('nombre')
        .eq('cliente_id', cotizacion.cliente_id)
        .single();

      if (clienteError) {
        console.error(`[API /production/listing GET] Error fetching client for ${cotizacion.folio}:`, clienteError);
        continue;
      }

      // Get products for this cotización
      const { data: productos, error: productosError } = await supabase
        .from('cotizacion_productos')
        .select(`
          producto_id,
          cantidad,
          production_status,
          productos (
            nombre
          )
        `)
        .eq('cotizacion_id', cotizacion.cotizacion_id);

      if (productosError) {
        console.error(`[API /production/listing GET] Error fetching products for ${cotizacion.folio}:`, productosError);
        continue;
      }

      // Get payment information (anticipo) from pagos table
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos')
        .select('monto, porcentaje_aplicado, tipo_pago')
        .eq('cotizacion_id', cotizacion.cotizacion_id)
        .eq('tipo_pago', 'anticipo')
        .eq('estado', 'completado');

      // Calculate anticipo information
      let anticipoMonto = 0;
      let anticipoPorcentaje = 0;

      if (pagosData && pagosData.length > 0) {
        // Sum all anticipo payments
        anticipoMonto = pagosData.reduce((sum, pago) => sum + Number(pago.monto), 0);
        // Use the most recent percentage (assuming they're consistent)
        anticipoPorcentaje = Number(pagosData[0].porcentaje_aplicado) || 0;
      }

      if (pagosError) {
        console.warn(`[API /production/listing GET] Warning: Could not fetch payment info for ${cotizacion.folio}:`, pagosError);
        // Continue without payment info rather than failing
      }

      // Format products data
      const productosFormatted = productos?.map(p => ({
        producto_id: p.producto_id,
        producto_nombre: p.productos?.nombre || 'Producto desconocido',
        cantidad: p.cantidad,
        production_status: p.production_status || 'pending'
      })) || [];

      // For now, we'll use fecha_creacion as proxy for when it was moved to production
      // Later you can add a specific field to track this
      const fechaMovidoProduccion = cotizacion.fecha_creacion;

      productionListing.push({
        cotizacion_id: cotizacion.cotizacion_id,
        cotizacion_folio: cotizacion.folio,
        cliente_id: cotizacion.cliente_id,
        cliente_nombre: cliente.nombre,
        productos: productosFormatted,
        fecha_movido_produccion: fechaMovidoProduccion,
        total_cotizacion: cotizacion.total,
        anticipo_porcentaje: anticipoPorcentaje,
        anticipo_monto: anticipoMonto,
        eta: null, // Will be implemented later
        estado: cotizacion.estado,
        prioridad: cotizacion.prioridad || false, // Add priority to response
        created_at: cotizacion.fecha_creacion
      });

      console.log(`[API /production/listing GET] Processed ${cotizacion.folio} with ${productosFormatted.length} products, anticipo: ${anticipoPorcentaje}%`);
    }

    console.log("[API /production/listing GET] Returning production listing:", productionListing.length, "items");

    return NextResponse.json({
      items: productionListing,
      debug: {
        cotizacionesFound: cotizacionesProduccion.length,
        itemsProcessed: productionListing.length
      }
    });

  } catch (error) {
    console.error('[API /production/listing GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 