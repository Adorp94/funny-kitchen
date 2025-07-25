import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Define the structure for pedidos data
type PedidosData = {
  folio: string;
  cliente: string;
  producto: string;
  cantidad: number;
  fecha: string;
  precio_venta: number;
  estimated_delivery_date?: string;
  days_until_delivery?: number;
};

export async function GET(request: NextRequest) {
  console.log("[API /production/pedidos GET] === STARTING OPTIMIZED REQUEST ===");
  
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
          // NextJS 14 cookies don't have remove method
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

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
        
        processedPedidos.push({
          folio: cotizacion.folio,
          cliente: clienteNombre,
          producto: productoNombre,
          producto_id: producto.producto_id,
          cantidad: producto.cantidad,
          fecha: fechaFormatted,
          precio_venta: producto.precio_unitario || 0,
          estimated_delivery_date: estimatedDeliveryFormatted,
          days_until_delivery: daysUntilDelivery
        });
      }
    }

    // Sort by priority (days until delivery), then by folio, then by product name
    processedPedidos.sort((a, b) => {
      // Primary sort: by days until delivery (ascending - soonest first)
      if (a.days_until_delivery !== b.days_until_delivery) {
        return a.days_until_delivery - b.days_until_delivery;
      }
      // Secondary sort: by folio
      if (a.folio !== b.folio) {
        return a.folio.localeCompare(b.folio);
      }
      // Tertiary sort: by product name
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