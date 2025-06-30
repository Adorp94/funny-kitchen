import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log("[API /production/allocate POST] === STARTING REQUEST ===");
  
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
    const { producto_id, cotizacion_id, cantidad, notas } = await request.json();
    
    console.log(`[API /production/allocate POST] Allocating ${cantidad} units of product ${producto_id} to cotización ${cotizacion_id}`);

    if (!producto_id || !cotizacion_id || !cantidad) {
      return NextResponse.json({ 
        error: 'producto_id, cotizacion_id y cantidad son requeridos' 
      }, { status: 400 });
    }

    if (typeof cantidad !== 'number' || cantidad <= 0) {
      return NextResponse.json({ 
        error: 'La cantidad debe ser un número positivo' 
      }, { status: 400 });
    }

    // Start transaction-like operations
    
    // 1. Verify we have enough finished products
    const { data: productionStatus, error: statusError } = await supabase
      .from('production_active')
      .select('terminado')
      .eq('producto_id', producto_id)
      .single();

    if (statusError || !productionStatus) {
      return NextResponse.json({ 
        error: 'No se encontró estado de producción para este producto' 
      }, { status: 404 });
    }

    if (productionStatus.terminado < cantidad) {
      return NextResponse.json({ 
        error: 'No hay suficientes productos terminados disponibles' 
      }, { status: 400 });
    }

    // 2. Verify the cotización exists and needs this quantity
    const { data: cotizacionProduct, error: cotizacionError } = await supabase
      .from('cotizacion_productos')
      .select('cantidad')
      .eq('cotizacion_id', cotizacion_id)
      .eq('producto_id', producto_id)
      .single();

    if (cotizacionError || !cotizacionProduct) {
      return NextResponse.json({ 
        error: 'No se encontró este producto en la cotización especificada' 
      }, { status: 404 });
    }

    // 3. Check current allocations to ensure we don't over-allocate
    const { data: currentAllocations } = await supabase
      .from('production_allocations')
      .select('cantidad_asignada')
      .eq('cotizacion_id', cotizacion_id)
      .eq('producto_id', producto_id);

    const totalAllocated = currentAllocations?.reduce((sum, alloc) => sum + alloc.cantidad_asignada, 0) || 0;
    const remainingNeeded = cotizacionProduct.cantidad - totalAllocated;

    if (cantidad > remainingNeeded) {
      return NextResponse.json({ 
        error: `Solo se pueden asignar ${remainingNeeded} unidades (ya se asignaron ${totalAllocated} de ${cotizacionProduct.cantidad})` 
      }, { status: 400 });
    }

    // 4. Create allocation record
    const { data: allocationRecord, error: allocationError } = await supabase
      .from('production_allocations')
      .insert({
        producto_id,
        cotizacion_id,
        cantidad_asignada: cantidad,
        fecha_asignacion: new Date().toISOString(),
        notas: notas || null
      })
      .select()
      .single();

    if (allocationError) {
      console.error("[API /production/allocate POST] Error creating allocation:", allocationError);
      return NextResponse.json({ 
        error: 'Error al crear el registro de asignación' 
      }, { status: 500 });
    }

    // 5. Update production_active to reduce terminado quantity
    const { error: updateError } = await supabase
      .from('production_active')
      .update({ 
        terminado: productionStatus.terminado - cantidad,
        updated_at: new Date().toISOString()
      })
      .eq('producto_id', producto_id);

    if (updateError) {
      console.error("[API /production/allocate POST] Error updating production status:", updateError);
      
      // Rollback: delete the allocation record
      await supabase
        .from('production_allocations')
        .delete()
        .eq('id', allocationRecord.id);
      
      return NextResponse.json({ 
        error: 'Error al actualizar el estado de producción' 
      }, { status: 500 });
    }

    // 6. Check if cotización is fully allocated and update production_status if needed
    const newTotalAllocated = totalAllocated + cantidad;
    if (newTotalAllocated >= cotizacionProduct.cantidad) {
      // Mark this product as completed in the cotización
      await supabase
        .from('cotizacion_productos')
        .update({ 
          production_status: 'completed',
          production_status_updated_at: new Date().toISOString()
        })
        .eq('cotizacion_id', cotizacion_id)
        .eq('producto_id', producto_id);
    }

    console.log(`[API /production/allocate POST] Successfully allocated ${cantidad} units to cotización ${cotizacion_id}`);

    return NextResponse.json({
      message: 'Productos asignados exitosamente',
      allocation: allocationRecord,
      remainingFinished: productionStatus.terminado - cantidad,
      totalAllocatedToClient: newTotalAllocated,
      clientNeedsRemaining: cotizacionProduct.cantidad - newTotalAllocated
    });

  } catch (error) {
    console.error('[API /production/allocate POST] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 