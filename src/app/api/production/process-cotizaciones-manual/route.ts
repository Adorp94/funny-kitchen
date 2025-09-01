import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

interface ManualAllocationProduct {
  folio: string;
  producto_id: number;
  producto_nombre: string;
  cantidad_necesaria: number;
  inventario_disponible: number;
  cantidad_a_empaque: number;
  ir_a_empaque: boolean;
}

interface CotizacionProductForBitacora {
  folio: string;
  producto_id: number;
  producto_nombre: string;
  cantidad_total: number;
  cantidad_selected: number;
  has_moldes: boolean;
}

interface ManualAllocationData {
  cotizaciones: Array<{
    folio: string;
    cliente: string;
    productos: Array<{
      producto_id: number;
      producto_nombre: string;
      cantidad: number;
      has_moldes: boolean;
    }>;
  }>;
  productsWithInventory: ManualAllocationProduct[];
  canSkipProduction: number;
  needsProduction: number;
}

interface ProcessingResult {
  folio: string;
  success: boolean;
  products_processed: number;
  routed_to_empaque: number;
  routed_to_bitacora: number;
  empaque_allocations: Array<{
    producto_nombre: string;
    cantidad: number;
  }>;
  needs_moldes: string[];
  error?: string;
}

export async function POST(request: NextRequest) {
  console.log("[API /production/process-cotizaciones-manual POST] === STARTING MANUAL ALLOCATION REQUEST ===");
  
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { allocationData } = body as { allocationData: ManualAllocationData };

    console.log("[API] Processing manual allocation data:", {
      cotizaciones: allocationData.cotizaciones.length,
      productsWithInventory: allocationData.productsWithInventory.length
    });

    if (!allocationData || !allocationData.cotizaciones) {
      return NextResponse.json(
        { error: 'Invalid allocation data' },
        { status: 400 }
      );
    }

    const results: ProcessingResult[] = [];

    // Step 1: Process manual empaque allocations first
    const empaqueAllocations: Array<{
      folio: string; 
      producto_id: number; 
      producto_nombre: string; 
      cantidad: number;
    }> = [];

    for (const product of allocationData.productsWithInventory) {
      if (product.ir_a_empaque && product.cantidad_a_empaque > 0) {
        empaqueAllocations.push({
          folio: product.folio,
          producto_id: product.producto_id,
          producto_nombre: product.producto_nombre,
          cantidad: product.cantidad_a_empaque
        });
      }
    }

    console.log("[API] Manual empaque allocations:", empaqueAllocations.length);

    // Step 2: Process empaque allocations
    for (const allocation of empaqueAllocations) {
      try {
        // Get cotizacion_id from folio
        const { data: cotizacionData, error: cotizacionError } = await supabase
          .from('cotizaciones')
          .select('cotizacion_id')
          .eq('folio', allocation.folio)
          .single();

        if (cotizacionError || !cotizacionData) {
          console.error(`[API] Error finding cotizacion for folio ${allocation.folio}:`, cotizacionError);
          continue;
        }

        // First, check current terminado stock and subtract from it
        const { data: productionStatus, error: statusError } = await supabase
          .from('production_active')
          .select('terminado')
          .eq('producto_id', allocation.producto_id)
          .single();

        if (statusError || !productionStatus) {
          console.error(`[API] Error fetching production status for ${allocation.producto_nombre}:`, statusError);
          continue;
        }

        if (productionStatus.terminado < allocation.cantidad) {
          console.error(`[API] Insufficient terminado stock for ${allocation.producto_nombre}: has ${productionStatus.terminado}, needs ${allocation.cantidad}`);
          continue;
        }

        // Update production_active to decrease terminado
        const { error: updateStatusError } = await supabase
          .from('production_active')
          .update({ 
            terminado: productionStatus.terminado - allocation.cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('producto_id', allocation.producto_id);

        if (updateStatusError) {
          console.error(`[API] Error updating production status for ${allocation.producto_nombre}:`, updateStatusError);
          continue;
        }

        // Create empaque allocation
        const { error: empaqueError } = await supabase
          .from('production_allocations')
          .insert({
            cotizacion_id: cotizacionData.cotizacion_id,
            producto_id: allocation.producto_id,
            cantidad_asignada: allocation.cantidad,
            stage: 'empaque',
            fecha_asignacion: new Date().toISOString(),
            notas: `Asignación manual desde pedidos - ${allocation.cantidad} productos movidos de terminado a empaque`
          });

        if (empaqueError) {
          console.error(`[API] Error creating empaque allocation for ${allocation.producto_nombre}:`, empaqueError);
          // Rollback: restore terminado count
          await supabase
            .from('production_active')
            .update({ terminado: productionStatus.terminado })
            .eq('producto_id', allocation.producto_id);
        } else {
          console.log(`[API] Successfully moved ${allocation.cantidad} ${allocation.producto_nombre} from terminado to empaque for ${allocation.folio}`);
        }

      } catch (error: any) {
        console.error(`[API] Error processing empaque allocation for ${allocation.producto_nombre}:`, error);
      }
    }

    // Step 3: Process cotizaciones and route remaining products to bitácora
    for (const cotizacion of allocationData.cotizaciones) {
      console.log(`[API] Processing cotizacion ${cotizacion.folio}`);
      
      let productsProcessed = 0;
      let routedToEmpaque = 0;
      let routedToBitacora = 0;
      const needsMoldes: string[] = [];
      const empaqueAllocationsForCotizacion: Array<{producto_nombre: string; cantidad: number}> = [];
      let hasError = false;
      let errorMessage = '';

      try {
        // Get cotizacion_id
        const { data: cotizacionData, error: cotizacionError } = await supabase
          .from('cotizaciones')
          .select('cotizacion_id, is_premium, prioridad')
          .eq('folio', cotizacion.folio)
          .single();

        if (cotizacionError || !cotizacionData) {
          throw new Error(`Could not find cotizacion ${cotizacion.folio}`);
        }

        const cotizacionId = cotizacionData.cotizacion_id;
        const isPremium = cotizacionData.is_premium || cotizacionData.prioridad || false;

        // Process each product in the cotizacion
        for (const producto of cotizacion.productos) {
          try {
            productsProcessed++;

            // Check if this product has a manual empaque allocation
            const empaqueAllocation = empaqueAllocations.find(
              a => a.folio === cotizacion.folio && a.producto_id === producto.producto_id
            );

            if (empaqueAllocation) {
              routedToEmpaque++;
              empaqueAllocationsForCotizacion.push({
                producto_nombre: producto.producto_nombre,
                cantidad: empaqueAllocation.cantidad
              });
              console.log(`[API] ${producto.producto_nombre} has manual empaque allocation: ${empaqueAllocation.cantidad}`);
            }

            // Calculate remaining quantity that needs production
            const cantidadEmpaque = empaqueAllocation?.cantidad || 0;
            const cantidadParaBitacora = producto.cantidad - cantidadEmpaque;

            if (cantidadParaBitacora > 0) {
              // Route remaining quantity to bitacora for production
              if (!producto.has_moldes) {
                needsMoldes.push(producto.producto_nombre);
              }

              // Get cotizacion_producto_id
              const { data: cpData, error: cpError } = await supabase
                .from('cotizacion_productos')
                .select('cotizacion_producto_id')
                .eq('cotizacion_id', cotizacionId)
                .eq('producto_id', producto.producto_id)
                .single();

              if (cpError || !cpData) {
                throw new Error(`Could not find cotizacion_producto for ${producto.producto_nombre}`);
              }

              // Add to production queue
              const { error: queueError } = await supabase
                .from('production_queue')
                .insert({
                  cotizacion_producto_id: cpData.cotizacion_producto_id,
                  producto_id: producto.producto_id,
                  qty_total: cantidadParaBitacora,
                  qty_pendiente: cantidadParaBitacora,
                  status: 'queued',
                  premium: isPremium
                });

              if (queueError) {
                console.error(`[API] Error adding ${producto.producto_nombre} to production queue:`, queueError);
                throw new Error(`Failed to add ${producto.producto_nombre} to production queue`);
              }

              routedToBitacora++;
              console.log(`[API] ${producto.producto_nombre} routed to bitacora: ${cantidadParaBitacora} units`);
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
          empaque_allocations: empaqueAllocationsForCotizacion,
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
          empaque_allocations: [],
          needs_moldes: [],
          error: cotizacionError.message
        });
      }
    }

    console.log("[API /production/process-cotizaciones-manual POST] Results:", results);

    // Calculate summary
    const summary = {
      total_cotizaciones: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total_products: results.reduce((sum, r) => sum + r.products_processed, 0),
      total_to_empaque: results.reduce((sum, r) => sum + r.routed_to_empaque, 0),
      total_to_bitacora: results.reduce((sum, r) => sum + r.routed_to_bitacora, 0),
      total_empaque_allocations: empaqueAllocations.length,
      total_needs_moldes: [...new Set(results.flatMap(r => r.needs_moldes))].length
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
      empaque_allocations: empaqueAllocations
    });

  } catch (error: any) {
    console.error('[API /production/process-cotizaciones-manual POST] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}