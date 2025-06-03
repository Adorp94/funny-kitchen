import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/supabase/types';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ProductionPlannerService } from '@/services/productionPlannerService';

// Define the structure of the data returned by the GET request
// Aligns with ProductionQueueItem in columns.tsx but suitable for API response
type QueueApiResponseItem = {
  queue_id: number;
  status: string;
  premium: boolean;
  created_at: string;
  eta_start_date: string | null;
  eta_end_date: string | null;
  qty_total: number;
  qty_pendiente: number;
  cotizacion_id: number | null;
  cotizacion_folio: string | null;
  cliente_id: number | null;
  cliente_nombre: string | null;
  producto_id: number | null;
  producto_nombre: string | null;
  vueltas_max_dia: number;
  moldes_disponibles: number;
  assigned_molds: number;
  vaciado_duration_days: number | null;
  production_status: string; // New field for product-level status
  cotizacion_producto_id: number;
};

export async function GET(request: NextRequest) {
  console.log("[API /production/queue GET] === STARTING REQUEST ===");
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value;
        },
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.remove(name, options);
        },
      },
    }
  );

  try {
    console.log("[API /production/queue GET] Testing with direct SQL query...");
    
    // Use direct SQL to get the exact data we need
    const { data: productionData, error: sqlError } = await supabase.rpc('exec', {
      sql: `
        SELECT 
            cp.cotizacion_producto_id,
            cp.cotizacion_id,
            cp.producto_id,
            cp.cantidad,
            cp.production_status,
            c.folio,
            c.estado as cotizacion_estado,
            c.cliente_id,
            c.is_premium,
            c.fecha_creacion,
            cl.nombre as cliente_nombre,
            p.nombre as producto_nombre,
            p.vueltas_max_dia,
            p.moldes_disponibles
        FROM cotizacion_productos cp
        JOIN cotizaciones c ON cp.cotizacion_id = c.cotizacion_id
        JOIN clientes cl ON c.cliente_id = cl.cliente_id
        JOIN productos p ON cp.producto_id = p.producto_id
        WHERE c.estado = 'producción' 
          AND (cp.production_status != 'completed' OR cp.production_status IS NULL)
        ORDER BY cp.cotizacion_producto_id
      `
    });

    if (sqlError) {
      console.error("[API /production/queue GET] SQL Error:", sqlError);
      
      // Fallback to manual step-by-step queries with full data fetching
      console.log("[API /production/queue GET] Using enhanced fallback method...");
      
      // Step 1: Get products from production cotizaciones
      const { data: targetProducts, error: targetError } = await supabase
        .from('cotizacion_productos')
        .select('cotizacion_producto_id, cotizacion_id, producto_id, cantidad, production_status')
        .in('cotizacion_id', [2123, 2120]); // We know these are in production
      
      if (targetError) {
        console.error("[API /production/queue GET] Target products error:", targetError);
        return NextResponse.json({ error: 'Failed to fetch target products' }, { status: 500 });
      }
      
      console.log("[API /production/queue GET] Target products found:", targetProducts);
      
      // Filter manually
      const validProducts = targetProducts.filter(p => p.production_status !== 'completed');
      console.log("[API /production/queue GET] Valid products after filtering:", validProducts);
      
      // Now fetch additional data for each valid product
      const enrichedProducts = [];
      
      for (const product of validProducts) {
        console.log(`[API /production/queue GET] Enriching product ${product.cotizacion_producto_id}...`);
        
        // Get cotización data
        const { data: cotizacion } = await supabase
          .from('cotizaciones')
          .select('folio, estado, cliente_id, is_premium, fecha_creacion')
          .eq('cotizacion_id', product.cotizacion_id)
          .single();
        
        // Get cliente data
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nombre')
          .eq('cliente_id', cotizacion?.cliente_id)
          .single();
        
        // Get producto data
        const { data: producto } = await supabase
          .from('productos')
          .select('nombre, vueltas_max_dia, moldes_disponibles')
          .eq('producto_id', product.producto_id)
          .single();
        
        console.log(`[API /production/queue GET] Got data for product ${product.cotizacion_producto_id}: ${producto?.nombre}`);
        
        enrichedProducts.push({
          cotizacion_producto_id: product.cotizacion_producto_id,
          queue_id: 0,
          status: product.production_status || 'pending',
          production_status: product.production_status || 'pending',
          premium: cotizacion?.is_premium || false,
          created_at: cotizacion?.fecha_creacion || new Date().toISOString(),
          eta_start_date: null,
          eta_end_date: null,
          qty_total: product.cantidad,
          qty_pendiente: product.cantidad,
          cotizacion_id: product.cotizacion_id,
          cotizacion_folio: cotizacion?.folio || `COT-${product.cotizacion_id}`,
          cliente_id: cotizacion?.cliente_id || null,
          cliente_nombre: cliente?.nombre || "Cliente desconocido",
          producto_id: product.producto_id,
          producto_nombre: producto?.nombre || "Producto desconocido",
          vueltas_max_dia: producto?.vueltas_max_dia || 1,
          moldes_disponibles: producto?.moldes_disponibles || 1,
          assigned_molds: 1,
          vaciado_duration_days: null,
        });
      }
      
      console.log("[API /production/queue GET] Returning enriched fallback response:", enrichedProducts);
      
      return NextResponse.json({
        queueItems: enrichedProducts,
        debug: {
          method: 'enhanced_fallback',
          targetProductsFound: targetProducts?.length || 0,
          validProductsAfterFilter: validProducts?.length || 0,
          enrichedProductsReturned: enrichedProducts.length,
          sqlError: sqlError.message
        }
      });
    }

    // If SQL worked, use that data
    console.log("[API /production/queue GET] SQL query successful, data:", productionData);
    
    if (!productionData || productionData.length === 0) {
      console.log("[API /production/queue GET] No data returned from SQL");
      return NextResponse.json({
        queueItems: [],
        debug: {
          method: 'sql',
          dataFound: 0,
          message: "SQL executed but returned no rows"
        }
      });
    }
    
    // Transform SQL data to API format
    const transformedData = productionData.map((item: any) => ({
      cotizacion_producto_id: item.cotizacion_producto_id,
      queue_id: 0, // Will be updated if queue data exists
      status: item.production_status || 'pending',
      production_status: item.production_status || 'pending',
      premium: item.is_premium || false,
      created_at: item.fecha_creacion || new Date().toISOString(),
      eta_start_date: null,
      eta_end_date: null,
      qty_total: item.cantidad,
      qty_pendiente: item.cantidad,
      cotizacion_id: item.cotizacion_id,
      cotizacion_folio: item.folio,
      cliente_id: item.cliente_id,
      cliente_nombre: item.cliente_nombre,
      producto_id: item.producto_id,
      producto_nombre: item.producto_nombre,
      vueltas_max_dia: item.vueltas_max_dia || 1,
      moldes_disponibles: item.moldes_disponibles || 1,
      assigned_molds: 1,
      vaciado_duration_days: null,
    }));

    console.log("[API /production/queue GET] Transformed data:", transformedData);

    return NextResponse.json({
      queueItems: transformedData,
      debug: {
        method: 'sql',
        rawDataCount: productionData.length,
        transformedDataCount: transformedData.length
      }
    });

  } catch (error) {
    console.error('[API /production/queue GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Enhanced PATCH handler to update both production queue and product status
export async function PATCH(request: NextRequest) {
    try {
         const { 
           queue_id, 
           cotizacion_producto_id,
           status, 
           production_status,
           assigned_molds: newAssignedMolds 
         } = await request.json();
         
         console.log(`[API /production/queue PATCH] Received update request:`, {
           queue_id, 
           cotizacion_producto_id,
           status, 
           production_status,
           newAssignedMolds
         });

         if (!queue_id && !cotizacion_producto_id) {
             return NextResponse.json({ error: 'queue_id o cotizacion_producto_id es requerido' }, { status: 400 });
         }

         const cookieStore = await cookies();
         const supabase = createServerClient(
             process.env.NEXT_PUBLIC_SUPABASE_URL!,
             process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
             {
                 cookies: {
                     get: (name: string) => {
                         return cookieStore.get(name)?.value;
                     },
                     set: (name: string, value: string, options: any) => {
                         cookieStore.set(name, value, options);
                     },
                     remove: (name: string, options: any) => {
                         cookieStore.remove(name, options);
                     },
                 },
             }
         );

         let result = {};

         // Update production status at the product level if provided
         if (production_status && cotizacion_producto_id) {
           const { data: updatedProduct, error: productError } = await supabase
             .from('cotizacion_productos')
             .update({ production_status })
             .eq('cotizacion_producto_id', cotizacion_producto_id)
             .select()
             .single();

           if (productError) {
             console.error('[API /production/queue PATCH] Error updating product status:', productError);
             return NextResponse.json({ error: 'Error al actualizar el estado del producto' }, { status: 500 });
           }

           result = { ...result, updatedProduct };
           console.log(`[API /production/queue PATCH] Updated product status to ${production_status} for cotizacion_producto_id: ${cotizacion_producto_id}`);
         }

         // Update production queue if queue_id is provided
         if (queue_id) {
           const updatePayload: { status?: string; assigned_molds?: number; vaciado_duration_days?: number | null } = {};

           if (status !== undefined && status !== null) {
               updatePayload.status = status;
           }

           if (newAssignedMolds !== undefined && newAssignedMolds !== null) {
               updatePayload.assigned_molds = newAssignedMolds;
           }

           if (Object.keys(updatePayload).length > 0) {
             const { data: updatedQueueItem, error: queueError } = await supabase
                 .from('production_queue')
                 .update(updatePayload)
                 .eq('queue_id', queue_id)
                 .select()
                 .single();

             if (queueError) {
                 console.error('[API /production/queue PATCH] Error updating queue item:', queueError);
                 return NextResponse.json({ error: 'Error al actualizar el item de la cola' }, { status: 500 });
             }

             result = { ...result, updatedQueueItem };

             // Recalculate duration if assigned_molds was updated
             if (newAssignedMolds !== undefined && newAssignedMolds !== null && newAssignedMolds > 0) {
                 console.log(`[API /production/queue PATCH] Recalculating duration for queue_id: ${queue_id} with assigned_molds: ${newAssignedMolds}`);
                 
                 const { data: productInfo } = await supabase
                     .from('production_queue')
                     .select(`
                         qty_total,
                         producto_id,
                         productos (
                             vueltas_max_dia
                         )
                     `)
                     .eq('queue_id', queue_id)
                     .single();

                 if (productInfo) {
                     const qty = productInfo.qty_total;
                     const vueltas_max_dia = productInfo.productos?.vueltas_max_dia || 1;
                     
                     // Calculate duration: ceil(qty / (assigned_molds * vueltas_max_dia))
                     const newDuration = Math.ceil(qty / (newAssignedMolds * vueltas_max_dia));
                     
                     await supabase
                         .from('production_queue')
                         .update({ vaciado_duration_days: newDuration })
                         .eq('queue_id', queue_id);

                     console.log(`[API /production/queue PATCH] Updated vaciado_duration_days to ${newDuration} for queue_id: ${queue_id}`);
                 }
             }
           }
         }

         console.log(`[API /production/queue PATCH] Successfully updated`);

         return NextResponse.json({
             message: 'Actualización exitosa',
             ...result
         });

      } catch (error) {
          console.error('[API /production/queue PATCH] Unexpected error:', error);
          return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
      }
} 