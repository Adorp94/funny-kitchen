import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase/server';
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
  { params: { id } }: { params: { id: string } }
) {
  // --- Restore Original Logic --- 
  try {
    const cotizacionId = id; // Use id directly
    
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
        colores,
        acabado,
        descripcion,
        productos:producto_id (
          nombre,
          tipo_producto,
          sku
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
    
    // Format productos (ensure all needed fields are included for frontend)
    const formattedProductos = (productos || []).map(item => {
      let productoData: any = {};
      if (item.productos && typeof item.productos === 'object' && !Array.isArray(item.productos)) {
        productoData = item.productos;
      }
      return {
        // IDs
        id: item.cotizacion_producto_id?.toString?.() || '', // Context ID
        cotizacion_producto_id: item.cotizacion_producto_id,
        producto_id: item.producto_id,
        // Core data from join or base table
        nombre: productoData.nombre || 'Producto sin nombre',
        sku: productoData.sku || null,
        tipo_producto: productoData.tipo_producto || null,
        // Core data from cotizacion_productos table
        cantidad: item.cantidad,
        precio: item.precio_unitario, // Map to 'precio' for frontend context
        descuento: item.descuento_producto,
        subtotal: item.subtotal,
        // Specific details for this quote item from cotizacion_productos
        colores: item.colores || null, // Use directly selected value
        acabado: item.acabado || null, // Use directly selected value
        descripcion: item.descripcion || null // Use directly selected value
      };
    });
    
    // Get advance payments (commented out previously)
    // Re-enable if needed, ensure 'pagos_anticipos' table exists or logic is correct
    /*
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos_anticipos') // Make sure this table exists!
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .order('fecha_pago', { ascending: false });
    
    if (pagosError) {
      console.error('Error fetching payments:', pagosError);
    }
    */
    
    const cotizacionData = {
      ...cotizacion,
      productos: formattedProductos,
      pagos: [] // Keep payments empty for now unless table is confirmed
    };
    
    console.log(`[GET /api/cotizaciones/${id}] Returning data:`, JSON.stringify(cotizacionData, null, 2));
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
  { params: { id } }: { params: { id: string } }
) {
  try {
    console.log("Cotizacion update API called for ID:", id);
    const cotizacionId = parseInt(id);
    
    // Basic validation
    if (isNaN(cotizacionId) || cotizacionId <= 0) {
      console.error(`Invalid cotizacion ID: ${id}`);
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
    if (existingCotizacion && Object.prototype.hasOwnProperty.call(existingCotizacion, 'fecha_actualizacion')) {
      (updateData as any).fecha_actualizacion = new Date().toISOString();
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

    // --- PRODUCTOS SYNC LOGIC --- Refactored to Manual Insert/Update/Delete ---
    console.log("Received productos array in PUT:", JSON.stringify(data.productos, null, 2));
    if (Array.isArray(data.productos)) {

        // 1. Fetch current products for comparison
        const { data: currentDbProductos, error: fetchError } = await supabase
            .from('cotizacion_productos')
            .select('cotizacion_producto_id, producto_id') // Select only needed fields
            .eq('cotizacion_id', cotizacionId);

        if (fetchError) {
            console.error("Error fetching current products for sync:", fetchError);
            return NextResponse.json({ 
                error: "Error interno al obtener productos actuales", 
                details: fetchError.message 
            }, { status: 500 });
        }

        const currentDbMap = new Map(currentDbProductos?.map(p => [p.cotizacion_producto_id, p.producto_id]) || []);
        const incomingMap = new Map(); // Map incoming cotizacion_producto_id -> full product object
        const incomingProductoIds = new Set(); // Set of producto_ids in the payload
        const productsToInsert = [];
        const productsToUpdate = [];

        // 2. Process incoming products
        for (const producto of data.productos) {
            // Handle custom products by creating them in productos table first
            let finalProductoId = producto.producto_id ? parseInt(producto.producto_id, 10) : null;
            
            // If this is a custom product (no producto_id), create it in productos table first
            if (!finalProductoId && producto.nombre) {
                console.log(`Creating custom product in productos table: ${producto.nombre}`);
                
                const customProductData = {
                    nombre: producto.nombre,
                    tipo_ceramica: 'CERÁMICA DE ALTA TEMPERATURA', // Default value
                    tipo_producto: 'Personalizado',
                    descripcion: producto.descripcion || null,
                    colores: Array.isArray(producto.colores) && producto.colores.length > 0 
                        ? producto.colores.join(',') 
                        : typeof producto.colores === 'string' && producto.colores.trim() !== '' 
                        ? producto.colores.trim() 
                        : null,
                    capacidad: 0, // Default for custom products
                    unidad: 'unidad', // Default unit
                    precio: producto.precio_unitario || 0,
                    cantidad_inventario: 0
                };

                const { data: newProduct, error: createProductError } = await supabase
                    .from('productos')
                    .insert(customProductData)
                    .select('producto_id')
                    .single();

                if (createProductError) {
                    console.error("Error creating custom product:", createProductError);
                    return NextResponse.json({ 
                        error: `Error al crear producto personalizado "${producto.nombre}": ${createProductError.message}`,
                        details: createProductError.message 
                    }, { status: 500 });
                }

                finalProductoId = newProduct.producto_id;
                console.log(`Created custom product with ID: ${finalProductoId}`);
            }

            const dbProductoData = {
                // Map all relevant fields for insert/update
                cotizacion_id: cotizacionId,
                producto_id: finalProductoId,
                cantidad: producto.cantidad ? parseInt(producto.cantidad, 10) : 1,
                precio_unitario: producto.precio_unitario ? parseFloat(producto.precio_unitario) : 0,
                descuento_producto: producto.descuento_producto ? parseFloat(producto.descuento_producto) : 0,
                subtotal: producto.subtotal ? parseFloat(producto.subtotal) : 0,
                colores: Array.isArray(producto.colores) && producto.colores.length > 0 ? producto.colores.join(',') 
                        : typeof producto.colores === 'string' && producto.colores.trim() !== '' ? producto.colores.trim() 
                        : null,
                acabado: typeof producto.acabado === 'string' && producto.acabado.trim() !== '' ? producto.acabado.trim() : null,
                descripcion: typeof producto.descripcion === 'string' && producto.descripcion.trim() !== '' ? producto.descripcion.trim() : null
            };

            // Skip if we still don't have a valid producto_id (this shouldn't happen now)
            if (!dbProductoData.producto_id) {
                console.warn(`Skipping product - still no producto_id after processing: ${producto.nombre}`);
                continue;
            }
            
            incomingProductoIds.add(dbProductoData.producto_id);

            if (producto.cotizacion_producto_id) {
                const pkId = parseInt(producto.cotizacion_producto_id, 10);
                if (!isNaN(pkId) && currentDbMap.has(pkId)) {
                    // Existing product, prepare for update
                    productsToUpdate.push({ ...dbProductoData, cotizacion_producto_id: pkId });
                    incomingMap.set(pkId, producto);
                } else {
                    // ID provided but not found in DB for this quote? Treat as new insert.
                    console.warn(`Incoming product had cotizacion_producto_id ${pkId} but not found in DB for cotizacion ${cotizacionId}. Treating as new.`);
                    productsToInsert.push(dbProductoData); // Exclude the invalid cotizacion_producto_id
                }
            } else {
                // New product, prepare for insert
                productsToInsert.push(dbProductoData);
            }
        }

        // 3. Identify Deletions
        const idsToDelete = [];
        for (const [pkId, prodId] of currentDbMap.entries()) {
            if (!incomingMap.has(pkId)) {
                idsToDelete.push(pkId);
            }
        }

        // 4. Execute Operations
        // 4a. Deletes
        if (idsToDelete.length > 0) {
            console.log("Deleting products with cotizacion_producto_id:", idsToDelete);
            const { error: deleteError } = await supabase
                .from('cotizacion_productos')
                .delete()
                .in('cotizacion_producto_id', idsToDelete);
            if (deleteError) {
                console.error("Error deleting products:", deleteError);
                // Handle critical error or log and continue?
                return NextResponse.json({ error: "Error al eliminar productos antiguos", details: deleteError.message }, { status: 500 });
            }
        }

        // 4b. Updates
        if (productsToUpdate.length > 0) {
            console.log("Updating products:", productsToUpdate);
            for (const prodToUpdate of productsToUpdate) {
                 const { error: updateProdError } = await supabase
                     .from('cotizacion_productos')
                     .update(prodToUpdate) // Pass the whole object (PK is ignored in SET part)
                     .eq('cotizacion_producto_id', prodToUpdate.cotizacion_producto_id);
                 if (updateProdError) {
                     console.error("Error updating product:", updateProdError, "Data:", prodToUpdate);
                     return NextResponse.json({ error: "Error al actualizar producto existente", details: updateProdError.message }, { status: 500 });
                 }
            }
        }

        // 4c. Inserts
        if (productsToInsert.length > 0) {
            console.log("Inserting new products (one by one):", productsToInsert);
            for (const prodToInsert of productsToInsert) {
                console.log("Attempting insert for:", prodToInsert);
                const { error: insertError } = await supabase
                    .from('cotizacion_productos')
                    .insert(prodToInsert) // Insert individually
                    .select(); // Optionally select to confirm insert

                if (insertError) {
                    console.error("Error inserting new product:", insertError, "Data:", prodToInsert);
                    // Check for specific constraint violations
                    if (insertError.code === '23505') { // Unique constraint violation
                        if (insertError.message.includes('cotizacion_productos_pkey')) {
                           return NextResponse.json({ 
                                error: "Error interno: Conflicto de ID de producto al insertar. Por favor, intente guardar de nuevo.", 
                                details: insertError.message 
                            }, { status: 500 }); // Internal Server Error
                        } else if (insertError.message.includes('cotizacion_productos_cotizacion_id_producto_id_key')) {
                           return NextResponse.json({ 
                               error: "Error: El producto \"" + prodToInsert.nombre + "\" ya existe en esta cotización.", 
                               details: insertError.message 
                           }, { status: 409 }); // Conflict
                        } else {
                           // Other unique constraint?
                            return NextResponse.json({ error: "Error de constraint único al agregar producto", details: insertError.message }, { status: 500 });
                        }
                    } else if (insertError.code === '23503') { // Foreign key violation (e.g., producto_id doesn't exist)
                         return NextResponse.json({ 
                             error: `Error: El producto base con ID ${prodToInsert.producto_id} no existe.`, 
                             details: insertError.message 
                         }, { status: 400 }); // Bad Request
                    }
                     // Generic error for other insert issues
                    return NextResponse.json({ error: "Error al agregar nuevo producto", details: insertError.message }, { status: 500 });
                }
            }
        }

        console.log("Product sync completed.");

    } else {
      console.warn("No productos array received in PUT request for sync.");
    }

    console.log(`Successfully updated cotizacion ${cotizacionId} and processed productos`);
    return NextResponse.json({ 
      success: true, 
      message: 'Cotización y productos actualizados correctamente'
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cotizacionId = parseInt(params.id, 10);

  if (isNaN(cotizacionId)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  try {
    // Delete related cotizacion_productos first due to potential FK constraints
    const { error: productDeleteError } = await supabase
      .from('cotizacion_productos')
      .delete()
      .eq('cotizacion_id', cotizacionId);
      
    if (productDeleteError) {
       console.error('Error deleting cotizacion_productos:', productDeleteError);
       // Decide if you want to proceed or stop here
       // return NextResponse.json({ error: productDeleteError.message || 'Error deleting related products' }, { status: 500 });
    }
    
    // Delete related cotizacion_historial
     const { error: historyDeleteError } = await supabase
       .from('cotizacion_historial')
       .delete()
       .eq('cotizacion_id', cotizacionId);
       
     if (historyDeleteError) {
        console.error('Error deleting cotizacion_historial:', historyDeleteError);
        // Decide if you want to proceed or stop here
     }

    // Now delete the cotización itself
    const { error: cotizacionDeleteError } = await supabase
      .from('cotizaciones')
      .delete()
      .eq('cotizacion_id', cotizacionId);

    if (cotizacionDeleteError) {
      console.error('Error deleting cotizacion:', cotizacionDeleteError);
      // Handle specific errors like FK violation if pagos aren't deleted and RESTRICT is set
      if (cotizacionDeleteError.code === '23503') { // Foreign key violation
         return NextResponse.json({ error: 'Cannot delete cotización due to related records (e.g., payments).' }, { status: 409 });
      }
      return NextResponse.json({ error: cotizacionDeleteError.message || 'Error deleting cotizacion' }, { status: 500 });
    }

    // Successfully deleted (or at least no error reported for the main deletion)
    return NextResponse.json({ message: 'Cotización deleted successfully' }, { status: 200 }); // 200 or 204 No Content

  } catch (err) {
    console.error(`Unexpected error in DELETE /api/cotizaciones/${cotizacionId}:`, err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
