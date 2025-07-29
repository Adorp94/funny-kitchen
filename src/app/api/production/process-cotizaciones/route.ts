import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface CotizacionProduct {
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  has_moldes: boolean;
  inventory_status?: {
    terminado_disponible: number;
    availability: 'sufficient' | 'partial' | 'none';
    can_skip_production: boolean;
    production_needed: number;
  };
}

interface CotizacionToProcess {
  folio: string;
  cliente: string;
  productos: CotizacionProduct[];
}

interface ProcessingResult {
  folio: string;
  success: boolean;
  products_processed: number;
  routed_to_empaque: number;
  routed_to_bitacora: number;
  needs_moldes: string[];
  error?: string;
}

export async function POST(request: NextRequest) {
  console.log("[API /production/process-cotizaciones POST] === STARTING REQUEST ===");
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
        remove: (name: string, options: any) => cookieStore.set(name, '', { ...options, maxAge: 0 }),
      },
    }
  );

  try {
    const body = await request.json();
    const { cotizaciones } = body as { cotizaciones: CotizacionToProcess[] };

    console.log("[API] Processing cotizaciones:", cotizaciones.length);

    if (!cotizaciones || !Array.isArray(cotizaciones)) {
      return NextResponse.json(
        { error: 'Invalid cotizaciones data' },
        { status: 400 }
      );
    }

    const results: ProcessingResult[] = [];

    // Process each cotizacion
    for (const cotizacion of cotizaciones) {
      console.log(`[API] Processing cotizacion ${cotizacion.folio}`);
      
      const cotizacionId = parseInt(cotizacion.folio.split('-')[2]);
      let productsProcessed = 0;
      let routedToEmpaque = 0;
      let routedToBitacora = 0;
      const needsMoldes: string[] = [];
      let hasError = false;
      let errorMessage = '';

      try {
        // Check if cotizacion is premium for priority handling
        const { data: cotizacionData, error: cotizacionError } = await supabase
          .from('cotizaciones')
          .select('is_premium, prioridad')
          .eq('cotizacion_id', cotizacionId)
          .single();

        const isPremium = cotizacionData?.is_premium || cotizacionData?.prioridad || false;

        // Process each product in the cotizacion
        for (const producto of cotizacion.productos) {
          try {
            productsProcessed++;

            // Track products that need moldes
            if (!producto.has_moldes) {
              needsMoldes.push(producto.producto_nombre);
            }

            // Smart routing based on inventory status
            if (producto.inventory_status?.can_skip_production) {
              // Route to empaque (has sufficient surplus inventory)
              await routeToEmpaque(supabase, cotizacionId, producto);
              routedToEmpaque++;
              
              console.log(`[API] ${producto.producto_nombre} routed to empaque (surplus available)`);

            } else {
              // Route to bitacora for production
              await routeToBitacora(supabase, cotizacionId, producto, isPremium);
              routedToBitacora++;
              
              console.log(`[API] ${producto.producto_nombre} routed to bitacora (needs production)`);
            }

          } catch (productError: any) {
            console.error(`[API] Error processing product ${producto.producto_nombre}:`, productError);
            hasError = true;
            errorMessage = productError.message;
          }
        }

        results.push({
          folio: cotizacion.folio,
          success: !hasError,
          products_processed: productsProcessed,
          routed_to_empaque: routedToEmpaque,
          routed_to_bitacora: routedToBitacora,
          needs_moldes: needsMoldes,
          error: hasError ? errorMessage : undefined
        });

      } catch (cotizacionError: any) {
        console.error(`[API] Error processing cotizacion ${cotizacion.folio}:`, cotizacionError);
        results.push({
          folio: cotizacion.folio,
          success: false,
          products_processed: 0,
          routed_to_empaque: 0,
          routed_to_bitacora: 0,
          needs_moldes: [],
          error: cotizacionError.message
        });
      }
    }

    // Update moldes needed tracking
    await updateMoldesNeeded(supabase, results);

    console.log("[API /production/process-cotizaciones POST] Results:", results);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total_cotizaciones: cotizaciones.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        total_products: results.reduce((sum, r) => sum + r.products_processed, 0),
        total_to_empaque: results.reduce((sum, r) => sum + r.routed_to_empaque, 0),
        total_to_bitacora: results.reduce((sum, r) => sum + r.routed_to_bitacora, 0)
      }
    });

  } catch (error) {
    console.error('[API /production/process-cotizaciones POST] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Route product to empaque (using surplus inventory)
async function routeToEmpaque(supabase: any, cotizacionId: number, producto: CotizacionProduct) {
  // Create allocation record in empaque stage
  const { error: allocationError } = await supabase
    .from('production_allocations')
    .insert({
      producto_id: producto.producto_id,
      cotizacion_id: cotizacionId,
      cantidad_asignada: producto.cantidad,
      stage: 'empaque',
      notas: `Enviado directo a empaque - inventario surplus disponible`
    });

  if (allocationError) {
    throw new Error(`Error creating empaque allocation: ${allocationError.message}`);
  }

  // Update surplus inventory (reduce terminado by allocated amount)
  // First get current terminado value
  const { data: currentData, error: fetchError } = await supabase
    .from('production_active')
    .select('terminado')
    .eq('producto_id', producto.producto_id)
    .single();

  if (fetchError) {
    throw new Error(`Error fetching current terminado: ${fetchError.message}`);
  }

  const newTerminado = Math.max(0, (currentData?.terminado || 0) - producto.cantidad);
  
  const { error: updateError } = await supabase
    .from('production_active')
    .update({
      terminado: newTerminado,
      updated_at: new Date().toISOString()
    })
    .eq('producto_id', producto.producto_id);

  if (updateError) {
    throw new Error(`Error updating surplus inventory: ${updateError.message}`);
  }
}

// Route product to bitacora (needs production)
async function routeToBitacora(supabase: any, cotizacionId: number, producto: CotizacionProduct, isPremium: boolean) {
  // Find the cotizacion_producto_id
  const { data: cotizacionProducto, error: cpError } = await supabase
    .from('cotizacion_productos')
    .select('cotizacion_producto_id')
    .eq('cotizacion_id', cotizacionId)
    .eq('producto_id', producto.producto_id)
    .single();

  if (cpError || !cotizacionProducto) {
    throw new Error(`Could not find cotizacion_producto record: ${cpError?.message || 'Not found'}`);
  }

  // Add to production queue (bitacora)
  const { error: queueError } = await supabase
    .from('production_queue')
    .insert({
      cotizacion_producto_id: cotizacionProducto.cotizacion_producto_id,
      producto_id: producto.producto_id,
      qty_total: producto.cantidad,
      qty_pendiente: producto.cantidad,
      premium: isPremium,
      status: 'queued'
    });

  if (queueError) {
    throw new Error(`Error adding to production queue: ${queueError.message}`);
  }

  // Update production_active quantities following the same pattern as ProductionPlannerService
  // First check if product already exists
  const { data: existingActive, error: checkError } = await supabase
    .from('production_active')
    .select('pedidos')
    .eq('producto_id', producto.producto_id)
    .single();

  let updateError;
  if (checkError && checkError.code === 'PGRST116') {
    // Product doesn't exist, create new
    const { error } = await supabase
      .from('production_active')
      .insert({
        producto_id: producto.producto_id,
        pedidos: producto.cantidad,
        por_detallar: 0,
        detallado: 0,
        sancocho: 0,
        terminado: 0,
        updated_at: new Date().toISOString()
      });
    updateError = error;
  } else if (!checkError && existingActive) {
    // Product exists, add to existing pedidos
    const newPedidos = existingActive.pedidos + producto.cantidad;
    const { error } = await supabase
      .from('production_active')
      .update({
        pedidos: newPedidos,
        updated_at: new Date().toISOString()
      })
      .eq('producto_id', producto.producto_id);
    updateError = error;
  } else {
    updateError = checkError;
  }

  if (updateError) {
    throw new Error(`Error updating production_active: ${updateError.message}`);
  }
}

// Update moldes needed tracking
async function updateMoldesNeeded(supabase: any, results: ProcessingResult[]) {
  const moldesNeededEntries: any[] = [];

  results.forEach(result => {
    result.needs_moldes.forEach(productoNombre => {
      moldesNeededEntries.push({
        cotizacion_folio: result.folio,
        producto_nombre: productoNombre,
        status: 'needed',
        created_at: new Date().toISOString()
      });
    });
  });

  if (moldesNeededEntries.length > 0) {
    try {
      // Create or update moldes_needed table
      const { error } = await supabase
        .from('moldes_needed')
        .upsert(moldesNeededEntries, {
          onConflict: 'cotizacion_folio,producto_nombre'
        });

      if (error) {
        console.error('Error updating moldes needed tracking:', error);
        // Check if table doesn't exist
        if (error.message.includes('relation "moldes_needed" does not exist')) {
          console.warn('moldes_needed table does not exist. Please run migration 007_create_moldes_needed_table.sql');
        }
        // Don't throw error as this is not critical for the main workflow
      } else {
        console.log(`Successfully tracked ${moldesNeededEntries.length} moldes needed entries`);
      }
    } catch (err) {
      console.error('Unexpected error in moldes needed tracking:', err);
      // Don't throw - this is not critical for the main workflow
    }
  }
}