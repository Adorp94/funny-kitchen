import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  console.log("[API /production/client-demands GET] === STARTING REQUEST ===");
  
  const supabase = await createClient();

  try {
    const productId = parseInt(params.productId);
    
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'ID de producto inválido' }, { status: 400 });
    }

    console.log(`[API /production/client-demands GET] Fetching client demands for product ${productId}...`);

    // Get all cotizaciones in production status that have this product
    const { data: cotizacionesData, error: cotizacionesError } = await supabase
      .from('cotizacion_productos')
      .select(`
        cotizacion_id,
        cantidad,
        cotizaciones!inner (
          folio,
          cliente_id,
          estado,
          estatus_pago,
          prioridad,
          is_premium,
          fecha_pago_inicial,
          clientes!inner (
            nombre
          )
        )
      `)
      .eq('producto_id', productId)
      .eq('cotizaciones.estado', 'producción')
      .in('cotizaciones.estatus_pago', ['anticipo', 'pagado']);

    if (cotizacionesError) {
      console.error("[API /production/client-demands GET] Error fetching cotizaciones:", cotizacionesError);
      return NextResponse.json({ error: 'Error al obtener demandas de clientes' }, { status: 500 });
    }

    console.log("[API /production/client-demands GET] Found cotizaciones:", cotizacionesData?.length || 0);

    // Process and calculate remaining quantities needed
    const demands = [];

    for (const item of cotizacionesData || []) {
      // Get any existing allocations for this cotización and product
      const { data: allocations } = await supabase
        .from('production_allocations')
        .select('cantidad_asignada')
        .eq('cotizacion_id', item.cotizacion_id)
        .eq('producto_id', productId);

      const totalAllocated = allocations?.reduce((sum, alloc) => sum + alloc.cantidad_asignada, 0) || 0;
      const cantidadPendiente = item.cantidad - totalAllocated;

      // Only include if there's still pending quantity
      if (cantidadPendiente > 0) {
        // Get the earliest payment date for this cotización
        const { data: paymentData } = await supabase
          .from('pagos')
          .select('fecha_pago')
          .eq('cotizacion_id', item.cotizacion_id)
          .in('tipo_pago', ['anticipo', 'pago_completo'])
          .eq('estado', 'completado')
          .order('fecha_pago', { ascending: true })
          .limit(1);

        const fechaPago = paymentData?.[0]?.fecha_pago || item.cotizaciones.fecha_pago_inicial;
        const diasEspera = fechaPago ? Math.floor((Date.now() - new Date(fechaPago).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        demands.push({
          cotizacion_id: item.cotizacion_id,
          cotizacion_folio: item.cotizaciones.folio,
          cliente_id: item.cotizaciones.cliente_id,
          cliente_nombre: item.cotizaciones.clientes.nombre,
          cantidad_pendiente: cantidadPendiente,
          cantidad_total: item.cantidad,
          fecha_pago: fechaPago || new Date().toISOString(),
          dias_espera: diasEspera,
          prioridad: item.cotizaciones.prioridad || false,
          is_premium: item.cotizaciones.is_premium || false
        });
      }
    }

    // Sort by priority first, then by payment date (oldest first)
    demands.sort((a, b) => {
      // Priority items first
      if (a.prioridad && !b.prioridad) return -1;
      if (!a.prioridad && b.prioridad) return 1;
      
      // Premium items next
      if (a.is_premium && !b.is_premium) return -1;
      if (!a.is_premium && b.is_premium) return 1;
      
      // Then by payment date (oldest first)
      return new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime();
    });

    console.log("[API /production/client-demands GET] Processed demands:", demands.length);

    return NextResponse.json({
      demands,
      debug: {
        productId,
        totalCotizaciones: cotizacionesData?.length || 0,
        demandsWithPendingQuantity: demands.length
      }
    });

  } catch (error) {
    console.error('[API /production/client-demands GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 