import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { ProductoConDescuento } from '@/components/cotizacion/lista-productos-con-descuento';
import { getNextFolioNumber } from '@/app/actions/cotizacion-actions';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    console.log(`[API /cotizaciones GET] Received request for ID: ${id}`); // Log ID
    
    if (id) {
      // Get a specific quote with its products and client
      console.log(`[API /cotizaciones GET id=${id}] Fetching main cotizacion details...`);
      const { data: cotizacion, error: cotizacionError } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          cliente:cliente_id(*)
        `)
        .eq('cotizacion_id', id)
        .single();
        
      if (cotizacionError) {
        // Log the specific error before returning
        console.error(`[API /cotizaciones GET id=${id}] Error fetching main cotizacion:`, cotizacionError);
        return NextResponse.json(
          { error: 'Error al obtener la cotización' }, 
          { status: 500 }
        );
      }
      
      console.log(`[API /cotizaciones GET id=${id}] Fetched main cotizacion:`, cotizacion);

      if (!cotizacion) {
         console.warn(`[API /cotizaciones GET id=${id}] Cotizacion not found.`);
        return NextResponse.json(
          { error: 'Cotización no encontrada' }, 
          { status: 404 }
        );
      }
      
      // Get the quotation products
      console.log(`[API /cotizaciones GET id=${id}] Fetching associated products...`);
      const { data: productos, error: productosError } = await supabase
        .from('cotizacion_productos')
        .select(`
          *,
          producto:producto_id(*)
        `)
        .eq('cotizacion_id', id);
      
      if (productosError) {
         // Log the specific error before returning
        console.error(`[API /cotizaciones GET id=${id}] Error fetching cotizacion products:`, productosError);
        return NextResponse.json(
          { error: 'Error al obtener los productos de la cotización' }, 
          { status: 500 }
        );
      }
      
      console.log(`[API /cotizaciones GET id=${id}] Fetched associated products data:`, productos);

      // Format the response
      const productosArray = Array.isArray(productos) ? productos : [];
      console.log(`[API /cotizaciones GET id=${id}] Processing ${productosArray.length} product items...`);
      
      const formattedProductos = productosArray.map((item, index) => {
        console.log(`[API /cotizaciones GET id=${id}] Mapping item ${index}:`, item);
        // Check if item and item.producto exist
        if (!item || !item.producto) {
           console.warn(`[API /cotizaciones GET id=${id}] Item ${index} is missing or item.producto is null/undefined.`);
          return {
            id: "0",
            nombre: "Producto no disponible",
            cantidad: 0,
            precio: 0,
            descuento: 0,
            subtotal: 0,
            sku: "",
            descripcion: "",
            colores: [],
            cotizacion_producto_id: 0
          };
        }
        
        // Log the structure of item.producto before accessing its properties
        console.log(`[API /cotizaciones GET id=${id}] Item ${index} has producto:`, item.producto);
        
        return {
          id: item.producto.producto_id?.toString() || "0",
          cotizacion_producto_id: item.cotizacion_producto_id,
          nombre: item.producto.nombre || "Sin nombre",
          cantidad: item.cantidad || 0,
          precio: item.precio_unitario || 0,
          descuento: item.descuento_producto || 0,
          subtotal: item.subtotal || 0,
          sku: item.producto.sku || "",
          descripcion: item.producto.descripcion || "",
          colores: item.producto.colores?.split(',') || []
        };
      });
      
      const responsePayload = {
        cotizacion: {
          ...cotizacion,
          productos: formattedProductos
        }
      };
      console.log(`[API /cotizaciones GET id=${id}] Returning final payload.`);
      return NextResponse.json(responsePayload);
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
      
      // Ensure cotizaciones is an array before returning
      const cotizacionesArray = Array.isArray(cotizaciones) ? cotizaciones : [];
      
      // Add basic validation for each cotizacion to prevent null errors
      const safeData = cotizacionesArray.map(cot => {
        if (!cot) return null;
        
        return {
          cotizacion_id: cot.cotizacion_id || 0,
          folio: cot.folio || 'Sin folio',
          fecha_creacion: cot.fecha_creacion || new Date().toISOString(),
          estado: cot.estado || 'pendiente',
          moneda: cot.moneda || 'MXN',
          total: cot.total || 0,
          total_mxn: cot.total_mxn || 0,
          cliente: cot.cliente ? {
            cliente_id: cot.cliente.cliente_id || 0,
            nombre: cot.cliente.nombre || 'Cliente sin nombre',
            celular: cot.cliente.celular || ''
          } : {
            cliente_id: 0,
            nombre: 'Cliente no encontrado',
            celular: ''
          }
        };
      }).filter(Boolean); // Remove any null entries
      
      return NextResponse.json({ cotizaciones: safeData });
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
    const data = await req.json();
    
    // Extract data from the request
    const { 
      cliente, 
      create_client_if_needed,
      productos, 
      moneda, 
      // Remove display values, add MXN base values
      // subtotal, 
      subtotal_mxn, 
      descuento_global, 
      iva, 
      // monto_iva, // Calculate this later
      // incluye_envio, // Determine this later
      // costo_envio, 
      costo_envio_mxn,
      // total,
      total_mxn,
      tipo_cambio,
      tiempo_estimado,
      tiempo_estimado_max
    } = data;

    console.log("==== QUOTATION DATA RECEIVED (MXN Basis) ====");
    console.log(`Currency: ${moneda}`);
    console.log(`Subtotal MXN: ${subtotal_mxn}`);
    console.log(`Shipping MXN: ${costo_envio_mxn}`);
    console.log(`Total MXN: ${total_mxn}`);
    console.log(`Exchange Rate: ${tipo_cambio}`);
    console.log(`Has IVA: ${iva}`);
    console.log(`Global Discount: ${descuento_global}%`);
    console.log("===============================");

    // Validate required fields
    if (!cliente || !productos || productos.length === 0 || typeof subtotal_mxn === 'undefined' || typeof costo_envio_mxn === 'undefined' || typeof total_mxn === 'undefined') {
      console.error('Validation Error: Missing required fields', { cliente: !!cliente, productos: productos?.length, subtotal_mxn, costo_envio_mxn, total_mxn });
      return NextResponse.json(
        { error: 'Cliente, productos y valores MXN son requeridos' }, 
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

    // --- Calculate Display Values & IVA for DB --- 
    // Reintroduce separate variables for DB display values
    let db_subtotal: number;
    let db_costo_envio: number;
    let db_total: number;
    let db_monto_iva: number;
    const incluye_envio_db = costo_envio_mxn > 0;

    // Use the original MXN values received from the request
    const original_subtotal_mxn = subtotal_mxn;
    const original_costo_envio_mxn = costo_envio_mxn;
    const original_total_mxn = total_mxn;

    if (moneda === 'USD' && tipo_cambio && tipo_cambio > 0) {
      // Convert original MXN to USD for display columns
      db_subtotal = original_subtotal_mxn / tipo_cambio;
      db_costo_envio = original_costo_envio_mxn / tipo_cambio;
      db_total = original_total_mxn / tipo_cambio;
      console.log(`Converting from MXN to USD for DB display columns: Rate ${tipo_cambio}`);
    } else {
      // Use original MXN values directly for display columns if currency is MXN
      db_subtotal = original_subtotal_mxn;
      db_costo_envio = original_costo_envio_mxn;
      db_total = original_total_mxn;
    }

    // Calculate IVA amount based on subtotal AFTER global discount (using original MXN)
    const subtotalAfterDiscountMXN = original_subtotal_mxn * (1 - (descuento_global || 0) / 100);
    const ivaAmountMXN = iva ? subtotalAfterDiscountMXN * 0.16 : 0;

    // Convert IVA amount to display currency if needed
    if (moneda === 'USD' && tipo_cambio && tipo_cambio > 0) {
      db_monto_iva = ivaAmountMXN / tipo_cambio;
    } else {
      db_monto_iva = ivaAmountMXN;
    }

    console.log("==== COTIZACION DATA TO SAVE (Calculated) ====");
    console.log(`Currency: ${moneda}`);
    console.log(`DB Subtotal (${moneda}): ${db_subtotal.toFixed(2)}`);
    console.log(`DB Shipping (${moneda}): ${db_costo_envio.toFixed(2)}`);
    console.log(`DB IVA (${moneda}): ${db_monto_iva.toFixed(2)}`);
    console.log(`DB Total (${moneda}): ${db_total.toFixed(2)}`);
    console.log(`Base Subtotal_MXN: ${original_subtotal_mxn.toFixed(2)}`);
    console.log(`Base Shipping_MXN: ${original_costo_envio_mxn.toFixed(2)}`);
    console.log(`Base Total_MXN: ${original_total_mxn.toFixed(2)}`);
    console.log(`Includes Shipping: ${incluye_envio_db}`);
    console.log("===============================");

    // --- Database Transaction --- 
    // Refactor: Remove RPC call and use direct inserts

    // 1. Insert into Cotizaciones Table
    const { data: cotizacionData, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .insert({
        cliente_id: client_id,
        folio: folio, // Generated folio
        moneda: moneda,
        // Insert calculated display values
        subtotal: db_subtotal,
        costo_envio: db_costo_envio,
        total: db_total,
        monto_iva: db_monto_iva, // Use calculated IVA
        // Insert base MXN values (use original values)
        subtotal_mxn: original_subtotal_mxn,
        costo_envio_mxn: original_costo_envio_mxn,
        total_mxn: original_total_mxn,
        // Other fields
        descuento_global: descuento_global || 0,
        iva: iva || false,
        incluye_envio: incluye_envio_db, // Use calculated boolean
        tipo_cambio: tipo_cambio,
        tiempo_estimado: tiempo_estimado || 6,
        tiempo_estimado_max: tiempo_estimado_max || 8,
        estado: 'pendiente',
        fecha_expiracion: fechaExpiracion.toISOString()
      })
      .select('cotizacion_id') // Select the ID of the newly inserted row
      .single(); // Expect only one row

    if (cotizacionError) {
      console.error('Error inserting cotizacion:', cotizacionError);
      return NextResponse.json(
        { error: `Error al guardar la cotización: ${cotizacionError.message}` },
        { status: 500 }
      );
    }

    const cotizacionId = cotizacionData.cotizacion_id;
    console.log("Cotizacion inserted successfully with ID:", cotizacionId);

    // 2. Prepare and Insert Products into Cotizacion_Productos Table
    // (Adapting existing product validation logic)

    const productoIds = productos
      .map((p: any) => {
        const idValue = p.producto_id ?? p.id;
        if (idValue && !String(idValue).startsWith('new-')) {
            const numId = Number(idValue);
            return !isNaN(numId) ? numId : null;
        }
        return null;
      })
      .filter((id: number | null): id is number => id !== null);

    console.log("Product IDs from frontend to verify:", productoIds);

    const { data: existingDbProducts, error: productsCheckError } = await supabase
      .from('productos')
      .select('producto_id')
      .in('producto_id', productoIds.length > 0 ? productoIds : [0]);

    if (productsCheckError) {
      console.error("Error checking existing products:", productsCheckError);
      // Rollback: Delete the just inserted cotizacion
      await supabase.from('cotizaciones').delete().eq('cotizacion_id', cotizacionId);
      return NextResponse.json({ error: 'Error al verificar productos existentes' }, { status: 500 });
    }

    const existingProductIds = new Set(existingDbProducts?.map(p => p.producto_id) || []);
    console.log("Existing product IDs found in DB:", Array.from(existingProductIds));

    // --- Fetch Max cotizacion_producto_id to generate new IDs --- 
    const { data: maxIdData, error: maxIdError } = await supabase
      .from('cotizacion_productos')
      .select('cotizacion_producto_id')
      .order('cotizacion_producto_id', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle to handle case where table is empty

    if (maxIdError) {
      console.error("Error fetching max cotizacion_producto_id:", maxIdError);
       // Rollback: Delete the just inserted cotizacion
      await supabase.from('cotizaciones').delete().eq('cotizacion_id', cotizacionId);
      return NextResponse.json({ error: 'Error al preparar IDs de productos para cotización' }, { status: 500 });
    }

    let nextId = (maxIdData?.cotizacion_producto_id || 0) + 1;
    console.log(`Starting next cotizacion_producto_id from: ${nextId}`);
    // --- End Fetch Max ID ---

    const productosToInsert = productos
      .map((p: any) => {
        const frontendId = p.producto_id ?? p.id;
        const dbProductoId = Number(frontendId);

        // Ensure product exists in DB before adding
        if (isNaN(dbProductoId) || !existingProductIds.has(dbProductoId)) {
            console.warn(`Skipping product - ID not found in DB or invalid: ${frontendId}`);
            return null;
        }

        // Use the MXN values sent from the frontend for the product
        const prod_original_precio_mxn = p.precio_unitario_mxn;
        const prod_original_subtotal_mxn = p.subtotal_mxn;

        // Calculate display price/subtotal for this product
        let prod_db_precio: number;
        let prod_db_subtotal: number;
        if (moneda === 'USD' && tipo_cambio && tipo_cambio > 0) {
            prod_db_precio = prod_original_precio_mxn / tipo_cambio;
            prod_db_subtotal = prod_original_subtotal_mxn / tipo_cambio;
        } else {
            prod_db_precio = prod_original_precio_mxn;
            prod_db_subtotal = prod_original_subtotal_mxn;
        }

        // Assign the generated ID
        const currentId = nextId++;

        return {
          cotizacion_producto_id: currentId, // Assign explicit ID
          cotizacion_id: cotizacionId,
          producto_id: dbProductoId,
          cantidad: p.cantidad,
          // Calculated display values for DB
          precio_unitario: prod_db_precio,
          subtotal: prod_db_subtotal,
          // Base MXN values for DB (use original from frontend)
          precio_unitario_mxn: prod_original_precio_mxn, 
          subtotal_mxn: prod_original_subtotal_mxn,
          // Other fields
          descuento_producto: p.descuento || 0,
          descripcion: p.descripcion,
          colores: Array.isArray(p.colores) ? p.colores.join(',') : p.colores,
          acabado: p.acabado
        };
      })
      .filter((p: any): p is object => p !== null); // Filter out nulls

    if (productosToInsert.length === 0) {
      console.warn("No valid products found to insert after validation.");
      // Rollback: Delete the just inserted cotizacion if no products are valid
      await supabase.from('cotizaciones').delete().eq('cotizacion_id', cotizacionId);
      return NextResponse.json({ error: 'Ningún producto válido para agregar a la cotización.' }, { status: 400 });
    }

    console.log(`Attempting to insert ${productosToInsert.length} products into cotizacion_productos`);

    const { error: productosInsertError } = await supabase
        .from('cotizacion_productos')
        .insert(productosToInsert);

    if (productosInsertError) {
        console.error('Error inserting products into cotizacion_productos:', productosInsertError);
        // Rollback: Delete the just inserted cotizacion
        await supabase.from('cotizaciones').delete().eq('cotizacion_id', cotizacionId);
        return NextResponse.json({ error: `Error al guardar productos: ${productosInsertError.message}` }, { status: 500 });
    }

    console.log("Products inserted successfully for cotizacion ID:", cotizacionId);
    
    // --- End Database Transaction --- 
    
    /* Remove RPC call result extraction
    const { data: cotizacionResult, error: cotizacionError } = await supabase.rpc('crear_cotizacion_con_productos', { ... });

    if (cotizacionError) {
      console.error('Error calling Supabase function crear_cotizacion_con_productos:', cotizacionError);
      return NextResponse.json(
        { error: `Error al guardar en base de datos: ${cotizacionError.message}` },
        { status: 500 }
      );
    }

    // Extract results from the function call
    const { nueva_cotizacion_id, nuevo_folio } = cotizacionResult;
    */

    // Use the ID and folio obtained from the direct insert
    const nueva_cotizacion_id = cotizacionId;
    const nuevo_folio = folio; 

    console.log("Cotizacion created successfully (direct insert):", { nueva_cotizacion_id, nuevo_folio });

    // Return information about the created quotation, including the client if it was created
    return NextResponse.json({
      success: true,
      cotizacion_id: nueva_cotizacion_id,
      folio: nuevo_folio,
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