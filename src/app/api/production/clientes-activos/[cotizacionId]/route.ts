import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Define the structure for cliente activo data
type ProductoConEstatus = {
  nombre: string;
  cantidad: number;
  fecha: string;
  precio_venta: number;
  precio_total: number;
  produccion_status: {
    por_detallar: number;
    detallado: number;
    sancocho: number;
    terminado: number;
  };
};

type ClienteActivoData = {
  cotizacion_id: number;
  folio: string;
  cliente: string;
  total_productos: number;
  precio_total: number;
  productos: ProductoConEstatus[];
};

export async function GET(
  request: NextRequest,
  { params }: { params: { cotizacionId: string } }
) {
  console.log("[API /production/clientes-activos GET] === STARTING REQUEST ===");
  
  const cotizacionId = params.cotizacionId;
  console.log("[API /production/clientes-activos GET] Cotizacion ID:", cotizacionId);

  // Validate cotizacion ID
  if (!cotizacionId || isNaN(parseInt(cotizacionId))) {
    return NextResponse.json({ 
      error: 'ID de cotización inválido',
      details: 'El ID de cotización debe ser un número válido'
    }, { status: 400 });
  }

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
    // First, get the main cotizacion data
    const { data: cotizacionData, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        fecha_creacion,
        total,
        clientes!inner (
          nombre
        )
      `)
      .eq('cotizacion_id', parseInt(cotizacionId))
      .single();

    if (cotizacionError) {
      console.error("[API /production/clientes-activos GET] Error fetching cotizacion:", cotizacionError);
      
      if (cotizacionError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Cotización no encontrada',
          details: `No se encontró la cotización con ID ${cotizacionId}`
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Error al obtener cotización',
        details: cotizacionError.message 
      }, { status: 500 });
    }

    console.log("[API /production/clientes-activos GET] Found cotizacion:", cotizacionData.folio);

    // Get products for this cotizacion with production status
    const { data: productosData, error: productosError } = await supabase
      .from('cotizacion_productos')
      .select(`
        cantidad,
        precio_unitario,
        productos!inner (
          producto_id,
          nombre
        )
      `)
      .eq('cotizacion_id', parseInt(cotizacionId));

    if (productosError) {
      console.error("[API /production/clientes-activos GET] Error fetching products:", productosError);
      return NextResponse.json({ 
        error: 'Error al obtener productos de la cotización',
        details: productosError.message 
      }, { status: 500 });
    }

    console.log("[API /production/clientes-activos GET] Found products:", productosData?.length || 0);

    if (!productosData || productosData.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron productos para esta cotización',
        details: `La cotización ${cotizacionData.folio} no tiene productos asociados`
      }, { status: 404 });
    }

    // Get production status for all products in this cotizacion
    const productIds = productosData.map(p => p.productos.producto_id);
    
    const { data: productionStatusData, error: productionStatusError } = await supabase
      .from('production_active')
      .select(`
        producto_id,
        por_detallar,
        detallado,
        sancocho,
        terminado
      `)
      .in('producto_id', productIds);

    if (productionStatusError) {
      console.warn("[API /production/clientes-activos GET] Warning: Could not fetch production status:", productionStatusError);
      // Continue without production status rather than failing
    }

    // Create a map of production status by product ID
    const productionStatusMap = new Map();
    if (productionStatusData) {
      productionStatusData.forEach(status => {
        productionStatusMap.set(status.producto_id, {
          por_detallar: status.por_detallar || 0,
          detallado: status.detallado || 0,
          sancocho: status.sancocho || 0,
          terminado: status.terminado || 0
        });
      });
    }

    // Format date as DD-MM-YY
    const fecha = new Date(cotizacionData.fecha_creacion);
    const fechaFormatted = fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });

    // Transform products data
    const productos: ProductoConEstatus[] = productosData.map(producto => {
      const precioUnitario = producto.precio_unitario || 0;
      const cantidad = producto.cantidad;
      const precioTotal = precioUnitario * cantidad;
      
      // Get production status for this product, default to zeros if not found
      const produccionStatus = productionStatusMap.get(producto.productos.producto_id) || {
        por_detallar: 0,
        detallado: 0,
        sancocho: 0,
        terminado: 0
      };

      return {
        nombre: producto.productos.nombre,
        cantidad: cantidad,
        fecha: fechaFormatted,
        precio_venta: precioUnitario,
        precio_total: precioTotal,
        produccion_status: produccionStatus
      };
    });

    // Sort products by name
    productos.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Build the response
    const clienteActivoData: ClienteActivoData = {
      cotizacion_id: cotizacionData.cotizacion_id,
      folio: cotizacionData.folio,
      cliente: cotizacionData.clientes.nombre,
      total_productos: productos.length,
      precio_total: cotizacionData.total,
      productos: productos
    };

    console.log("[API /production/clientes-activos GET] Returning cliente activo data for:", clienteActivoData.folio);

    return NextResponse.json({
      data: clienteActivoData
    });

  } catch (error) {
    console.error('[API /production/clientes-activos GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}