import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { ProductoConDescuento } from '@/components/cotizacion/lista-productos-con-descuento';
import { getNextFolioNumber } from '@/app/actions/cotizacion-actions';
import { ProductionPlannerService } from '@/services/productionPlannerService';
import { Database } from '@/lib/supabase/types';

// --- Helper function defined locally ---
function addBusinessDays(startDate: Date, days: number): Date {
    const date = new Date(startDate.valueOf());
    let addedDays = 0;
    while (addedDays < days) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            addedDays++;
        }
    }
    return date;
}
// --- End Helper Function ---

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
          fecha_pago_inicial,
          tiempo_estimado,
          tiempo_estimado_max,
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
      // Define expected type for a row in cotizaciones array for clarity
      // Define a specific type for the list items matching the selected fields
      type ClienteSummary = {
        cliente_id: number | null;
        nombre: string | null;
        celular: string | null;
      };
      
      type CotizacionListItem = {
        cotizacion_id: number;
        folio: string | null;
        fecha_creacion: string | null;
        estado: string | null;
        moneda: string | null;
        total: number | null;
        total_mxn: number | null;
        fecha_pago_inicial: string | null;
        tiempo_estimado: number | null;
        tiempo_estimado_max: number | null;
        cliente: ClienteSummary | null; // Use the specific ClienteSummary type
      };

      // Use CotizacionListItem[] for the type assertion, casting through unknown
      const safeData = (cotizacionesArray as unknown as CotizacionListItem[]).map(cot => {
        if (!cot) return null;
        // Client data might be an array, handle that case
        const clienteData = Array.isArray(cot.cliente) ? cot.cliente[0] : cot.cliente;
        
        return {
          cotizacion_id: cot.cotizacion_id ?? 0,
          folio: cot.folio ?? 'Sin folio',
          fecha_creacion: cot.fecha_creacion ?? new Date().toISOString(),
          estado: cot.estado ?? 'pendiente',
          moneda: cot.moneda ?? 'MXN',
          total: cot.total ?? 0,
          total_mxn: cot.total_mxn ?? 0,
          fecha_pago_inicial: cot.fecha_pago_inicial ?? null,
          tiempo_estimado: cot.tiempo_estimado ?? null,
          tiempo_estimado_max: cot.tiempo_estimado_max ?? null,
          cliente: clienteData ? {
            cliente_id: clienteData.cliente_id ?? 0, 
            nombre: clienteData.nombre ?? 'Cliente sin nombre',
            celular: clienteData.celular ?? ''
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
    const plannerService = new ProductionPlannerService(supabase); // Instantiate planner (using imported supabase)

    // Extract data from the request (add isPremium)
    const { 
      cliente, 
      create_client_if_needed,
      productos, 
      moneda, 
      subtotal_mxn, 
      descuento_global, 
      iva, 
      costo_envio_mxn,
      total_mxn,
      tipo_cambio,
      tiempo_estimado, // This might be replaced/informed by planner ETA
      tiempo_estimado_max, // This might be replaced/informed by planner ETA
      isPremium = false // Default premium to false if not provided
    } = data;

    console.log("==== QUOTATION DATA RECEIVED (MXN Basis) ====");
    console.log(`Client ID: ${cliente?.cliente_id}, CreateIfNeeded: ${create_client_if_needed}, isPremium: ${isPremium}`);
    console.log(`Currency: ${moneda}`);
    console.log(`Subtotal MXN: ${subtotal_mxn}`);
    console.log(`Shipping MXN: ${costo_envio_mxn}`);
    console.log(`Total MXN: ${total_mxn}`);
    console.log(`Exchange Rate: ${tipo_cambio}`);
    console.log(`Has IVA: ${iva}`);
    console.log(`Global Discount: ${descuento_global}%`);
    console.log(`Received ${productos?.length} products`);
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
        
        // Prepare client data for insertion
        const clientInsertData = {
          cliente_id: nextId, 
          nombre: cliente.nombre,
          celular: cliente.celular, 
          correo: cliente.correo,
          razon_social: cliente.razon_social,
          rfc: cliente.rfc,
          tipo_cliente: cliente.tipo_cliente,
          atencion: cliente.atencion,
          direccion_envio: cliente.direccion_envio,
          recibe: cliente.recibe
        };
        console.log("[API /cotizaciones POST] Attempting to insert client with data:", clientInsertData);

        // Insert client into database with explicit cliente_id
        const { data: newClient, error: clientError } = await supabase
          .from('clientes')
          .insert(clientInsertData) // Use prepared object
          .select('*') 
          .single();
        
        // --- Enhanced Logging --- 
        if (clientError) {
          console.error(`[API /cotizaciones POST] Error inserting new client with ID ${nextId}. Error Details:`, JSON.stringify(clientError, null, 2));
          // Consider returning more detailed error info if safe
          return NextResponse.json(
            { error: `Error DB al crear cliente: ${clientError.message}` }, 
            { status: 500 }
          );
        }
        
        // Log the result even if no error, check if it's null/undefined
        console.log(`[API /cotizaciones POST] Result of client insertion (ID: ${nextId}):`, newClient);

        if (!newClient) {
          console.error(`[API /cotizaciones POST] Failed to insert new client or select it back (ID: ${nextId}), but no explicit error was returned from Supabase.`);
          // This case indicates a potential logic error or unexpected DB behavior
          return NextResponse.json(
            { error: 'Error al crear el cliente: No se pudo verificar la creación (resultado nulo).' }, 
            { status: 500 }
          );
        }
        // --- End Enhanced Logging ---

        client_id = newClient.cliente_id; 
        cliente_creado = newClient; 
        console.log("[API /cotizaciones POST] New client created successfully:", cliente_creado);

      } catch (createClientErr: any) {
        console.error("Unexpected error creating client:", createClientErr);
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
        fecha_expiracion: fechaExpiracion.toISOString(),
        is_premium: isPremium // <<< ADDED: Save the isPremium flag from request body
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

    const existingProductIds = new Set(existingDbProducts?.map((p: { producto_id: number }) => p.producto_id) || []); // Added type annotation for p
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

    // Handle custom products by creating them first
    const processedProducts = [];
    
    for (const p of productos) {
        const frontendId = p.producto_id ?? p.id;
        let finalProductoId = Number(frontendId);

        // If product doesn't exist in DB, check if it's a custom product
        if (isNaN(finalProductoId) || !existingProductIds.has(finalProductoId)) {
            // Check if this is a custom product (has a name but no valid producto_id)
            if (p.nombre && (isNaN(finalProductoId) || String(frontendId).startsWith('new-'))) {
                console.log(`Creating custom product in productos table: ${p.nombre}`);
                
                const customProductData = {
                    nombre: p.nombre,
                    tipo_ceramica: 'CERÁMICA DE ALTA TEMPERATURA', // Default value
                    tipo_producto: 'Personalizado',
                    descripcion: p.descripcion || null,
                    colores: Array.isArray(p.colores) && p.colores.length > 0 
                        ? p.colores.join(',') 
                        : typeof p.colores === 'string' && p.colores.trim() !== '' 
                        ? p.colores.trim() 
                        : null,
                    capacidad: 0, // Default for custom products
                    unidad: 'unidad', // Default unit
                    precio: p.precio_unitario || p.precio || 0,
                    cantidad_inventario: 0
                };

                const { data: newProduct, error: createProductError } = await supabase
                    .from('productos')
                    .insert(customProductData)
                    .select('producto_id')
                    .single();

                if (createProductError) {
                    console.error("Error creating custom product:", createProductError);
                    // Rollback: Delete the just inserted cotizacion
                    await supabase.from('cotizaciones').delete().eq('cotizacion_id', cotizacionId);
                    return NextResponse.json({ 
                        error: `Error al crear producto personalizado "${p.nombre}": ${createProductError.message}`,
                        details: createProductError.message 
                    }, { status: 500 });
                }

                finalProductoId = newProduct.producto_id;
                console.log(`Created custom product with ID: ${finalProductoId}`);
            } else {
                console.warn(`Skipping product - ID not found in DB or invalid: ${frontendId}`);
                continue; // Skip to next product
            }
        }
        
        processedProducts.push({ ...p, finalProductoId });
    }

    const productosToInsert = processedProducts
      .map((p: any) => {

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
          producto_id: p.finalProductoId,
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