import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

// Optimized types for cronograma response
interface CronogramaProducto {
  producto_id: number;
  nombre: string;
  sku?: string;
  cantidad_pedida: number;
  cantidad_asignada: number; // allocated to empaque/enviados
  cantidad_pendiente: number; // still needs production
  produccion_status: {
    por_detallar: number;
    detallado: number;
    sancocho: number;
    terminado: number;
    total_en_pipeline: number;
  };
  moldes_disponibles: number;
  vueltas_max_dia: number;
  capacidad_diaria: number;
  precio_venta: number;
  // Timeline information
  dias_estimados: number;
  fecha_estimada_completion: string;
  limitado_por_moldes: boolean;
}

interface CronogramaCotizacion {
  cotizacion_id: number;
  folio: string;
  cliente: string;
  cliente_id: number;
  fecha_creacion: string;
  estado: string;
  productos: CronogramaProducto[];
  total_piezas: number;
  total_pendientes: number;
  total_en_pipeline: number;
}

interface CronogramaResponse {
  cotizaciones: CronogramaCotizacion[];
  summary: {
    total_cotizaciones: number;
    total_productos_unicos: number;
    total_piezas_pedidas: number;
    total_piezas_pendientes: number;
    total_piezas_en_pipeline: number;
    productos_por_prioridad: Array<{
      producto_id: number;
      nombre: string;
      total_pendiente: number;
      total_en_pipeline: number;
      moldes_disponibles: number;
      capacidad_diaria: number;
      limitado_por_moldes: boolean;
      cotizaciones_count: number;
      fecha_mas_temprana: string;
    }>;
  };
}

// Helper function to calculate working days (6 days per week, skip Sundays)
function addWorkingDays(startDate: Date, workingDays: number): Date {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < workingDays) {
    result.setDate(result.getDate() + 1);
    // Skip Sundays (0), work Monday (1) through Saturday (6)
    if (result.getDay() !== 0) {
      daysAdded++;
    }
  }
  
  return result;
}

export async function GET(request: NextRequest) {
  console.log("[API /production/cronograma GET] === STARTING OPTIMIZED REQUEST ===");
  
  try {
    const supabase = await createClient();

    // Step 1: Get cotizaciones that have products actively in production_queue
    // First, get cotizaciones that have products in production_queue
    const { data: activeProductionQueue, error: queueError } = await supabase
      .from('production_queue')
      .select(`
        cotizacion_producto_id,
        cotizacion_productos!inner (
          cotizacion_id,
          cotizaciones!cotizacion_productos_cotizacion_id_fkey!inner (
            cotizacion_id,
            folio,
            cliente_id,
            fecha_creacion,
            estado
          )
        )
      `)
      .in('status', ['queued', 'in_progress']);

    if (queueError) {
      console.error("[API /production/cronograma GET] Error fetching production queue:", queueError);
      return NextResponse.json({ 
        error: 'Error al obtener cola de producción',
        details: queueError.message 
      }, { status: 500 });
    }

    // Extract unique cotizaciones from the queue data
    const activeCotizacionIds = [...new Set(
      activeProductionQueue?.map((item: any) => 
        item.cotizacion_productos?.cotizaciones?.cotizacion_id
      ).filter(id => id) || []
    )];

    if (activeCotizacionIds.length === 0) {
      console.log("[API /production/cronograma GET] No cotizaciones with active production found");
      return NextResponse.json({
        cotizaciones: [],
        summary: {
          total_cotizaciones: 0,
          total_productos_unicos: 0,
          total_piezas_pedidas: 0,
          total_piezas_pendientes: 0,
          total_piezas_en_pipeline: 0,
          productos_por_prioridad: []
        }
      });
    }

    // Now get the full cotizacion data for these active cotizaciones
    const { data: cotizacionesData, error: cotizacionesError } = await supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        cliente_id,
        fecha_creacion,
        estado
      `)
      .in('cotizacion_id', activeCotizacionIds)
      .order('fecha_creacion', { ascending: true });

    if (cotizacionesError) {
      console.error("[API /production/cronograma GET] Error fetching cotizaciones:", cotizacionesError);
      return NextResponse.json({ 
        error: 'Error al obtener cotizaciones en producción',
        details: cotizacionesError.message 
      }, { status: 500 });
    }

    if (!cotizacionesData || cotizacionesData.length === 0) {
      console.log("[API /production/cronograma GET] No cotizaciones in production found");
      return NextResponse.json({
        cotizaciones: [],
        summary: {
          total_cotizaciones: 0,
          total_productos_unicos: 0,
          total_piezas_pedidas: 0,
          total_piezas_pendientes: 0,
          total_piezas_en_pipeline: 0,
          productos_por_prioridad: []
        }
      });
    }

    console.log(`[API /production/cronograma GET] Found ${cotizacionesData.length} cotizaciones in production`);

    const cotizacionIds = cotizacionesData.map(c => c.cotizacion_id);

    // Step 2: Get all clientes data for these cotizaciones
    const { data: clientesData, error: clientesError } = await supabase
      .from('clientes')
      .select('cliente_id, nombre')
      .in('cliente_id', cotizacionesData.map(c => c.cliente_id));

    if (clientesError) {
      console.error("[API /production/cronograma GET] Error fetching clientes:", clientesError);
    }

    // Create clientes map
    const clientesMap = new Map<number, string>();
    if (clientesData) {
      clientesData.forEach(cliente => {
        clientesMap.set(cliente.cliente_id, cliente.nombre);
      });
    }

    // Step 3: Get cotizacion_productos for these cotizaciones
    const { data: cotizacionProductosData, error: cpError } = await supabase
      .from('cotizacion_productos')
      .select('cotizacion_id, producto_id, cantidad, cantidad_produccion, precio_unitario')
      .in('cotizacion_id', cotizacionIds);

    if (cpError) {
      console.error("[API /production/cronograma GET] Error fetching cotizacion_productos:", cpError);
      return NextResponse.json({ 
        error: 'Error al obtener productos de cotizaciones',
        details: cpError.message 
      }, { status: 500 });
    }

    if (!cotizacionProductosData || cotizacionProductosData.length === 0) {
      console.log("[API /production/cronograma GET] No products found for cotizaciones");
      return NextResponse.json({
        cotizaciones: [],
        summary: {
          total_cotizaciones: 0,
          total_productos_unicos: 0,
          total_piezas_pedidas: 0,
          total_piezas_pendientes: 0,
          total_piezas_en_pipeline: 0,
          productos_por_prioridad: []
        }
      });
    }

    // Get all unique product IDs for batch queries
    const allProductIds = Array.from(new Set(cotizacionProductosData.map(cp => cp.producto_id)));
    console.log(`[API /production/cronograma GET] Processing ${allProductIds.length} unique products`);

    // Step 4: Get productos data
    const { data: productosData, error: productosError } = await supabase
      .from('productos')
      .select('producto_id, nombre, sku, vueltas_max_dia')
      .in('producto_id', allProductIds);

    if (productosError) {
      console.error("[API /production/cronograma GET] Error fetching productos:", productosError);
    }

    // Step 4b: Get active moldes data from mesas (for production capacity calculation)
    const { data: moldesActivosData, error: moldesActivosError } = await supabase
      .from('moldes_activos')
      .select('producto_id, cantidad')
      .in('producto_id', allProductIds);

    if (moldesActivosError) {
      console.error("[API /production/cronograma GET] Error fetching moldes activos:", moldesActivosError);
    }

    // Create productos map using active moldes from mesas (for production capacity)
    const productosMap = new Map<number, {
      nombre: string;
      sku?: string;
      moldes_disponibles: number;
      vueltas_max_dia: number;
    }>();

    // Create moldes activos map - aggregate manually since we can't use SUM in query
    const moldesActivosMap = new Map<number, number>();
    if (moldesActivosData) {
      moldesActivosData.forEach((item: any) => {
        const currentTotal = moldesActivosMap.get(item.producto_id) || 0;
        moldesActivosMap.set(item.producto_id, currentTotal + (item.cantidad || 0));
      });
    }

    if (productosData) {
      productosData.forEach(producto => {
        const moldesActivos = moldesActivosMap.get(producto.producto_id) || 0;
        productosMap.set(producto.producto_id, {
          nombre: producto.nombre,
          sku: producto.sku,
          moldes_disponibles: moldesActivos, // Use active moldes from mesas for capacity calculation
          vueltas_max_dia: producto.vueltas_max_dia || 1
        });
      });
    }

    // Step 5: Get production status for all products
    const { data: productionActiveData, error: productionError } = await supabase
      .from('production_active')
      .select('producto_id, por_detallar, detallado, sancocho, terminado')
      .in('producto_id', allProductIds);

    if (productionError) {
      console.error("[API /production/cronograma GET] Error fetching production active:", productionError);
    }

    // Create production status map
    const productionStatusMap = new Map<number, {
      por_detallar: number;
      detallado: number;
      sancocho: number;
      terminado: number;
      total_en_pipeline: number;
    }>();

    if (productionActiveData) {
      productionActiveData.forEach(item => {
        const total = (item.por_detallar || 0) + (item.detallado || 0) + (item.sancocho || 0) + (item.terminado || 0);
        productionStatusMap.set(item.producto_id, {
          por_detallar: item.por_detallar || 0,
          detallado: item.detallado || 0,
          sancocho: item.sancocho || 0,
          terminado: item.terminado || 0,
          total_en_pipeline: total
        });
      });
    }

    // Step 6: Get allocation data (empaque + entregado) for all products
    const { data: allocationsData, error: allocationsError } = await supabase
      .from('production_allocations')
      .select('producto_id, cotizacion_id, cantidad_asignada, stage')
      .in('producto_id', allProductIds)
      .in('stage', ['empaque', 'entregado']);

    if (allocationsError) {
      console.error("[API /production/cronograma GET] Error fetching allocations:", allocationsError);
    }

    // Create allocations map: productId -> cotizacionId -> totalAllocated
    const allocationsMap = new Map<number, Map<number, number>>();
    
    if (allocationsData) {
      allocationsData.forEach(alloc => {
        if (!allocationsMap.has(alloc.producto_id)) {
          allocationsMap.set(alloc.producto_id, new Map());
        }
        
        const productAllocations = allocationsMap.get(alloc.producto_id)!;
        const currentTotal = productAllocations.get(alloc.cotizacion_id) || 0;
        productAllocations.set(alloc.cotizacion_id, currentTotal + alloc.cantidad_asignada);
      });
    }

    // Create cotizacion_productos map for easier lookup
    const cotizacionProductosMap = new Map<number, Array<{
      producto_id: number;
      cantidad: number;
      precio_unitario: number;
    }>>();

    cotizacionProductosData.forEach(cp => {
      if (!cotizacionProductosMap.has(cp.cotizacion_id)) {
        cotizacionProductosMap.set(cp.cotizacion_id, []);
      }
      cotizacionProductosMap.get(cp.cotizacion_id)!.push({
        producto_id: cp.producto_id,
        cantidad: cp.cantidad_produccion ?? cp.cantidad,
        precio_unitario: cp.precio_unitario || 0
      });
    });

    // Process cotizaciones data
    const cronogramaCotizaciones: CronogramaCotizacion[] = [];
    const productSummaryMap = new Map<number, {
      nombre: string;
      total_pendiente: number;
      total_en_pipeline: number;
      moldes_disponibles: number;
      capacidad_diaria: number;
      cotizaciones_count: number;
      fecha_mas_temprana: string;
    }>();

    for (const cotizacion of cotizacionesData) {
      const productos: CronogramaProducto[] = [];
      let totalPiezas = 0;
      let totalPendientes = 0;
      let totalEnPipeline = 0;

      const cotizacionProducts = cotizacionProductosMap.get(cotizacion.cotizacion_id) || [];
      const clienteNombre = clientesMap.get(cotizacion.cliente_id) || 'Cliente Desconocido';

      for (const cp of cotizacionProducts) {
        const productoData = productosMap.get(cp.producto_id);
        if (!productoData) {
          console.warn(`[API /production/cronograma GET] Product data not found for producto_id: ${cp.producto_id}`);
          continue;
        }

        const cantidadPedida = cp.cantidad_produccion ?? cp.cantidad;
        
        // Get production status
        const prodStatus = productionStatusMap.get(cp.producto_id) || {
          por_detallar: 0,
          detallado: 0,
          sancocho: 0,
          terminado: 0,
          total_en_pipeline: 0
        };

        // Get allocations for this specific cotización + producto
        const productAllocations = allocationsMap.get(cp.producto_id);
        const cantidadAsignada = productAllocations?.get(cotizacion.cotizacion_id) || 0;

        // Calculate real remaining work needed for this specific cotización
        // Only subtract what has been actually delivered/completed for this cotización
        const cantidadPendiente = Math.max(0, cantidadPedida - cantidadAsignada);

        const moldesDisponibles = productoData.moldes_disponibles;
        const vueltasMaxDia = productoData.vueltas_max_dia;
        
        // Business logic: Apply 25% merma to the FULL cantidad pedida for timeline calculation
        // This shows how long it would take to produce the entire order from scratch
        const MERMA_PERCENTAGE = 0.25;
        const cantidadConMerma = Math.ceil(cantidadPedida * (1 + MERMA_PERCENTAGE));
        
        // Calculate production capacity per day (moldes_disponibles * vueltas_max_dia)
        const capacidadDiaria = moldesDisponibles * vueltasMaxDia;
        
        // Business logic: (cantidad + 25% merma) / moldes_disponibles = days
        const diasEstimados = moldesDisponibles > 0 ? Math.ceil(cantidadConMerma / capacidadDiaria) : 999;
        
        // Calculate estimated completion date using working days (6 days per week)
        const fechaEstimada = moldesDisponibles > 0 ? 
          addWorkingDays(new Date(), diasEstimados).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) :
          'Sin moldes';

        const cronogramaProducto: CronogramaProducto = {
          producto_id: cp.producto_id,
          nombre: productoData.nombre,
          sku: productoData.sku,
          cantidad_pedida: cantidadPedida,
          cantidad_asignada: cantidadAsignada,
          cantidad_pendiente: cantidadPendiente,
          produccion_status: prodStatus,
          moldes_disponibles: moldesDisponibles,
          vueltas_max_dia: vueltasMaxDia,
          capacidad_diaria: capacidadDiaria,
          precio_venta: cp.precio_unitario,
          // Timeline information with business logic
          dias_estimados: diasEstimados,
          fecha_estimada_completion: fechaEstimada,
          limitado_por_moldes: moldesDisponibles === 0
        };

        productos.push(cronogramaProducto);
        
        totalPiezas += cantidadPedida;
        totalPendientes += cantidadPendiente;
        totalEnPipeline += prodStatus.total_en_pipeline;

        // Update product summary
        const fechaCreacion = cotizacion.fecha_creacion || new Date().toISOString();
        if (productSummaryMap.has(cp.producto_id)) {
          const summary = productSummaryMap.get(cp.producto_id)!;
          summary.total_pendiente += cantidadPendiente;
          summary.total_en_pipeline += prodStatus.total_en_pipeline;
          summary.cotizaciones_count += 1;
          if (fechaCreacion < summary.fecha_mas_temprana) {
            summary.fecha_mas_temprana = fechaCreacion;
          }
        } else {
          productSummaryMap.set(cp.producto_id, {
            nombre: productoData.nombre,
            total_pendiente: cantidadPendiente,
            total_en_pipeline: prodStatus.total_en_pipeline,
            moldes_disponibles: moldesDisponibles,
            capacidad_diaria: capacidadDiaria,
            cotizaciones_count: 1,
            fecha_mas_temprana: fechaCreacion
          });
        }
      }

      cronogramaCotizaciones.push({
        cotizacion_id: cotizacion.cotizacion_id,
        folio: cotizacion.folio,
        cliente: clienteNombre,
        cliente_id: cotizacion.cliente_id,
        fecha_creacion: cotizacion.fecha_creacion,
        estado: cotizacion.estado,
        productos,
        total_piezas: totalPiezas,
        total_pendientes: totalPendientes,
        total_en_pipeline: totalEnPipeline
      });
    }

    // Create summary with product priority data
    const totalCotizaciones = cronogramaCotizaciones.length;
    const totalProductosUnicos = productSummaryMap.size;
    const totalPiezasPedidas = cronogramaCotizaciones.reduce((sum, c) => sum + c.total_piezas, 0);
    const totalPiezasPendientes = cronogramaCotizaciones.reduce((sum, c) => sum + c.total_pendientes, 0);
    const totalPiezasEnPipeline = cronogramaCotizaciones.reduce((sum, c) => sum + c.total_en_pipeline, 0);

    // Convert product summary to array and sort by priority (earliest date, then highest pending quantity)
    const productosPorPrioridad = Array.from(productSummaryMap.entries())
      .map(([productoId, summary]) => ({
        producto_id: productoId,
        nombre: summary.nombre,
        total_pendiente: summary.total_pendiente,
        total_en_pipeline: summary.total_en_pipeline,
        moldes_disponibles: summary.moldes_disponibles,
        capacidad_diaria: summary.capacidad_diaria,
        limitado_por_moldes: summary.capacidad_diaria < 340, // Assuming 340 is global daily capacity
        cotizaciones_count: summary.cotizaciones_count,
        fecha_mas_temprana: summary.fecha_mas_temprana
      }))
      .sort((a, b) => {
        // Sort by earliest date first, then by highest pending quantity
        const dateComparison = new Date(a.fecha_mas_temprana).getTime() - new Date(b.fecha_mas_temprana).getTime();
        if (dateComparison !== 0) return dateComparison;
        return b.total_pendiente - a.total_pendiente;
      });

    const response: CronogramaResponse = {
      cotizaciones: cronogramaCotizaciones,
      summary: {
        total_cotizaciones: totalCotizaciones,
        total_productos_unicos: totalProductosUnicos,
        total_piezas_pedidas: totalPiezasPedidas,
        total_piezas_pendientes: totalPiezasPendientes,
        total_piezas_en_pipeline: totalPiezasEnPipeline,
        productos_por_prioridad: productosPorPrioridad
      }
    };

    console.log(`[API /production/cronograma GET] Successfully processed data:`, {
      cotizaciones: totalCotizaciones,
      productos: totalProductosUnicos,
      piezas_pedidas: totalPiezasPedidas,
      piezas_pendientes: totalPiezasPendientes,
      piezas_en_pipeline: totalPiezasEnPipeline
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API /production/cronograma GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}