import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface EnviosProduct {
  nombre: string;
  cantidad_empaque: number;
  cantidad_enviados: number;
  producto_id: number;
  empaque_status: 'parcial' | 'completo';
  envio_status: 'parcial' | 'completo' | 'pendiente';
}

interface EnviosCotizacion {
  cotizacion_id: number;
  folio: string;
  cliente: string;
  fecha_creacion: string;
  estimated_delivery_date?: string;
  days_until_delivery?: number;
  estado: string;
  productos: EnviosProduct[];
  totals: {
    productos_count: number;
    empaque_count: number;
    enviados_count: number;
    cajas_chicas: number;
    cajas_grandes: number;
  };
}

export async function GET(request: NextRequest) {
  console.log("[API /production/envios GET] === STARTING REQUEST ===");
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
        remove: (name: string, options: any) => cookieStore.remove(name, options),
      },
    }
  );

  try {
    // Get all cotizaciones that have products in 'empaque' or 'entregado' stages
    const { data: cotizacionesWithAllocations, error: cotizacionesError } = await supabase
      .from('production_allocations')
      .select(`
        cotizacion_id,
        stage,
        producto_id,
        cantidad_asignada,
        cajas_chicas,
        cajas_grandes,
        cotizaciones!inner (
          cotizacion_id,
          folio,
          fecha_creacion,
          estimated_delivery_date,
          estado,
          clientes!inner (
            nombre
          )
        ),
        productos!inner (
          nombre
        )
      `)
      .in('stage', ['empaque', 'entregado'])
      .order('cotizacion_id', { ascending: true });

    if (cotizacionesError) {
      console.error("[API /production/envios GET] Error fetching cotizaciones with allocations:", cotizacionesError);
      return NextResponse.json({ 
        error: 'Error al obtener envíos',
        details: cotizacionesError.message 
      }, { status: 500 });
    }

    if (!cotizacionesWithAllocations || cotizacionesWithAllocations.length === 0) {
      console.log("[API /production/envios GET] No cotizaciones with allocations found");
      return NextResponse.json({
        success: true,
        data: [],
        total: 0
      });
    }

    // Get cotizacion products to calculate total quantities ordered
    const cotizacionIds = [...new Set(cotizacionesWithAllocations.map(item => item.cotizacion_id))];
    
    const { data: cotizacionProductos, error: productosError } = await supabase
      .from('cotizacion_productos')
      .select(`
        cotizacion_id,
        producto_id,
        cantidad
      `)
      .in('cotizacion_id', cotizacionIds);

    if (productosError) {
      console.error("[API /production/envios GET] Error fetching cotizacion productos:", productosError);
      return NextResponse.json({ 
        error: 'Error al obtener productos de cotizaciones',
        details: productosError.message 
      }, { status: 500 });
    }

    // Group data by cotizacion
    const cotizacionesMap = new Map<number, {
      cotizacion_data: any;
      productos: Map<number, {
        nombre: string;
        cantidad_total: number;
        cantidad_empaque: number;
        cantidad_enviados: number;
        cajas_chicas: number;
        cajas_grandes: number;
      }>;
    }>();

    // Initialize cotizaciones map
    cotizacionesWithAllocations.forEach(item => {
      if (!cotizacionesMap.has(item.cotizacion_id)) {
        cotizacionesMap.set(item.cotizacion_id, {
          cotizacion_data: item.cotizaciones,
          productos: new Map()
        });
      }

      const cotizacionEntry = cotizacionesMap.get(item.cotizacion_id)!;
      
      if (!cotizacionEntry.productos.has(item.producto_id)) {
        cotizacionEntry.productos.set(item.producto_id, {
          nombre: item.productos.nombre,
          cantidad_total: 0, // Will be filled from cotizacion_productos
          cantidad_empaque: 0,
          cantidad_enviados: 0,
          cajas_chicas: 0,
          cajas_grandes: 0
        });
      }

      const producto = cotizacionEntry.productos.get(item.producto_id)!;
      
      if (item.stage === 'empaque') {
        producto.cantidad_empaque += item.cantidad_asignada;
        producto.cajas_chicas += item.cajas_chicas || 0;
        producto.cajas_grandes += item.cajas_grandes || 0;
      } else if (item.stage === 'entregado') {
        producto.cantidad_enviados += item.cantidad_asignada;
        producto.cajas_chicas += item.cajas_chicas || 0;
        producto.cajas_grandes += item.cajas_grandes || 0;
      }
    });

    // Add total quantities from cotizacion_productos
    if (cotizacionProductos) {
      cotizacionProductos.forEach(cp => {
        const cotizacionEntry = cotizacionesMap.get(cp.cotizacion_id);
        if (cotizacionEntry && cotizacionEntry.productos.has(cp.producto_id)) {
          const producto = cotizacionEntry.productos.get(cp.producto_id)!;
          producto.cantidad_total = cp.cantidad;
        }
      });
    }

    // Calculate days until delivery
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Transform to final format
    const enviosCotizaciones: EnviosCotizacion[] = Array.from(cotizacionesMap.entries()).map(([cotizacionId, data]) => {
      const cotizacionData = data.cotizacion_data;
      
      // Calculate days until delivery
      let daysUntilDelivery: number | undefined;
      if (cotizacionData.estimated_delivery_date) {
        const deliveryDate = new Date(cotizacionData.estimated_delivery_date);
        deliveryDate.setHours(0, 0, 0, 0);
        daysUntilDelivery = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      const productos: EnviosProduct[] = Array.from(data.productos.entries()).map(([productoId, producto]) => {
        // Determine empaque status
        const empaqueStatus: 'parcial' | 'completo' = 
          producto.cantidad_empaque >= producto.cantidad_total ? 'completo' : 'parcial';
        
        // Determine envio status
        let envioStatus: 'parcial' | 'completo' | 'pendiente';
        if (producto.cantidad_enviados === 0) {
          envioStatus = 'pendiente';
        } else if (producto.cantidad_enviados >= producto.cantidad_total) {
          envioStatus = 'completo';
        } else {
          envioStatus = 'parcial';
        }

        return {
          nombre: producto.nombre,
          cantidad_empaque: producto.cantidad_empaque,
          cantidad_enviados: producto.cantidad_enviados,
          producto_id: productoId,
          empaque_status: empaqueStatus,
          envio_status: envioStatus
        };
      });

      // Calculate totals
      const totals = {
        productos_count: productos.length,
        empaque_count: productos.reduce((sum, p) => sum + p.cantidad_empaque, 0),
        enviados_count: productos.reduce((sum, p) => sum + p.cantidad_enviados, 0),
        cajas_chicas: Array.from(data.productos.values()).reduce((sum, p) => sum + p.cajas_chicas, 0),
        cajas_grandes: Array.from(data.productos.values()).reduce((sum, p) => sum + p.cajas_grandes, 0)
      };

      return {
        cotizacion_id: cotizacionId,
        folio: cotizacionData.folio,
        cliente: cotizacionData.clientes.nombre,
        fecha_creacion: new Date(cotizacionData.fecha_creacion).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        }),
        estimated_delivery_date: cotizacionData.estimated_delivery_date ? 
          new Date(cotizacionData.estimated_delivery_date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          }) : undefined,
        days_until_delivery: daysUntilDelivery,
        estado: cotizacionData.estado,
        productos: productos,
        totals: totals
      };
    });

    // Sort by priority (urgent deliveries first, then by folio)
    enviosCotizaciones.sort((a, b) => {
      // Urgent deliveries first
      const aUrgent = (a.days_until_delivery !== undefined && a.days_until_delivery <= 7);
      const bUrgent = (b.days_until_delivery !== undefined && b.days_until_delivery <= 7);
      
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      
      // Then by days until delivery (ascending)
      if (a.days_until_delivery !== undefined && b.days_until_delivery !== undefined) {
        return a.days_until_delivery - b.days_until_delivery;
      }
      if (a.days_until_delivery !== undefined && b.days_until_delivery === undefined) return -1;
      if (a.days_until_delivery === undefined && b.days_until_delivery !== undefined) return 1;
      
      // Finally by folio
      return a.folio.localeCompare(b.folio);
    });

    console.log(`[API /production/envios GET] Returning ${enviosCotizaciones.length} cotizaciones with envíos`);

    return NextResponse.json({
      success: true,
      data: enviosCotizaciones,
      total: enviosCotizaciones.length
    });

  } catch (error) {
    console.error('[API /production/envios GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}