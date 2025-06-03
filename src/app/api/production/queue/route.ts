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
};

export async function GET(request: NextRequest) {
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
    console.log("[API /production/queue GET] Received request");

    // TODO: Add pagination, sorting, filtering based on URL search params
    // Example: const { searchParams } = request.nextUrl;
    // const page = parseInt(searchParams.get('page') || '1', 10);
    // const limit = parseInt(searchParams.get('limit') || '10', 10);
    // const offset = (page - 1) * limit;
    // const sortBy = searchParams.get('sortBy') || 'created_at';
    // const sortOrder = searchParams.get('sortOrder') === 'desc' ? false : true;
    // const filterStatus = searchParams.get('status');

    // Get all production queue data with a direct SQL query for better performance
    const { data, error, count } = await supabase.rpc('get_production_queue_with_details');

    if (error) {
      console.error("[API /production/queue GET] Error fetching queue:", error);
      
      // Fallback to multiple queries approach
      const { data: queueData, error: queueError } = await supabase
        .from('production_queue')
        .select(`
          queue_id,
          status,
          premium,
          created_at,
          eta_start_date,
          eta_end_date,
          qty_total,
          qty_pendiente,
          vaciado_duration_days,
          assigned_molds,
          cotizacion_producto_id,
          producto_id
        `)
        .order('premium', { ascending: false })
        .order('created_at', { ascending: true });

      if (queueError) {
        return NextResponse.json({ error: 'Error al obtener la cola de producción' }, { status: 500 });
      }

      // Transform data using individual queries
      const transformedData: QueueApiResponseItem[] = [];
      
      for (const item of queueData) {
        // Get cotizacion and cliente info
        const { data: cotizacionData } = await supabase
          .from('cotizacion_productos')
          .select(`
            cotizacion_id,
            cotizaciones (
              folio,
              cliente_id,
              clientes (
                nombre
              )
            )
          `)
          .eq('cotizacion_producto_id', item.cotizacion_producto_id)
          .single();

        // Get product info
        const { data: productData } = await supabase
          .from('productos')
          .select('nombre, vueltas_max_dia, moldes_disponibles')
          .eq('producto_id', item.producto_id)
          .single();

        const cotizacion = cotizacionData?.cotizaciones;
        const cliente = cotizacion?.clientes;

        transformedData.push({
          queue_id: item.queue_id,
          status: item.status,
          premium: item.premium,
          created_at: item.created_at,
          eta_start_date: item.eta_start_date,
          eta_end_date: item.eta_end_date,
          qty_total: item.qty_total,
          qty_pendiente: item.qty_pendiente,
          cotizacion_id: cotizacion?.cotizacion_id ?? null,
          cotizacion_folio: cotizacion?.folio ?? null,
          cliente_id: cliente?.cliente_id ?? null,
          cliente_nombre: cliente?.nombre ?? null,
          producto_id: item.producto_id,
          producto_nombre: productData?.nombre ?? null,
          vueltas_max_dia: productData?.vueltas_max_dia ?? 1,
          moldes_disponibles: productData?.moldes_disponibles ?? 1,
          assigned_molds: item.assigned_molds ?? 1,
          vaciado_duration_days: item.vaciado_duration_days,
        });
      }

      console.log(`[API /production/queue GET] Fetched ${transformedData.length} items using fallback method.`);
      return NextResponse.json({
        queueItems: transformedData,
      });
    }

    // If RPC worked, use that data
    const transformedData: QueueApiResponseItem[] = data.map((item: any) => ({
      queue_id: item.queue_id,
      status: item.status,
      premium: item.premium,
      created_at: item.created_at,
      eta_start_date: item.eta_start_date,
      eta_end_date: item.eta_end_date,
      qty_total: item.qty_total,
      qty_pendiente: item.qty_pendiente,
      cotizacion_id: item.cotizacion_id,
      cotizacion_folio: item.folio,
      cliente_id: item.cliente_id,
      cliente_nombre: item.cliente_nombre,
      producto_id: item.producto_id,
      producto_nombre: item.producto_nombre,
      vueltas_max_dia: item.vueltas_max_dia ?? 1,
      moldes_disponibles: item.moldes_disponibles ?? 1,
      assigned_molds: item.assigned_molds ?? 1,
      vaciado_duration_days: item.vaciado_duration_days,
    }));

    console.log(`[API /production/queue GET] Fetched ${transformedData.length} items (Total Count: ${count}).`);

    return NextResponse.json({
      queueItems: transformedData,
      // Add pagination metadata if implemented
      // totalCount: count,
      // page: page,
      // limit: limit,
    });

  } catch (error) {
    console.error('[API /production/queue GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// TODO: Implement PATCH handler for status updates
export async function PATCH(request: NextRequest) {
    try {
         const { queue_id, status, assigned_molds: newAssignedMolds } = await request.json();
         
         console.log(`[API /production/queue PATCH] Received update request for queue_id: ${queue_id}, status: ${status}, assigned_molds: ${newAssignedMolds}`);

         if (!queue_id) {
             return NextResponse.json({ error: 'queue_id es requerido' }, { status: 400 });
         }

         // Initialize an object to hold the fields to be updated
         const updatePayload: { status?: string; assigned_molds?: number; vaciado_duration_days?: number | null } = {};
         let needsRecalculation = false;

         // Get current Supabase client
         const cookieStore = await cookies();
         const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              cookies: {
                get: (name: string) => cookieStore.get(name)?.value,
                set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
                remove: (name: string, options: any) => cookieStore.remove(name, options),
              },
            }
          );
        
          const plannerService = new ProductionPlannerService(supabase);

         // Handle status update
         if (status) {
            const validStatuses = ['queued', 'in_progress', 'done', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return NextResponse.json({ error: `Estado inválido: ${status}` }, { status: 400 });
            }
            updatePayload.status = status;
            if (status === 'done' || status === 'cancelled') {
                needsRecalculation = true;
            }
         }

         // Handle assigned_molds update
         if (newAssignedMolds !== undefined) {
            if (typeof newAssignedMolds !== 'number' || newAssignedMolds <= 0) {
                return NextResponse.json({ error: 'assigned_molds debe ser un número positivo.' }, { status: 400 });
            }

            // Fetch current queue item and related product data for validation and calculation
            const { data: currentItemData, error: itemError } = await supabase
              .from('production_queue')
              .select(`
                qty_total,
                cotizacion_productos!inner (
                  productos!inner (
                    moldes_disponibles
                  )
                )
              `)
              .eq('queue_id', queue_id)
              .single();

            if (itemError || !currentItemData) {
              console.error(`[API /production/queue PATCH] Error fetching item ${queue_id} for mold update:`, itemError);
              return NextResponse.json({ error: `Item con ID ${queue_id} no encontrado o error al leerlo.` }, { status: 404 });
            }
            
            const productDetails = currentItemData.cotizacion_productos?.productos;
            if (!productDetails || productDetails.moldes_disponibles === null || productDetails.moldes_disponibles === undefined) {
                 console.error(`[API /production/queue PATCH] No se pudo obtener moldes_disponibles para el producto del item ${queue_id}.`);
                 return NextResponse.json({ error: 'No se pudo obtener información del producto para validar moldes.' }, { status: 500 });
            }

            if (newAssignedMolds > productDetails.moldes_disponibles) {
                return NextResponse.json({ error: `assigned_molds (${newAssignedMolds}) no puede exceder los moldes disponibles del producto (${productDetails.moldes_disponibles}).` }, { status: 400 });
            }
            
            updatePayload.assigned_molds = newAssignedMolds;
            
            // Calculate new vaciado_duration_days based on the VBA logic
            // vaciado_duration_days = Ceiling((qty_total / assigned_molds) * 1.08, 1) + 5
            const qtyTotal = currentItemData.qty_total;
            if (qtyTotal === null || qtyTotal === undefined) {
                 console.error(`[API /production/queue PATCH] qty_total es nulo para el item ${queue_id}.`);
                return NextResponse.json({ error: 'No se pudo calcular duración, cantidad total no disponible.' }, { status: 500 });
            }
            updatePayload.vaciado_duration_days = Math.ceil((qtyTotal / newAssignedMolds) * 1.08) + 5;
            needsRecalculation = true; // Changing molds or duration requires full queue recalc
         }

         if (Object.keys(updatePayload).length === 0) {
            return NextResponse.json({ error: 'No se proporcionaron campos para actualizar (status o assigned_molds).' }, { status: 400 });
         }
         
         console.log(`[API /production/queue PATCH] Updating queue_id ${queue_id} with payload:`, updatePayload);

         const { data, error } = await supabase
             .from('production_queue')
             .update(updatePayload)
             .eq('queue_id', queue_id)
             .select() 
             .single();

         if (error) {
             console.error(`[API /production/queue PATCH] Error updating queue_id ${queue_id}:`, error);
             if (error.code === 'PGRST116') { 
                  return NextResponse.json({ error: `Item con ID ${queue_id} no encontrado.` }, { status: 404 });
             }
             return NextResponse.json({ error: 'Error al actualizar el item en la cola' }, { status: 500 });
         }

         console.log(`[API /production/queue PATCH] Successfully updated queue_id ${queue_id}.`);

         if (needsRecalculation) {
             console.log(`[API /production/queue PATCH] Triggering queue recalculation due to changes.`);
             plannerService.recalculateEntireQueue().catch(err => {
                 console.error("[API /production/queue PATCH] Background recalculation failed:", err);
             }); 
         }

         return NextResponse.json({ success: true, updatedItem: data });

    } catch (error) {
         console.error('[API /production/queue PATCH] Unexpected error:', error);
         return NextResponse.json({ error: 'Error interno del servidor al actualizar item de la cola' }, { status: 500 });
    }
} 