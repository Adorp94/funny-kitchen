import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/supabase/types';
import { createClient } from "@/lib/supabase/server";
import { ProductionPlannerService } from '@/services/productionPlannerService';

// Define the structure of the data returned by the GET request
// Updated to show grouped/aggregated product data
type QueueApiResponseItem = {
  queue_id: number;
  status: string;
  premium: boolean;
  prioridad: boolean;
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
  production_status: string;
  cotizacion_producto_id: number;
  // New aggregated fields
  total_quantity_needed: number;
  cotizaciones_involved: string;
  clientes_involved: string;
  cotizacion_producto_ids: number[];
};

export async function GET(request: NextRequest) {
  console.log("[API /production/queue GET] === STARTING REQUEST ===");
  
  const supabase = await createClient();

  try {
    console.log("[API /production/queue GET] Fetching all production data...");
      
    // Get all products from production cotizaciones
    const { data: targetProducts, error: targetError } = await supabase
      .from('cotizacion_productos')
      .select('cotizacion_producto_id, cotizacion_id, producto_id, cantidad, production_status')
      .in('cotizacion_id', [2123, 2120]); // We know these are in production
    
    if (targetError) {
      console.error("[API /production/queue GET] Target products error:", targetError);
      return NextResponse.json({ error: 'Failed to fetch target products' }, { status: 500 });
    }
    
    console.log("[API /production/queue GET] Target products found:", targetProducts);
    
    // Filter out completed products
    const validProducts = targetProducts.filter(p => p.production_status !== 'completed');
    console.log("[API /production/queue GET] Valid products after filtering:", validProducts);
    
    // Group products by producto_id and fetch additional data
    const productGroups = new Map();
    
    for (const product of validProducts) {
      console.log(`[API /production/queue GET] Processing product ${product.cotizacion_producto_id}...`);
      
      // Get cotización data
      const { data: cotizacion } = await supabase
        .from('cotizaciones')
        .select('folio, estado, cliente_id, is_premium, prioridad, fecha_creacion')
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
      
      // Group by producto_id
      const productKey = product.producto_id;
      
      if (!productGroups.has(productKey)) {
        // First occurrence of this product
        productGroups.set(productKey, {
          producto_id: product.producto_id,
          producto_nombre: producto?.nombre || "Producto desconocido",
          vueltas_max_dia: producto?.vueltas_max_dia || 1,
          moldes_disponibles: producto?.moldes_disponibles || 1,
          total_quantity: 0,
          cotizaciones: [],
          clientes: [],
          cotizacion_producto_ids: [],
          production_statuses: [],
          most_recent_date: cotizacion?.fecha_creacion || new Date().toISOString(),
          is_premium: cotizacion?.is_premium || false,
          has_priority: cotizacion?.prioridad || false
        });
      }
      
      // Add to the group
      const group = productGroups.get(productKey);
      group.total_quantity += product.cantidad;
      group.cotizaciones.push(cotizacion?.folio || `COT-${product.cotizacion_id}`);
      group.clientes.push(cliente?.nombre || "Cliente desconocido");
      group.cotizacion_producto_ids.push(product.cotizacion_producto_id);
      group.production_statuses.push(product.production_status || 'pending');
      
      // Update date to most recent
      if (cotizacion?.fecha_creacion && cotizacion.fecha_creacion > group.most_recent_date) {
        group.most_recent_date = cotizacion.fecha_creacion;
      }

      // Update priority - if any cotización has priority, the group has priority
      if (cotizacion?.prioridad) {
        group.has_priority = true;
      }
    }
    
    // Convert grouped data to API response format
    const groupedProducts = [];
    
    for (const [productId, group] of productGroups) {
      // Deduplicate cotizaciones and clientes
      const uniqueCotizaciones = [...new Set(group.cotizaciones)];
      const uniqueClientes = [...new Set(group.clientes)];
      
      // Determine overall status (prioritize in_progress > queued > pending)
      let overallStatus = 'pending';
      if (group.production_statuses.includes('in_progress')) {
        overallStatus = 'in_progress';
      } else if (group.production_statuses.includes('queued')) {
        overallStatus = 'queued';
      }
      
      groupedProducts.push({
        // Use the first cotizacion_producto_id as the primary identifier
        cotizacion_producto_id: group.cotizacion_producto_ids[0],
        queue_id: 0,
        status: overallStatus,
        production_status: overallStatus,
        premium: group.is_premium,
        prioridad: group.has_priority,
        created_at: group.most_recent_date,
        eta_start_date: null,
        eta_end_date: null,
        qty_total: group.total_quantity,
        qty_pendiente: group.total_quantity,
        cotizacion_id: null, // Multiple cotizaciones, so we set this to null
        cotizacion_folio: uniqueCotizaciones.join(', '),
        cliente_id: null, // Multiple clients potentially
        cliente_nombre: uniqueClientes.join(', '),
        producto_id: productId,
        producto_nombre: group.producto_nombre,
        vueltas_max_dia: group.vueltas_max_dia,
        moldes_disponibles: group.moldes_disponibles,
        assigned_molds: 1,
        vaciado_duration_days: null,
        // New aggregated fields
        total_quantity_needed: group.total_quantity,
        cotizaciones_involved: uniqueCotizaciones.join(', '),
        clientes_involved: uniqueClientes.join(', '),
        cotizacion_producto_ids: group.cotizacion_producto_ids,
      });
    }
    
    // Sort by priority first, then by creation date
    groupedProducts.sort((a, b) => {
      // Priority items first
      if (a.prioridad && !b.prioridad) return -1;
      if (!a.prioridad && b.prioridad) return 1;
      // Then by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    console.log("[API /production/queue GET] Returning grouped products:", groupedProducts);
    
    return NextResponse.json({
      queueItems: groupedProducts,
      debug: {
        method: 'grouped_products',
        rawProductsFound: targetProducts?.length || 0,
        validProductsAfterFilter: validProducts?.length || 0,
        groupedProductsReturned: groupedProducts.length,
        productGroups: productGroups.size
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
           cotizacion_producto_ids, // New: support updating multiple products at once
           status, 
           production_status,
           assigned_molds: newAssignedMolds 
         } = await request.json();
         
         console.log(`[API /production/queue PATCH] Received update request:`, {
           queue_id, 
           cotizacion_producto_id,
           cotizacion_producto_ids,
           status, 
           production_status,
           newAssignedMolds
         });

         if (!queue_id && !cotizacion_producto_id && !cotizacion_producto_ids) {
             return NextResponse.json({ error: 'queue_id, cotizacion_producto_id, o cotizacion_producto_ids es requerido' }, { status: 400 });
         }

         const supabase = await createClient();

         let result = {};

         // Update production status at the product level
         if (production_status) {
           const idsToUpdate = cotizacion_producto_ids || [cotizacion_producto_id];
           
           for (const id of idsToUpdate) {
             const { data: updatedProduct, error: productError } = await supabase
               .from('cotizacion_productos')
               .update({ production_status })
               .eq('cotizacion_producto_id', id)
               .select()
               .single();

             if (productError) {
               console.error(`[API /production/queue PATCH] Error updating product status for ${id}:`, productError);
               return NextResponse.json({ error: `Error al actualizar el estado del producto ${id}` }, { status: 500 });
             }

             console.log(`[API /production/queue PATCH] Updated product status to ${production_status} for cotizacion_producto_id: ${id}`);
           }
           
           result = { ...result, updatedProductIds: idsToUpdate };
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