import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createBrowserClient } from '@supabase/ssr';
import { ProductoConDescuento } from '@/components/cotizacion/lista-productos-con-descuento';
import { getNextFolioNumber } from '@/app/actions/cotizacion-actions';

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
          total_mxn,
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
      create_client_if_needed,
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
    if (!cliente || !productos || productos.length === 0) {
      return NextResponse.json(
        { error: 'Cliente y productos son requeridos' }, 
        { status: 400 }
      );
    }

    // Create or get client_id
    let client_id = cliente.cliente_id;
    let cliente_creado = null;
    
    if (create_client_if_needed && (!client_id || client_id === 0)) {
      console.log("Creating new client:", cliente);
      
      try {
        // First, get the maximum cliente_id to determine the next ID
        const { data: maxIdData, error: maxIdError } = await supabase
          .from('clientes')
          .select('cliente_id')
          .order('cliente_id', { ascending: false })
          .limit(1)
          .single();
          
        if (maxIdError && !maxIdError.message.includes('No rows found')) {
          console.error(`Error getting max cliente_id:`, maxIdError);
          return NextResponse.json(
            { error: 'Error al crear el cliente: No se pudo obtener un ID válido' }, 
            { status: 500 }
          );
        }
        
        // Calculate the next ID (if no clients exist yet, start with 1)
        const nextId = maxIdData ? maxIdData.cliente_id + 1 : 1;
        console.log(`Using next cliente_id: ${nextId} for new client`);
        
        // Insert client into database with explicit cliente_id
        const { data: newClient, error: clientError } = await supabase
          .from('clientes')
          .insert({
            cliente_id: nextId,
            nombre: cliente.nombre.trim().toUpperCase(),
            celular: cliente.celular,
            correo: cliente.correo || null,
            razon_social: cliente.razon_social || null,
            rfc: cliente.rfc || null,
            tipo_cliente: cliente.tipo_cliente || 'Normal',
            direccion_envio: cliente.direccion_envio || null,
            recibe: cliente.recibe || null,
            atencion: cliente.atencion || null
          })
          .select()
          .single();
        
        if (clientError) {
          console.error("Error creating client:", clientError);
          return NextResponse.json(
            { error: `Error al crear el cliente: ${clientError.message}` }, 
            { status: 500 }
          );
        }
        
        // Update client_id with the newly created ID
        client_id = newClient.cliente_id;
        cliente_creado = newClient;
        console.log("Client created successfully with ID:", client_id);
      } catch (clientError) {
        console.error("Unexpected error creating client:", clientError);
        return NextResponse.json(
          { error: 'Error al crear el cliente' }, 
          { status: 500 }
        );
      }
    }
    
    // Validate client_id after potential creation
    if (!client_id) {
      return NextResponse.json(
        { error: 'Cliente inválido' }, 
        { status: 400 }
      );
    }

    // Generate a unique folio with consecutive numbering
    const folio = await getNextFolioNumber();
    
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
        cliente_id: client_id,
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

    // 2. First, validate which productos exist in the database
    console.log("===== PRODUCT DATA RECEIVED FROM CLIENT =====");
    productos.forEach((p, i) => {
      console.log(`Product ${i+1}:`, {
        id: p.id,
        producto_id: p.producto_id,
        nombre: p.nombre,
        precio: p.precio
      });
    });
    console.log("===========================================");
    
    const productoIds = productos
      .map(p => {
        // Skip products that are clearly new/custom
        if (p.id === 'new' || 
            p.producto_id === null || 
            (typeof p.id === 'string' && p.id.startsWith('custom-'))) {
          return null;
        }
        
        // First check if producto_id is available
        if (p.producto_id) {
          // Ensure it's a valid integer ID (not a timestamp)
          const id = Number(p.producto_id);
          if (!isNaN(id) && id > 0 && id < 1000000000) {
            return id;
          }
        } 
        
        // Fall back to id if producto_id is not available and it's a valid numeric ID
        if (p.id && typeof p.id !== 'object') {
          const id = Number(p.id);
          if (!isNaN(id) && id > 0 && id < 1000000000) {
            return id;
          }
        }
        
        return null;
      })
      .filter(id => id !== null && !isNaN(id));
    
    console.log("Product IDs to verify:", productoIds);

    // Check which products exist in the database
    const { data: existingProducts, error: productsCheckError } = await supabase
      .from('productos')
      .select('producto_id')
      .in('producto_id', productoIds.length > 0 ? productoIds : [0]); // Prevent empty IN clause
    
    if (productsCheckError) {
      console.error("Error checking existing products:", productsCheckError);
      
      // If there's an error, delete the quotation
      await supabase
        .from('cotizaciones')
        .delete()
        .eq('cotizacion_id', cotizacionId);
        
      return NextResponse.json(
        { error: `Error al verificar productos: ${productsCheckError.message}` }, 
        { status: 500 }
      );
    }
    
    // Create a set of existing product IDs for easy lookup
    const existingProductIds = new Set(existingProducts?.map(p => p.producto_id) || []);
    
    console.log("Existing product IDs in database:", Array.from(existingProductIds));
    
    // Map and filter products to handle both existing and new products
    const validProductosToInsert = [];
    const processedCustomProducts = new Set(); // Track processed custom products by name

    // First identify and create new products that need to be inserted
    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i];
      try {
        // Check if this is a new product that needs to be inserted
        const isCustomProduct = 
          // Our intended marker for new products
          producto.id === 'new' || 
          // If producto_id is explicitly null, it's a new product
          producto.producto_id === null ||
          // If id is a string that looks like a timestamp (large number or starts with 'custom-')
          (typeof producto.id === 'string' && 
            ((producto.id.startsWith('custom-')) || 
              (!isNaN(Number(producto.id)) && Number(producto.id) > 1000000000))) ||
          // If id is a number that's too large to be a valid database ID (likely a timestamp)
          (typeof producto.id === 'number' && producto.id > 1000000000);

        if (isCustomProduct) {
          // Skip if we've already processed a custom product with this name
          if (processedCustomProducts.has(producto.nombre)) {
            console.log(`Skipping duplicate custom product with name: ${producto.nombre}`);
            continue;
          }
          
          // Check if this product already exists in the database by name
          const { data: existingProductByName, error: nameCheckError } = await supabase
            .from('productos')
            .select('producto_id')
            .ilike('nombre', producto.nombre)
            .limit(1);
            
          if (nameCheckError) {
            console.error("Error checking if product exists by name:", nameCheckError);
          }
          
          // If the product already exists, use that ID instead of creating a new one
          if (existingProductByName && existingProductByName.length > 0) {
            console.log(`Found existing product with name "${producto.nombre}", using ID: ${existingProductByName[0].producto_id}`);
            
            // Add product to the list using the existing producto_id
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
            
            validProductosToInsert.push({
              cotizacion_id: cotizacionId,
              producto_id: existingProductByName[0].producto_id,
              cantidad: Number(producto.cantidad) || 1,
              precio_unitario: displayPrecio,
              precio_unitario_mxn: precio_unitario_mxn,
              descuento_producto: Number(producto.descuento) || 0,
              subtotal: displaySubtotal,
              subtotal_mxn: producto_subtotal_mxn
            });
            
            // Add to processed set to avoid duplicates
            processedCustomProducts.add(producto.nombre);
            continue;
          }
          
          console.log(`Custom product at index ${i} detected, will insert it:`, producto.nombre);
          
          // Add to processed set
          processedCustomProducts.add(producto.nombre);
          
          // First, get the maximum producto_id to determine the next ID
          const { data: maxIdData, error: maxIdError } = await supabase
            .from('productos')
            .select('producto_id')
            .order('producto_id', { ascending: false })
            .limit(1)
            .single();
            
          if (maxIdError && !maxIdError.message.includes('No rows found')) {
            console.error(`Error getting max producto_id:`, maxIdError);
            continue; // Skip this product if we can't get the max ID
          }
          
          // Calculate the next ID (if no products exist yet, start with 1)
          const nextId = maxIdData ? maxIdData.producto_id + 1 : 1;
          console.log(`Using next producto_id: ${nextId} for new product`);
          
          // Insert the new product into productos table with the specific ID
          const { data: newProduct, error: newProductError } = await supabase
            .from('productos')
            .insert({
              producto_id: nextId,
              nombre: producto.nombre,
              precio: Number(producto.precio) || 0,
              tipo_producto: 'Personalizado'
            })
            .select('producto_id')
            .single();
            
          if (newProductError) {
            console.error(`Error inserting custom product at index ${i}:`, newProductError);
            continue; // Skip this product if insert failed
          }
          
          console.log(`Successfully inserted custom product, got ID: ${newProduct.producto_id}`);
          
          // Add product to the list using the newly generated producto_id
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
          
          validProductosToInsert.push({
            cotizacion_id: cotizacionId,
            producto_id: newProduct.producto_id,
            cantidad: Number(producto.cantidad) || 1,
            precio_unitario: displayPrecio,
            precio_unitario_mxn: precio_unitario_mxn,
            descuento_producto: Number(producto.descuento) || 0,
            subtotal: displaySubtotal,
            subtotal_mxn: producto_subtotal_mxn
          });
        } else {
          // Handle existing products with valid database IDs
          // Use producto_id from the request if available, otherwise use the id field
          const productoId = producto.producto_id || producto.id;
          
          // Skip products that don't have a valid ID
          if (!productoId) {
            console.error(`Product at index ${i} has no ID. Skipping.`);
            continue;
          }
          
          // Ensure the product ID is a number for the database
          const numericProductId = Number(productoId);
          
          // Skip if the product ID is not in our validated set of existing products
          if (!existingProductIds.has(numericProductId)) {
            console.error(`Product ID ${numericProductId} does not exist in the database. Skipping.`);
            continue;
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
          
          validProductosToInsert.push({
            cotizacion_id: cotizacionId,
            producto_id: numericProductId,
            cantidad: Number(producto.cantidad) || 1,
            precio_unitario: displayPrecio,
            precio_unitario_mxn: precio_unitario_mxn,
            descuento_producto: Number(producto.descuento) || 0,
            subtotal: displaySubtotal,
            subtotal_mxn: producto_subtotal_mxn
          });
        }
      } catch (error) {
        console.error(`Error processing product at index ${i}:`, error);
      }
    }

    // Check if we have any valid products left
    if (validProductosToInsert.length === 0) {
      console.error("No valid products to insert!");
      
      // Delete the quotation since we can't add any products
      await supabase
        .from('cotizaciones')
        .delete()
        .eq('cotizacion_id', cotizacionId);
        
      return NextResponse.json(
        { error: "No se pudo guardar la cotización: Ninguno de los productos existe en la base de datos" }, 
        { status: 400 }
      );
    }

    console.log(`Inserting ${validProductosToInsert.length} valid products for quotation ${cotizacionId}`);
    console.log("Valid product IDs:", validProductosToInsert.map(p => p.producto_id));

    const { error: productosError } = await supabase
      .from('cotizacion_productos')
      .insert(validProductosToInsert);

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

    // Return information about the created quotation, including the client if it was created
    return NextResponse.json({
      success: true,
      cotizacion_id: cotizacionId,
      folio: folio,
      cliente_creado: cliente_creado
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