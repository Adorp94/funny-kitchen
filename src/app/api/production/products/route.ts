import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Use raw SQL to avoid relationship ambiguity issues
    const { data: productionItems, error } = await supabase.rpc('get_production_items_with_status');

    if (error) {
      console.error('Error calling RPC function:', error);
      
      // Fallback to manual query construction
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('cotizacion_productos')
        .select('cotizacion_producto_id, cantidad, production_status, production_status_updated_at, cotizacion_id, producto_id');

      if (fallbackError) {
        console.error('Fallback error:', fallbackError);
        return NextResponse.json({ error: 'Error al obtener productos en producción' }, { status: 500 });
      }

      // Get additional data manually
      const enrichedData = [];
      for (const item of fallbackData) {
        // Get cotización info
        const { data: cotizacion } = await supabase
          .from('cotizaciones')
          .select('cotizacion_id, folio, estado, cliente_id')
          .eq('cotizacion_id', item.cotizacion_id)
          .single();

        // Get cliente info
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nombre')
          .eq('cliente_id', cotizacion?.cliente_id)
          .single();

        // Get producto info
        const { data: producto } = await supabase
          .from('productos')
          .select('producto_id, nombre, sku')
          .eq('producto_id', item.producto_id)
          .single();

        // Only include products from cotizaciones in 'producción' state
        if (cotizacion?.estado === 'producción') {
          enrichedData.push({
            cotizacion_producto_id: item.cotizacion_producto_id,
            cotizacion_id: cotizacion.cotizacion_id,
            folio: cotizacion.folio,
            cliente_nombre: cliente?.nombre,
            producto_id: producto?.producto_id,
            producto_nombre: producto?.nombre,
            producto_sku: producto?.sku,
            cantidad: item.cantidad,
            production_status: item.production_status,
            production_status_updated_at: item.production_status_updated_at,
          });
        }
      }

      // Group by status for better organization
      const groupedByStatus = enrichedData.reduce((acc, item) => {
        const status = item.production_status || 'pending';
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      return NextResponse.json({
        message: 'Productos en producción obtenidos exitosamente (fallback)',
        total: enrichedData.length,
        by_status: groupedByStatus,
        summary: {
          pending: groupedByStatus.pending?.length || 0,
          queued: groupedByStatus.queued?.length || 0,
          in_progress: groupedByStatus.in_progress?.length || 0,
          completed: groupedByStatus.completed?.length || 0,
        }
      });
    }

    // If RPC worked, process the data
    const groupedByStatus = productionItems.reduce((acc, item) => {
      const status = item.production_status || 'pending';
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      message: 'Productos en producción obtenidos exitosamente',
      total: productionItems.length,
      by_status: groupedByStatus,
      summary: {
        pending: groupedByStatus.pending?.length || 0,
        queued: groupedByStatus.queued?.length || 0,
        in_progress: groupedByStatus.in_progress?.length || 0,
        completed: groupedByStatus.completed?.length || 0,
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { cotizacion_producto_id, production_status } = await request.json();

    if (!cotizacion_producto_id || !production_status) {
      return NextResponse.json({ 
        error: 'cotizacion_producto_id y production_status son requeridos' 
      }, { status: 400 });
    }

    // Validate production_status value
    const validStatuses = ['pending', 'queued', 'in_progress', 'completed'];
    if (!validStatuses.includes(production_status)) {
      return NextResponse.json({ 
        error: `production_status debe ser uno de: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Update the product production status
    const { data: updatedProduct, error: updateError } = await supabase
      .from('cotizacion_productos')
      .update({ production_status })
      .eq('cotizacion_producto_id', cotizacion_producto_id)
      .select('cotizacion_producto_id, production_status, production_status_updated_at')
      .single();

    if (updateError) {
      console.error('Error updating product status:', updateError);
      return NextResponse.json({ error: 'Error al actualizar el estado del producto' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Estado del producto actualizado exitosamente',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 