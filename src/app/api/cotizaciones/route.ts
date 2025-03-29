import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ProductoConDescuento } from '@/components/cotizacion/lista-productos-con-descuento';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const supabase = createClientComponentClient();
    
    if (id) {
      // Get a specific quote with its products and client
      const { data: cotizacion, error: cotizacionError } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          cliente:cliente_id(*)
        `)
        .eq('cotizacion_id', id)
        .single();
        
      if (cotizacionError) {
        console.error('Error fetching quotation:', cotizacionError);
        return NextResponse.json(
          { error: 'Error al obtener la cotización' }, 
          { status: 500 }
        );
      }
      
      if (!cotizacion) {
        return NextResponse.json(
          { error: 'Cotización no encontrada' }, 
          { status: 404 }
        );
      }
      
      // Get the quotation products
      const { data: productos, error: productosError } = await supabase
        .from('cotizacion_productos')
        .select(`
          *,
          producto:producto_id(*)
        `)
        .eq('cotizacion_id', id);
      
      if (productosError) {
        console.error('Error fetching quotation products:', productosError);
        return NextResponse.json(
          { error: 'Error al obtener los productos de la cotización' }, 
          { status: 500 }
        );
      }
      
      // Format the response
      const formattedProductos = productos.map(item => ({
        id: item.producto.producto_id.toString(),
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        precio: item.precio_unitario,
        descuento: item.descuento_producto,
        subtotal: item.subtotal,
        sku: item.producto.sku,
        descripcion: item.producto.descripcion,
        colores: item.producto.colores?.split(',') || []
      }));
      
      return NextResponse.json({
        cotizacion: {
          ...cotizacion,
          productos: formattedProductos
        }
      });
    } else {
      // Get all cotizaciones with cliente info
      const { data: cotizaciones, error } = await supabase
        .from('cotizaciones')
        .select(`
          cotizacion_id,
          folio,
          fecha_creacion,
          estado,
          moneda,
          total,
          cliente:cliente_id (
            cliente_id,
            nombre,
            celular
          )
        `)
        .order('fecha_creacion', { ascending: false });
      
      if (error) {
        console.error('Error fetching cotizaciones:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ cotizaciones });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error al obtener las cotizaciones' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClientComponentClient();
    const data = await req.json();
    
    // Extract data from the request
    const { 
      cliente, 
      productos, 
      moneda, 
      subtotal, 
      descuento_global, 
      iva, 
      monto_iva, 
      incluye_envio, 
      costo_envio, 
      total,
      tipo_cambio
    } = data;

    // Validate required fields
    if (!cliente || !cliente.cliente_id || !productos || productos.length === 0) {
      return NextResponse.json(
        { error: 'Cliente y productos son requeridos' }, 
        { status: 400 }
      );
    }

    // Generate a unique folio
    const folio = `COT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Set expiration date (30 days from now)
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);

    // Normalize monetary values to be stored consistently
    // If currency is USD, store both USD values and their MXN equivalents
    let mxnSubtotal = subtotal;
    let mxnCostoEnvio = costo_envio || 0;
    let mxnTotal = total;
    
    // Calculate values in base currency (MXN) if the quotation is in USD
    if (moneda === 'USD' && tipo_cambio) {
      mxnSubtotal = subtotal * tipo_cambio;
      mxnCostoEnvio = costo_envio * tipo_cambio;
      mxnTotal = total * tipo_cambio;
    }

    // 1. Insert the quotation
    const { data: cotizacionData, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .insert({
        cliente_id: cliente.cliente_id,
        moneda: moneda,
        subtotal: subtotal,                   // Amount in the chosen currency
        subtotal_mxn: mxnSubtotal,            // Always in MXN for reporting
        descuento_global: descuento_global || 0,
        iva: iva || false,
        monto_iva: monto_iva || 0,
        incluye_envio: incluye_envio || false,
        costo_envio: costo_envio || 0,        // Amount in the chosen currency
        costo_envio_mxn: mxnCostoEnvio,       // Always in MXN for reporting
        total: total,                         // Amount in the chosen currency
        total_mxn: mxnTotal,                  // Always in MXN for reporting
        folio: folio,
        fecha_expiracion: fechaExpiracion.toISOString(),
        tipo_cambio: tipo_cambio || null
      })
      .select('cotizacion_id')
      .single();

    if (cotizacionError) {
      console.error('Error inserting quotation:', cotizacionError);
      return NextResponse.json(
        { error: 'Error al guardar la cotización' }, 
        { status: 500 }
      );
    }

    const cotizacionId = cotizacionData.cotizacion_id;

    // 2. Insert quotation products
    const productosToInsert = productos.map((producto: ProductoConDescuento) => {
      let precioMXN = producto.precio;
      let subtotalMXN = producto.subtotal;
      
      // Convert to MXN if currency is USD
      if (moneda === 'USD' && tipo_cambio) {
        precioMXN = producto.precio * tipo_cambio;
        subtotalMXN = producto.subtotal * tipo_cambio;
      }
      
      return {
        cotizacion_id: cotizacionId,
        producto_id: Number(producto.id),
        cantidad: producto.cantidad,
        precio_unitario: producto.precio,           // Amount in the chosen currency
        precio_unitario_mxn: precioMXN,             // Always in MXN for reporting
        descuento_producto: producto.descuento || 0,
        subtotal: producto.subtotal,                // Amount in the chosen currency
        subtotal_mxn: subtotalMXN                   // Always in MXN for reporting
      };
    });

    const { error: productosError } = await supabase
      .from('cotizacion_productos')
      .insert(productosToInsert);

    if (productosError) {
      console.error('Error inserting quotation products:', productosError);
      
      // If there's an error with products, delete the quotation
      await supabase
        .from('cotizaciones')
        .delete()
        .eq('cotizacion_id', cotizacionId);
        
      return NextResponse.json(
        { error: 'Error al guardar los productos de la cotización' }, 
        { status: 500 }
      );
    }

    // Return success with the quotation ID and folio
    return NextResponse.json({
      success: true,
      cotizacion_id: cotizacionId,
      folio: folio
    });
    
  } catch (error) {
    console.error('Unexpected error saving quotation:', error);
    return NextResponse.json(
      { error: 'Error inesperado al guardar la cotización' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { error: 'Cotización ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // First delete related products
    const { error: productosError } = await supabase
      .from('prodsxcotizacion')
      .delete()
      .eq('cotizacion_id', id);
      
    if (productosError) throw productosError;
    
    // Then delete the quote
    const { error: cotizacionError } = await supabase
      .from('cotizaciones')
      .delete()
      .eq('cotizacion_id', id);
      
    if (cotizacionError) throw cotizacionError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cotización:', error);
    return NextResponse.json(
      { error: 'Failed to delete cotización' },
      { status: 500 }
    );
  }
}