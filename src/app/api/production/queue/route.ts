import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { Database } from '@/lib/database.types';

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
};

export async function GET(request: NextRequest) {
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

    const { data, error, count } = await supabase
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
        cotizacion_productos!inner (
            cotizacion_id,
            producto_id,
            cotizaciones!cotizacion_productos_cotizacion_id_fkey!inner (
                folio,
                cliente_id,
                clientes!inner (
                    nombre
                )
            ),
            productos!inner (
                nombre,
                vueltas_max_dia
            )
        )
      `,
       { count: 'exact' } // Request count for pagination metadata
      )
      // Add filters based on query params here, e.g.:
      // .eq(filterStatus ? 'status' : 'queue_id', filterStatus || undefined)
      .order('premium', { ascending: false }) // Default sort
      .order('created_at', { ascending: true }) // Default sort
      // .range(offset, offset + limit - 1); // Apply pagination range

    if (error) {
      console.error("[API /production/queue GET] Error fetching queue:", error);
      return NextResponse.json({ error: 'Error al obtener la cola de producción' }, { status: 500 });
    }

    // Transform the data to the desired flat structure
    const transformedData: QueueApiResponseItem[] = data.map((item: any) => {
       const cotizacionProducto = item.cotizacion_productos;
       const cotizacion = cotizacionProducto?.['cotizaciones!cotizacion_productos_cotizacion_id_fkey'];
       const cliente = cotizacion?.clientes;
       const producto = cotizacionProducto?.productos;
      
      return {
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
        producto_id: producto?.producto_id ?? null,
        producto_nombre: producto?.nombre ?? null,
        vueltas_max_dia: producto?.vueltas_max_dia ?? 1,
      };
    });

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
         const { queue_id, status } = await request.json();
         
         console.log(`[API /production/queue PATCH] Received update request for queue_id: ${queue_id}, status: ${status}`);

         if (!queue_id || !status) {
             return NextResponse.json({ error: 'queue_id y status son requeridos' }, { status: 400 });
         }

         // Validate status maybe?
         const validStatuses = ['queued', 'in_progress', 'done', 'cancelled'];
         if (!validStatuses.includes(status)) {
             return NextResponse.json({ error: `Estado inválido: ${status}` }, { status: 400 });
         }

         // Update the status in the database
         const { data, error } = await supabase
             .from('production_queue')
             .update({ status: status })
             .eq('queue_id', queue_id)
             .select() // Optionally select the updated row to return
             .single();

         if (error) {
             console.error(`[API /production/queue PATCH] Error updating status for queue_id ${queue_id}:`, error);
             if (error.code === 'PGRST116') { // row not found
                  return NextResponse.json({ error: `Item con ID ${queue_id} no encontrado.` }, { status: 404 });
             }
             return NextResponse.json({ error: 'Error al actualizar el estado' }, { status: 500 });
         }

         console.log(`[API /production/queue PATCH] Successfully updated status for queue_id ${queue_id} to ${status}.`);

         // Decide if recalculation is needed
         // Maybe only recalculate if status changes TO done/cancelled?
         if (status === 'done' || status === 'cancelled') {
             console.log(`[API /production/queue PATCH] Status changed to ${status}, triggering queue recalculation.`);
             // Import and instantiate the service
             const { ProductionPlannerService } = await import('@/services/productionPlannerService');
             const plannerService = new ProductionPlannerService(supabase);
             // Run recalculation in the background (don't await)
             plannerService.recalculateEntireQueue().catch(err => {
                 console.error("[API /production/queue PATCH] Background recalculation failed:", err);
             }); 
         }

         return NextResponse.json({ success: true, updatedItem: data });

    } catch (error) {
         console.error('[API /production/queue PATCH] Unexpected error:', error);
         return NextResponse.json({ error: 'Error interno del servidor al actualizar estado' }, { status: 500 });
    }
} 