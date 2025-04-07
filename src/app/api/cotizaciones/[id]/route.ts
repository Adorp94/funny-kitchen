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
    descuento: z.number().optional(),
    subtotal: z.number(),
    producto_id: z.number().nullish(),
    sku: z.string().optional(),
    descripcion: z.string().optional(),
    colores: z.array(z.string()).optional(),
    acabado: z.string().optional(),
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
  { params }: RequestParams
) {
  try {
    const supabase = createServerSupabaseClient();
    
    const cotizacionId = Number(params.id);
    
    if (isNaN(cotizacionId)) {
      return NextResponse.json(
        { error: 'ID de cotización inválido' },
        { status: 400 }
      );
    }
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = updateCotizacionSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return NextResponse.json(
        { error: 'Datos de cotización inválidos', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Check if cotizacion exists and has the correct status
    const { data: existingCotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .single();
      
    if (cotizacionError || !existingCotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }
    
    if (existingCotizacion.estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'Solo se pueden editar cotizaciones en estado pendiente' },
        { status: 400 }
      );
    }
    
    // Start a transaction - use simpler approach with individual updates
    
    // 1. Update the cotizacion details
    const { error: updateError } = await supabase
      .from('cotizaciones')
      .update({
        cliente_id: data.cliente.cliente_id,
        moneda: data.moneda,
        subtotal: data.subtotal,
        descuento_global: data.descuento_global,
        iva: data.iva,
        monto_iva: data.monto_iva,
        incluye_envio: data.incluye_envio,
        costo_envio: data.costo_envio,
        total: data.total,
        tipo_cambio: data.tipo_cambio || null,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('cotizacion_id', cotizacionId);
    
    if (updateError) {
      console.error('Error updating cotizacion:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar la cotización', details: updateError.message },
        { status: 500 }
      );
    }
    
    // 2. Delete existing products
    const { error: deleteError } = await supabase
      .from('cotizacion_productos')
      .delete()
      .eq('cotizacion_id', cotizacionId);
    
    if (deleteError) {
      console.error('Error deleting products:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar productos', details: deleteError.message },
        { status: 500 }
      );
    }
    
    // 3. Insert new products
    const productsToInsert = data.productos.map(producto => ({
      cotizacion_id: cotizacionId,
      producto_id: producto.producto_id || 0, // Use 0 or other default for new products
      cantidad: producto.cantidad,
      precio_unitario: producto.precio,
      descuento_producto: producto.descuento || 0,
      subtotal: producto.subtotal,
      colores: producto.colores ? producto.colores.join(',') : null,
      acabado: producto.acabado || null,
      descripcion: producto.descripcion || null
    }));
    
    const { error: insertError } = await supabase
      .from('cotizacion_productos')
      .insert(productsToInsert);
    
    if (insertError) {
      console.error('Error inserting products:', insertError);
      return NextResponse.json(
        { error: 'Error al insertar productos', details: insertError.message },
        { status: 500 }
      );
    }
    
    // Get updated cotizacion
    const { data: updatedCotizacion, error: fetchError } = await supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        fecha_creacion,
        fecha_actualizacion,
        estado,
        moneda,
        subtotal,
        descuento_global,
        iva,
        monto_iva,
        incluye_envio,
        costo_envio,
        total,
        notas,
        tipo_cambio,
        productos,
        cliente:cliente_id (
          cliente_id,
          nombre,
          telefono,
          email,
          direccion,
          ciudad,
          estado,
          codigo_postal
        )
      `)
      .eq('cotizacion_id', cotizacionId)
      .single();
    
    if (fetchError) {
      return NextResponse.json(
        { success: true, message: 'Cotización actualizada correctamente, pero no se pudieron obtener los datos actualizados.' },
        { status: 200 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cotización actualizada correctamente',
      cotizacion: updatedCotizacion
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 