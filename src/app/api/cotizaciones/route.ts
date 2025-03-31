import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createBrowserClient } from '@supabase/ssr';
import { ProductoConDescuento } from '@/components/cotizacion/lista-productos-con-descuento';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const supabase = createServerSupabaseClient();
    
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
    const supabase = createServerSupabaseClient();
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

    console.log("==== QUOTATION DATA RECEIVED ====");
    console.log(`Currency: ${moneda}`);
    console.log(`Subtotal: ${subtotal} ${moneda}`);
    console.log(`Shipping: ${costo_envio} ${moneda}`);
    console.log(`Total: ${total} ${moneda}`);
    console.log(`Exchange Rate: ${tipo_cambio}`);
    console.log("===============================");

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

    // In our application architecture:
    // 1. All monetary values in the context are stored in MXN
    // 2. The UI displays them in USD if moneda is USD (by dividing by exchange rate)
    // 3. We store both the display currency values and MXN equivalents
    
    // Calculate display values based on the selected currency
    let displaySubtotal = subtotal;
    let displayShippingCost = costo_envio || 0;
    let displayTotal = total;
    
    // MXN values are already in the right currency
    let subtotal_mxn = subtotal;
    let costo_envio_mxn = costo_envio || 0;
    let total_mxn = total;
    
    // If currency is USD, convert display values for storage
    if (moneda === 'USD' && tipo_cambio) {
      // Convert from MXN to USD for display currency values
      displaySubtotal = subtotal / tipo_cambio;
      displayShippingCost = costo_envio / tipo_cambio;
      displayTotal = total / tipo_cambio;
      
      console.log(`Converting from MXN to USD for display: Rate ${tipo_cambio}`);
      console.log(`Subtotal MXN: ${subtotal} → USD: ${displaySubtotal.toFixed(2)}`);
      console.log(`Total MXN: ${total} → USD: ${displayTotal.toFixed(2)}`);
    }
    
    console.log("==== COTIZACION DATA TO SAVE ====");
    console.log(`Currency: ${moneda}`);
    console.log(`Subtotal (${moneda}): ${displaySubtotal.toFixed(2)}`);
    console.log(`Subtotal_MXN: ${subtotal_mxn.toFixed(2)}`);
    console.log(`Shipping (${moneda}): ${displayShippingCost.toFixed(2)}`);
    console.log(`Shipping_MXN: ${costo_envio_mxn.toFixed(2)}`);
    console.log(`Total (${moneda}): ${displayTotal.toFixed(2)}`);
    console.log(`Total_MXN: ${total_mxn.toFixed(2)}`);
    console.log("===============================");

    // 1. Insert the quotation
    const { data: cotizacionData, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .insert({
        cliente_id: cliente.cliente_id,
        moneda: moneda,
        subtotal: displaySubtotal,         // Amount in the display currency (USD or MXN)
        subtotal_mxn: subtotal_mxn,        // Always in MXN for reporting
        descuento_global: descuento_global || 0,
        iva: iva || false,
        monto_iva: monto_iva || 0,
        incluye_envio: incluye_envio || false,
        costo_envio: displayShippingCost,  // Amount in the display currency (USD or MXN)
        costo_envio_mxn: costo_envio_mxn,  // Always in MXN for reporting
        total: displayTotal,               // Amount in the display currency (USD or MXN)
        total_mxn: total_mxn,              // Always in MXN for reporting
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
    const productosToInsert = productos.map((producto: any, index: number) => {
      try {
        console.log(`Processing product ${index}:`, producto);
        
        // Ensure producto.id exists and can be converted to a number
        let productoId = null;
        try {
          productoId = producto.id ? Number(producto.id) : null;
          if (isNaN(productoId)) {
            console.error(`Invalid producto_id for product ${index}:`, producto.id);
            productoId = null;
          }
        } catch (error) {
          console.error(`Error converting producto_id for product ${index}:`, error);
        }
        
        if (!productoId && !producto.nombre) {
          throw new Error(`Product at index ${index} has no ID or name`);
        }
        
        // All product prices and subtotals in context are in MXN
        // Store them in MXN for the _mxn fields
        const precio_unitario_mxn = Number(producto.precio) || 0;
        const producto_subtotal_mxn = Number(producto.subtotal) || 0;
        
        // For display currency fields, convert if needed
        let displayPrecio = precio_unitario_mxn;
        let displaySubtotal = producto_subtotal_mxn;
        
        // Convert to display currency if moneda is USD
        if (moneda === 'USD' && tipo_cambio) {
          displayPrecio = precio_unitario_mxn / tipo_cambio;
          displaySubtotal = producto_subtotal_mxn / tipo_cambio;
        }
        
        // Only include fields that exist in the database schema
        return {
          cotizacion_id: cotizacionId,
          producto_id: productoId,
          cantidad: Number(producto.cantidad) || 1,
          precio_unitario: displayPrecio,        // Price in display currency (USD or MXN)
          precio_unitario_mxn: precio_unitario_mxn,  // Price always in MXN
          descuento_producto: Number(producto.descuento) || 0,
          subtotal: displaySubtotal,            // Subtotal in display currency (USD or MXN)
          subtotal_mxn: producto_subtotal_mxn     // Subtotal always in MXN
          // nombre_producto field removed as it doesn't exist in the database schema
        };
      } catch (error) {
        console.error(`Error processing product at index ${index}:`, error);
        throw error;
      }
    });

    // Fetch the cotizacion_productos table schema to see if producto_id is required
    const { data: schemaData, error: schemaError } = await supabase
      .from('cotizacion_productos')
      .select('*')
      .limit(0);
    
    if (schemaError) {
      console.warn('Could not check table schema:', schemaError);
    }
    
    // Check if any product doesn't have a valid ID
    const hasProductsWithoutId = productosToInsert.some(p => p.producto_id === null);
    if (hasProductsWithoutId) {
      console.warn('Some products do not have valid IDs. Adding temporary IDs for database insertion.');
      
      // Modify products to have temporary IDs if needed
      productosToInsert.forEach((product, idx) => {
        if (product.producto_id === null) {
          // Use negative numbers to indicate temporary IDs
          product.producto_id = -(idx + 1);
          
          // Log product info for reference without storing in database
          console.log(`Added temporary ID ${product.producto_id} for product at index ${idx}`);
        }
      });
    }

    console.log(`Inserting ${productosToInsert.length} products for quotation ${cotizacionId}`);
    
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
        { error: `Error al guardar los productos de la cotización: ${productosError.message}` }, 
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