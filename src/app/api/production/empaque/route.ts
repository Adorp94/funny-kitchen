import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Type definitions
type MoveToEmpaqueRequest = {
  producto_id: number;
  cotizacion_id: number;
  cantidad: number;
};

export async function POST(request: NextRequest) {
  console.log("[API /production/empaque POST] === STARTING REQUEST ===");
  
  try {
    const body: MoveToEmpaqueRequest = await request.json();
    const { producto_id, cotizacion_id, cantidad } = body;

    console.log("[API /production/empaque POST] Request data:", { producto_id, cotizacion_id, cantidad });

    // Validate request data
    if (!producto_id || !cotizacion_id || !cantidad || cantidad <= 0) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: 'producto_id, cotizacion_id y cantidad (> 0) son requeridos'
      }, { status: 400 });
    }

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

    // Start transaction to ensure data consistency
    const { data: currentStatus, error: statusError } = await supabase
      .from('production_active')
      .select('terminado')
      .eq('producto_id', producto_id)
      .single();

    if (statusError) {
      console.error("[API /production/empaque POST] Error fetching current status:", statusError);
      return NextResponse.json({ 
        error: 'Error al obtener estado actual del producto',
        details: statusError.message 
      }, { status: 500 });
    }

    if (!currentStatus || currentStatus.terminado < cantidad) {
      return NextResponse.json({ 
        error: 'Cantidad insuficiente',
        details: `Solo hay ${currentStatus?.terminado || 0} productos terminados disponibles`
      }, { status: 400 });
    }

    // Check if cotizacion exists and has this product
    const { data: cotizacionProduct, error: cotizacionError } = await supabase
      .from('cotizacion_productos')
      .select('cantidad')
      .eq('cotizacion_id', cotizacion_id)
      .eq('producto_id', producto_id)
      .single();

    if (cotizacionError) {
      console.error("[API /production/empaque POST] Error validating cotizacion:", cotizacionError);
      return NextResponse.json({ 
        error: 'Error al validar cotización',
        details: 'La cotización no tiene este producto asociado'
      }, { status: 400 });
    }

    // Check if there's already an empaque allocation for this product + cotizacion
    const { data: existingAllocation, error: allocationCheckError } = await supabase
      .from('production_allocations')
      .select('id, cantidad_asignada')
      .eq('producto_id', producto_id)
      .eq('cotizacion_id', cotizacion_id)
      .eq('stage', 'empaque')
      .maybeSingle();

    if (allocationCheckError) {
      console.error("[API /production/empaque POST] Error checking existing allocation:", allocationCheckError);
      return NextResponse.json({ 
        error: 'Error al verificar asignaciones existentes',
        details: allocationCheckError.message 
      }, { status: 500 });
    }

    // Perform the operations in sequence (simulating transaction)
    
    // 1. Update production_active to decrease terminado
    const { error: updateStatusError } = await supabase
      .from('production_active')
      .update({ 
        terminado: currentStatus.terminado - cantidad,
        updated_at: new Date().toISOString()
      })
      .eq('producto_id', producto_id);

    if (updateStatusError) {
      console.error("[API /production/empaque POST] Error updating production status:", updateStatusError);
      return NextResponse.json({ 
        error: 'Error al actualizar estado de producción',
        details: updateStatusError.message 
      }, { status: 500 });
    }

    // 2. Create or update production_allocation
    if (existingAllocation) {
      // Update existing allocation
      const { error: updateAllocationError } = await supabase
        .from('production_allocations')
        .update({ 
          cantidad_asignada: existingAllocation.cantidad_asignada + cantidad,
          updated_at: new Date().toISOString(),
          notas: `Actualizado: +${cantidad} productos movidos a empaque`
        })
        .eq('id', existingAllocation.id);

      if (updateAllocationError) {
        console.error("[API /production/empaque POST] Error updating allocation:", updateAllocationError);
        // Rollback: restore terminado count
        await supabase
          .from('production_active')
          .update({ terminado: currentStatus.terminado })
          .eq('producto_id', producto_id);
        
        return NextResponse.json({ 
          error: 'Error al actualizar asignación de empaque',
          details: updateAllocationError.message 
        }, { status: 500 });
      }
    } else {
      // Create new allocation
      const { error: insertAllocationError } = await supabase
        .from('production_allocations')
        .insert({
          producto_id,
          cotizacion_id,
          cantidad_asignada: cantidad,
          stage: 'empaque',
          notas: `${cantidad} productos movidos a empaque desde terminado`
        });

      if (insertAllocationError) {
        console.error("[API /production/empaque POST] Error creating allocation:", insertAllocationError);
        // Rollback: restore terminado count
        await supabase
          .from('production_active')
          .update({ terminado: currentStatus.terminado })
          .eq('producto_id', producto_id);
        
        return NextResponse.json({ 
          error: 'Error al crear asignación de empaque',
          details: insertAllocationError.message 
        }, { status: 500 });
      }
    }

    console.log("[API /production/empaque POST] Successfully moved products to empaque");

    return NextResponse.json({
      success: true,
      message: `${cantidad} productos movidos a empaque exitosamente`,
      data: {
        producto_id,
        cotizacion_id,
        cantidad_movida: cantidad,
        nuevo_terminado: currentStatus.terminado - cantidad
      }
    });

  } catch (error) {
    console.error('[API /production/empaque POST] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log("[API /production/empaque GET] === STARTING REQUEST ===");
  
  const { searchParams } = new URL(request.url);
  const cotizacionId = searchParams.get('cotizacion_id');

  if (!cotizacionId) {
    return NextResponse.json({ 
      error: 'Parámetro requerido',
      details: 'cotizacion_id es requerido como query parameter'
    }, { status: 400 });
  }

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

  try {
    // Get empaque products for the cotizacion
    const { data: empaqueData, error: empaqueError } = await supabase
      .from('production_allocations')
      .select(`
        cantidad_asignada,
        fecha_asignacion,
        notas,
        productos!inner (
          nombre
        )
      `)
      .eq('cotizacion_id', parseInt(cotizacionId))
      .eq('stage', 'empaque');

    if (empaqueError) {
      console.error("[API /production/empaque GET] Error fetching empaque products:", empaqueError);
      return NextResponse.json({ 
        error: 'Error al obtener productos en empaque',
        details: empaqueError.message 
      }, { status: 500 });
    }

    const productos = empaqueData?.map(item => ({
      nombre: item.productos.nombre,
      cantidad: item.cantidad_asignada,
      fecha_asignacion: new Date(item.fecha_asignacion).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }),
      notas: item.notas
    })) || [];

    console.log("[API /production/empaque GET] Found empaque products:", productos.length);

    return NextResponse.json({
      success: true,
      data: {
        cotizacion_id: parseInt(cotizacionId),
        productos_empaque: productos,
        total_productos: productos.length,
        total_cantidad: productos.reduce((sum, p) => sum + p.cantidad, 0)
      }
    });

  } catch (error) {
    console.error('[API /production/empaque GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  console.log("[API /production/empaque DELETE] === STARTING REQUEST ===");
  
  try {
    const { searchParams } = new URL(request.url);
    const allocationId = searchParams.get('allocation_id');
    const productoId = searchParams.get('producto_id');
    const cotizacionId = searchParams.get('cotizacion_id');

    if (!allocationId && (!productoId || !cotizacionId)) {
      return NextResponse.json({ 
        error: 'Parámetros requeridos',
        details: 'Se requiere allocation_id O (producto_id Y cotizacion_id)'
      }, { status: 400 });
    }

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

    // Get the allocation to delete
    let allocationToDelete;
    if (allocationId) {
      const { data, error } = await supabase
        .from('production_allocations')
        .select('*')
        .eq('id', parseInt(allocationId))
        .eq('stage', 'empaque')
        .single();

      if (error || !data) {
        return NextResponse.json({ 
          error: 'Asignación no encontrada',
          details: 'No se encontró la asignación de empaque especificada'
        }, { status: 404 });
      }
      allocationToDelete = data;
    } else {
      const { data, error } = await supabase
        .from('production_allocations')
        .select('*')
        .eq('producto_id', parseInt(productoId!))
        .eq('cotizacion_id', parseInt(cotizacionId!))
        .eq('stage', 'empaque')
        .single();

      if (error || !data) {
        return NextResponse.json({ 
          error: 'Asignación no encontrada',
          details: 'No se encontró la asignación de empaque para este producto y cotización'
        }, { status: 404 });
      }
      allocationToDelete = data;
    }

    // Get current production status
    const { data: currentStatus, error: statusError } = await supabase
      .from('production_active')
      .select('terminado')
      .eq('producto_id', allocationToDelete.producto_id)
      .single();

    if (statusError) {
      console.error("[API /production/empaque DELETE] Error fetching current status:", statusError);
      return NextResponse.json({ 
        error: 'Error al obtener estado actual del producto',
        details: statusError.message 
      }, { status: 500 });
    }

    // Return products to terminado stage
    const { error: updateStatusError } = await supabase
      .from('production_active')
      .update({ 
        terminado: currentStatus.terminado + allocationToDelete.cantidad_asignada,
        updated_at: new Date().toISOString()
      })
      .eq('producto_id', allocationToDelete.producto_id);

    if (updateStatusError) {
      console.error("[API /production/empaque DELETE] Error updating production status:", updateStatusError);
      return NextResponse.json({ 
        error: 'Error al actualizar estado de producción',
        details: updateStatusError.message 
      }, { status: 500 });
    }

    // Delete the allocation
    const { error: deleteError } = await supabase
      .from('production_allocations')
      .delete()
      .eq('id', allocationToDelete.id);

    if (deleteError) {
      console.error("[API /production/empaque DELETE] Error deleting allocation:", deleteError);
      // Rollback: subtract the returned quantity
      await supabase
        .from('production_active')
        .update({ terminado: currentStatus.terminado })
        .eq('producto_id', allocationToDelete.producto_id);
      
      return NextResponse.json({ 
        error: 'Error al eliminar asignación de empaque',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log("[API /production/empaque DELETE] Successfully removed products from empaque");

    return NextResponse.json({
      success: true,
      message: `${allocationToDelete.cantidad_asignada} productos devueltos a terminado exitosamente`,
      data: {
        producto_id: allocationToDelete.producto_id,
        cotizacion_id: allocationToDelete.cotizacion_id,
        cantidad_devuelta: allocationToDelete.cantidad_asignada,
        nuevo_terminado: currentStatus.terminado + allocationToDelete.cantidad_asignada
      }
    });

  } catch (error) {
    console.error('[API /production/empaque DELETE] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}