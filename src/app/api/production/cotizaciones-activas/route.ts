import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface CotizacionActiva {
  cotizacion_id: number;
  folio: string;
  cliente: string;
  estado: string;
  fecha_creacion: string;
  estimated_delivery_date?: string;
  days_until_delivery?: number;
  productos_count: number;
  productos_en_produccion: number;
}

export async function GET(request: NextRequest) {
  console.log("[API /production/cotizaciones-activas GET] === STARTING REQUEST ===");
  
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
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    // Get all cotizaciones that have products in production_active
    const { data: cotizacionesActivas, error: cotizacionesError } = await supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        estado,
        fecha_creacion,
        estimated_delivery_date,
        cliente_id,
        clientes (
          nombre
        ),
        cotizacion_productos!cotizacion_productos_cotizacion_id_fkey (
          producto_id,
          cantidad,
          productos (
            nombre,
            moldes_disponibles,
            vueltas_max_dia
          )
        )
      `)
      .in('estado', ['producción', 'pagada']) // Only include cotizaciones in production stages
      .order('estimated_delivery_date', { ascending: true })
      .order('folio', { ascending: true });

    if (cotizacionesError) {
      console.error("[API /production/cotizaciones-activas GET] Error fetching cotizaciones:", cotizacionesError);
      return NextResponse.json({ 
        error: 'Error al obtener cotizaciones activas',
        details: cotizacionesError.message 
      }, { status: 500 });
    }

    if (!cotizacionesActivas || cotizacionesActivas.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        message: "No se encontraron cotizaciones activas en producción"
      });
    }

    // Get production queue data - use a simpler approach first
    const { data: productionQueueData, error: queueError } = await supabase
      .from('production_queue')
      .select('cotizacion_producto_id, producto_id, status')
      .in('status', ['queued', 'in_progress']);

    if (queueError) {
      console.error("[API /production/cotizaciones-activas GET] Error fetching queue data:", queueError);
      return NextResponse.json({ 
        error: 'Error al obtener datos de cola de producción',
        details: queueError.message 
      }, { status: 500 });
    }

    // Get cotizacion_productos mapping to connect queue items to cotizaciones
    const queueItemIds = productionQueueData?.map(pq => pq.cotizacion_producto_id) || [];
    const { data: cotizacionProductosMapping, error: mappingError } = await supabase
      .from('cotizacion_productos')
      .select('cotizacion_producto_id, cotizacion_id, producto_id')
      .in('cotizacion_producto_id', queueItemIds);

    if (mappingError) {
      console.error("[API /production/cotizaciones-activas GET] Error fetching mapping data:", mappingError);
      return NextResponse.json({ 
        error: 'Error al obtener mapeo de productos',
        details: mappingError.message 
      }, { status: 500 });
    }

    // Process and filter cotizaciones that actually have products in production
    const processedCotizaciones: CotizacionActiva[] = [];

    for (const cotizacion of cotizacionesActivas) {
      const clienteNombre = (cotizacion.clientes as any)?.nombre || 'Cliente no encontrado';
      
      // Calculate days until delivery
      let daysUntilDelivery = 0;
      if (cotizacion.estimated_delivery_date) {
        const deliveryDate = new Date(cotizacion.estimated_delivery_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        deliveryDate.setHours(0, 0, 0, 0);
        daysUntilDelivery = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Count products and products in production (using production queue mapping)
      const cotizacionProductos = (cotizacion.cotizacion_productos as any[]) || [];
      const productosCount = cotizacionProductos.length;
      
      let productosEnProduccion = 0;
      for (const cp of cotizacionProductos) {
        // Check if this specific cotizacion+product combination is in production queue
        const isInQueue = cotizacionProductosMapping?.some(mapping => 
          mapping.cotizacion_id === cotizacion.cotizacion_id && 
          mapping.producto_id === cp.producto_id &&
          productionQueueData?.some(pq => pq.cotizacion_producto_id === mapping.cotizacion_producto_id)
        ) || false;
        
        if (isInQueue) {
          productosEnProduccion++;
        }
      }

      // Only include cotizaciones that have at least one product in production
      if (productosEnProduccion > 0) {
        processedCotizaciones.push({
          cotizacion_id: cotizacion.cotizacion_id,
          folio: cotizacion.folio,
          cliente: clienteNombre,
          estado: cotizacion.estado,
          fecha_creacion: cotizacion.fecha_creacion,
          estimated_delivery_date: cotizacion.estimated_delivery_date,
          days_until_delivery: daysUntilDelivery,
          productos_count: productosCount,
          productos_en_produccion: productosEnProduccion
        });
      }
    }

    // Sort by priority (delivery date, then folio)
    processedCotizaciones.sort((a, b) => {
      if (a.days_until_delivery !== b.days_until_delivery) {
        return a.days_until_delivery - b.days_until_delivery;
      }
      return a.folio.localeCompare(b.folio);
    });

    console.log("[API /production/cotizaciones-activas GET] Returning:", processedCotizaciones.length, "active cotizaciones");

    return NextResponse.json({
      data: processedCotizaciones,
      total: processedCotizaciones.length,
    });

  } catch (error) {
    console.error('[API /production/cotizaciones-activas GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}