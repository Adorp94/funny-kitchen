import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

// Define the structure for pedidos data
type PedidosData = {
  folio: string;
  cliente: string;
  producto: string;
  producto_id?: number;
  cantidad: number;
  fecha: string;
  precio_venta: number;
  estimated_delivery_date?: string;
  days_until_delivery?: number;
  is_premium?: boolean;
  inventory_status?: {
    terminado_disponible: number;
    availability: 'sufficient' | 'partial' | 'none';
    can_skip_production: boolean;
    production_needed: number;
  };
  production_status?: {
    is_in_production: boolean;
    pedidos: number;
    por_detallar: number;
    detallado: number;
    sancocho: number;
    terminado: number;
    stage: 'no_production' | 'por_detallar' | 'detallado' | 'sancocho' | 'terminado';
  };
};

export async function GET(request: NextRequest) {
  console.log("[API /production/pedidos GET] === STARTING OPTIMIZED REQUEST ===");
  
  const supabase = await createClient();

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    console.log("[API /production/pedidos GET] Query params - status:", status, "limit:", limit);

    // Build status filter condition
    const statusConditions = status 
      ? [status] 
      : ['aprobada', 'producción', 'pagada'];

    // OPTIMIZED: Use two efficient queries instead of complex nested joins
    // First, get cotizaciones with client info, ordered by estimated delivery date (priority)
    const { data: cotizacionesData, error: cotizacionesError } = await supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        fecha_creacion,
        estado,
        cliente_id,
        estimated_delivery_date,
        is_premium,
        prioridad,
        clientes (
          nombre
        )
      `)
      .in('estado', statusConditions)
      .order('estimated_delivery_date', { ascending: true }) // Order by priority (soonest first)
      .order('folio', { ascending: true }); // Secondary sort by folio

    if (cotizacionesError) {
      console.error("[API /production/pedidos GET] Error fetching cotizaciones:", cotizacionesError);
      return NextResponse.json({ 
        error: 'Error al obtener cotizaciones',
        details: cotizacionesError.message 
      }, { status: 500 });
    }

    if (!cotizacionesData || cotizacionesData.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        returned: 0,
        message: "No se encontraron pedidos con los criterios especificados",
        filters: {
          status: status || 'aprobada,producción,pagada',
          limit: limit ? parseInt(limit) : null
        }
      });
    }

    // Second, get all products for these cotizaciones in one query
    const cotizacionIds = cotizacionesData.map(c => c.cotizacion_id);
    const { data: productosData, error: productosError } = await supabase
      .from('cotizacion_productos')
      .select(`
        cotizacion_id,
        producto_id,
        cantidad,
        precio_unitario,
        productos (
          nombre
        )
      `)
      .in('cotizacion_id', cotizacionIds);
      
    // Third, get production status for specific cotizacion+product combinations
    // We need to check production_queue to see which cotizacion_productos are in production
    const cotizacionProductosData = productosData || [];
    const cotizacionProductIds = cotizacionProductosData.map(cp => {
      // We need to find the cotizacion_producto_id for each combination
      return {
        cotizacion_id: cp.cotizacion_id,
        producto_id: cp.producto_id
      };
    });

    // Get production queue data - simpler approach
    const { data: productionQueueData, error: queueError } = await supabase
      .from('production_queue')
      .select('cotizacion_producto_id, producto_id, status, qty_total, qty_pendiente')
      .in('status', ['queued', 'in_progress']);

    // Get cotizacion_productos mapping for the cotizaciones we're working with
    const { data: cotizacionProductosMapping, error: mappingError } = await supabase
      .from('cotizacion_productos')
      .select('cotizacion_producto_id, cotizacion_id, producto_id')
      .in('cotizacion_id', cotizacionIds);

    // Also get global production_active data for stage information and terminado inventory
    const productIds = [...new Set(productosData?.map(p => p.producto_id) || [])];
    const { data: productionData, error: productionError } = await supabase
      .from('production_active')
      .select(`
        producto_id,
        pedidos,
        por_detallar,
        detallado,
        sancocho,
        terminado
      `)
      .in('producto_id', productIds);

    // Get allocated products to calculate true surplus inventory
    const { data: allocatedData, error: allocatedError } = await supabase
      .from('production_allocations')
      .select(`
        producto_id,
        cantidad_asignada,
        stage
      `)
      .in('producto_id', productIds)
      .in('stage', ['empaque', 'entregado']);

        if (productosError) {
      console.error("[API /production/pedidos GET] Error fetching productos:", productosError);
      return NextResponse.json({ 
        error: 'Error al obtener productos',
        details: productosError.message 
      }, { status: 500 });
    }

    console.log("[API /production/pedidos GET] Data received:", cotizacionesData.length, "cotizaciones,", productosData?.length || 0, "productos");

    // Transform the data into flat pedidos array
    const processedPedidos: PedidosData[] = [];

    for (const cotizacion of cotizacionesData) {
      const clienteNombre = (cotizacion.clientes as any)?.nombre || 'Cliente no encontrado';
      
      // Format date as DD-MM-YY
      const fecha = new Date(cotizacion.fecha_creacion);
      const fechaFormatted = fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });

      // Calculate days until delivery and format estimated delivery date
      let estimatedDeliveryFormatted = '';
      let daysUntilDelivery = 0;
      
      if (cotizacion.estimated_delivery_date) {
        const deliveryDate = new Date(cotizacion.estimated_delivery_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
        deliveryDate.setHours(0, 0, 0, 0);
        
        daysUntilDelivery = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        estimatedDeliveryFormatted = deliveryDate.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        });
      }

      // Find products for this cotizacion
      const cotizacionProductos = productosData?.filter(p => p.cotizacion_id === cotizacion.cotizacion_id) || [];
      
      for (const producto of cotizacionProductos) {
        const productoNombre = (producto.productos as any)?.nombre || 'Producto no encontrado';
        
        // Find if this specific cotizacion+product combination is in production queue
        const isInProductionQueue = cotizacionProductosMapping?.some(mapping => 
          mapping.cotizacion_id === cotizacion.cotizacion_id && 
          mapping.producto_id === producto.producto_id &&
          productionQueueData?.some(pq => pq.cotizacion_producto_id === mapping.cotizacion_producto_id)
        ) || false;

        // Find global production status for stage information
        const productionStatus = productionData?.find(p => p.producto_id === producto.producto_id);
        
        // Calculate surplus inventory availability using the same logic as production_active_with_gap view
        const terminadoTotal = productionStatus?.terminado || 0;
        const cantidadRequerida = producto.cantidad;
        const pedidosTotal = productionStatus?.pedidos || 0;
        
        // Calculate empaque allocations for this specific product (only empaque, not entregado)
        const empaqueForProduct = allocatedData?.filter(a => 
          a.producto_id === producto.producto_id && a.stage === 'empaque'
        ) || [];
        const totalEmpaqueAllocated = empaqueForProduct.reduce((sum, a) => sum + (a.cantidad_asignada || 0), 0);
        
        // Available terminado = current terminado stock minus what has been moved to empaque
        // This shows what's actually available to move directly to empaque
        const surplusDisponible = Math.max(0, terminadoTotal - totalEmpaqueAllocated);
        
        let availability: 'sufficient' | 'partial' | 'none' = 'none';
        let canSkipProduction = false;
        let productionNeeded = cantidadRequerida;
        
        if (surplusDisponible >= cantidadRequerida) {
          availability = 'sufficient';
          canSkipProduction = true;
          productionNeeded = 0;
        } else if (surplusDisponible > 0) {
          availability = 'partial';
          canSkipProduction = false;
          productionNeeded = cantidadRequerida - surplusDisponible;
        } else {
          availability = 'none';
          canSkipProduction = false;
          productionNeeded = cantidadRequerida;
        }
        
        const inventory_status = {
          terminado_disponible: surplusDisponible, // Available terminado stock after subtracting empaque allocations
          availability,
          can_skip_production: canSkipProduction,
          production_needed: productionNeeded
        };
        
        let production_status = {
          is_in_production: isInProductionQueue,
          pedidos: 0,
          por_detallar: 0,
          detallado: 0,
          sancocho: 0,
          terminado: 0,
          stage: 'no_production' as const
        };
        
        // If this cotizacion+product is in production queue, get the stage info
        if (isInProductionQueue && productionStatus) {
          production_status = {
            is_in_production: true,
            pedidos: productionStatus.pedidos || 0,
            por_detallar: productionStatus.por_detallar || 0,
            detallado: productionStatus.detallado || 0,
            sancocho: productionStatus.sancocho || 0,
            terminado: productionStatus.terminado || 0,
            stage: productionStatus.terminado > 0 ? 'terminado' :
                   productionStatus.sancocho > 0 ? 'sancocho' :
                   productionStatus.detallado > 0 ? 'detallado' :
                   productionStatus.por_detallar > 0 ? 'por_detallar' : 'por_detallar'
          };
        }
        
        processedPedidos.push({
          folio: cotizacion.folio,
          cliente: clienteNombre,
          producto: productoNombre,
          producto_id: producto.producto_id,
          cantidad: producto.cantidad,
          fecha: fechaFormatted,
          precio_venta: producto.precio_unitario || 0,
          estimated_delivery_date: estimatedDeliveryFormatted,
          days_until_delivery: daysUntilDelivery,
          is_premium: cotizacion.is_premium || cotizacion.prioridad || false,
          inventory_status,
          production_status
        });
      }
    }

    // Sort by priority: premium customers first, then by days until delivery, then by folio, then by product name
    processedPedidos.sort((a, b) => {
      // Primary sort: premium customers first
      if (a.is_premium !== b.is_premium) {
        return (b.is_premium ? 1 : 0) - (a.is_premium ? 1 : 0);
      }
      // Secondary sort: by days until delivery (ascending - soonest first)
      if (a.days_until_delivery !== b.days_until_delivery) {
        return a.days_until_delivery - b.days_until_delivery;
      }
      // Tertiary sort: by folio
      if (a.folio !== b.folio) {
        return a.folio.localeCompare(b.folio);
      }
      // Quaternary sort: by product name
      return a.producto.localeCompare(b.producto);
    });

    // Apply limit after processing if provided
    const totalItems = processedPedidos.length;
    let finalData = processedPedidos;
    if (limit && !isNaN(parseInt(limit))) {
      finalData = processedPedidos.slice(0, parseInt(limit));
    }

    console.log("[API /production/pedidos GET] Optimized query returned:", finalData.length, "items (total:", totalItems, ")");

    return NextResponse.json({
      data: finalData,
      total: totalItems,
      returned: finalData.length,
      filters: {
        status: status || 'aprobada,producción,pagada',
        limit: limit ? parseInt(limit) : null
      }
    });

  } catch (error) {
    console.error('[API /production/pedidos GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}