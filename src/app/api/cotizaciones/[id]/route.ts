import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

interface RequestParams {
  params: {
    id: string;
  };
}

// Schema for validation
const updateCotizacionSchema = z.object({
  cotizacion_id: z.number(),
  cliente: z.object({
    cliente_id: z.number().optional(),
    nombre: z.string(),
    celular: z.string().optional(),
    correo: z.string().email().optional().nullable(),
    razon_social: z.string().optional().nullable(),
    rfc: z.string().optional().nullable(),
    tipo_cliente: z.string().optional().nullable(),
    direccion_envio: z.string().optional().nullable(),
    recibe: z.string().optional().nullable(),
    atencion: z.string().optional().nullable()
  }),
  productos: z.array(z.object({
    id: z.string(),
    nombre: z.string(),
    precio: z.number(),
    cantidad: z.number(),
    descuento: z.number().optional().default(0),
    subtotal: z.number(),
    producto_id: z.number().nullable().optional(),
    sku: z.string().optional().default(''),
    descripcion: z.string().optional().default(''),
    colores: z.array(z.string()).optional().default([]),
    acabado: z.string().optional().default(''),
  })),
  moneda: z.enum(['MXN', 'USD']),
  subtotal: z.number(),
  descuento_global: z.number().default(0),
  iva: z.boolean().default(false),
  monto_iva: z.number().default(0),
  incluye_envio: z.boolean().default(false),
  costo_envio: z.number().default(0),
  total: z.number(),
  tipo_cambio: z.number().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    
    const cotizacionId = params.id;
    
    // Get cotizacion details
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select(`
        *,
        cliente:cliente_id (
          nombre,
          celular,
          correo
        )
      `)
      .eq('cotizacion_id', cotizacionId)
      .single();
    
    if (cotizacionError) {
      console.error('Error fetching cotizacion:', cotizacionError);
      return NextResponse.json(
        { error: cotizacionError.message },
        { status: 500 }
      );
    }
    
    // Get products for this cotizacion
    const { data: productos, error: productosError } = await supabase
      .from('cotizacion_productos')
      .select(`
        cotizacion_producto_id,
        producto_id,
        cantidad,
        precio_unitario,
        descuento_producto,
        subtotal,
        productos:producto_id (
          nombre,
          tipo_producto
        )
      `)
      .eq('cotizacion_id', cotizacionId);
    
    if (productosError) {
      console.error('Error fetching products:', productosError);
      return NextResponse.json(
        { error: productosError.message },
        { status: 500 }
      );
    }
    
    // Format productos
    const formattedProductos = productos.map(item => ({
      id: item.cotizacion_producto_id.toString(),
      nombre: item.productos?.nombre || 'Producto sin nombre',
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      precio_total: item.subtotal,
      descuento: item.descuento_producto,
      tipo: item.productos?.tipo_producto
    }));
    
    // Get advance payments if any
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos_anticipos')
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .order('fecha_pago', { ascending: false });
    
    if (pagosError) {
      console.error('Error fetching payments:', pagosError);
      // Continue anyway, just log the error
    }
    
    const cotizacionData = {
      ...cotizacion,
      productos: formattedProductos,
      pagos: pagos || []
    };
    
    return NextResponse.json({ cotizacion: cotizacionData });
    
  } catch (error) {
    console.error('Error in cotizacion details API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("Cotizacion update API called for ID:", params.id);
    const supabase = createServerSupabaseClient();
    const cotizacionId = parseInt(params.id);
    
    // Basic validation
    if (isNaN(cotizacionId) || cotizacionId <= 0) {
      console.error(`Invalid cotizacion ID: ${params.id}`);
      return NextResponse.json({ error: 'ID de cotización inválido' }, { status: 400 });
    }

    // Parse request body
    const data = await request.json();
    console.log(`Received update request for cotizacion ${cotizacionId}`);
    
    // Verify cotizacion exists
    const { data: existingCotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .single();
    
    if (cotizacionError || !existingCotizacion) {
      console.error(`Cotizacion ${cotizacionId} not found:`, cotizacionError);
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }
    
    console.log("Found existing cotizacion, proceeding with update");
    
    // Build update object based only on confirmed fields
    const updateData = {
      cliente_id: typeof data.cliente_id === 'string' ? parseInt(data.cliente_id) : data.cliente_id,
      moneda: data.moneda,
      subtotal: typeof data.subtotal === 'string' ? parseFloat(data.subtotal) : data.subtotal,
      descuento_global: typeof data.descuento_global === 'string' ? parseFloat(data.descuento_global) : data.descuento_global,
      iva: data.iva,
      monto_iva: typeof data.monto_iva === 'string' ? parseFloat(data.monto_iva) : data.monto_iva,
      incluye_envio: data.incluye_envio,
      costo_envio: typeof data.costo_envio === 'string' ? parseFloat(data.costo_envio) : data.costo_envio,
      total: typeof data.total === 'string' ? parseFloat(data.total) : data.total,
      tipo_cambio: typeof data.tipo_cambio === 'string' ? parseFloat(data.tipo_cambio) : data.tipo_cambio,
    };
    
    // Only add fecha_actualizacion if it exists in the table (as per schema)
    if ('fecha_actualizacion' in existingCotizacion) {
      updateData.fecha_actualizacion = new Date().toISOString();
    }
    
    console.log("Update data:", updateData);
    
    // CORE UPDATE ONLY: Just update the main cotizacion fields
    const { error: updateError } = await supabase
      .from('cotizaciones')
      .update(updateData)
      .eq('cotizacion_id', cotizacionId);
    
    if (updateError) {
      console.error(`Error updating cotizacion ${cotizacionId}:`, updateError);
      return NextResponse.json({ 
        error: 'Error al actualizar la cotización',
        details: updateError.message
      }, { status: 500 });
    }
    
    console.log(`Successfully updated cotizacion ${cotizacionId} core data`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cotización actualizada correctamente'
    });
    
  } catch (error) {
    console.error('Unexpected error in cotizaciones API:', error);
    return NextResponse.json(
      { 
        error: 'Error al actualizar la cotización', 
        details: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 