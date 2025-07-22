import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Type definitions
type MoveToEnviadosRequest = {
  producto_id: number;
  cotizacion_id: number;
  cantidad: number;
};

export async function POST(request: NextRequest) {
  console.log("[API /production/enviados POST] === STARTING REQUEST ===");
  
  try {
    const body: MoveToEnviadosRequest = await request.json();
    const { producto_id, cotizacion_id, cantidad } = body;

    console.log("[API /production/enviados POST] Request data:", { producto_id, cotizacion_id, cantidad });

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

    // Get current empaque allocation
    const { data: empaqueAllocation, error: empaqueError } = await supabase
      .from('production_allocations')
      .select('*')
      .eq('producto_id', producto_id)
      .eq('cotizacion_id', cotizacion_id)
      .eq('stage', 'empaque')
      .single();

    if (empaqueError || !empaqueAllocation) {
      console.error("[API /production/enviados POST] Error fetching empaque allocation:", empaqueError);
      return NextResponse.json({ 
        error: 'Producto no encontrado en empaque',
        details: 'Este producto no está en la etapa de empaque para esta cotización'
      }, { status: 400 });
    }

    if (empaqueAllocation.cantidad_asignada < cantidad) {
      return NextResponse.json({ 
        error: 'Cantidad insuficiente',
        details: `Solo hay ${empaqueAllocation.cantidad_asignada} productos en empaque disponibles`
      }, { status: 400 });
    }

    // Check if there's already an enviados allocation for this product + cotizacion
    const { data: existingEnviados, error: enviadosCheckError } = await supabase
      .from('production_allocations')
      .select('id, cantidad_asignada')
      .eq('producto_id', producto_id)
      .eq('cotizacion_id', cotizacion_id)
      .eq('stage', 'entregado')
      .maybeSingle();

    if (enviadosCheckError) {
      console.error("[API /production/enviados POST] Error checking existing enviados:", enviadosCheckError);
      return NextResponse.json({ 
        error: 'Error al verificar asignaciones de enviados',
        details: enviadosCheckError.message 
      }, { status: 500 });
    }

    // Perform the operations in sequence
    
    // 1. Update empaque allocation (decrease or delete if quantity becomes 0)
    if (empaqueAllocation.cantidad_asignada === cantidad) {
      // Delete the empaque allocation entirely
      const { error: deleteEmpaqueError } = await supabase
        .from('production_allocations')
        .delete()
        .eq('id', empaqueAllocation.id);

      if (deleteEmpaqueError) {
        console.error("[API /production/enviados POST] Error deleting empaque allocation:", deleteEmpaqueError);
        return NextResponse.json({ 
          error: 'Error al eliminar asignación de empaque',
          details: deleteEmpaqueError.message 
        }, { status: 500 });
      }
    } else {
      // Update empaque allocation
      const { error: updateEmpaqueError } = await supabase
        .from('production_allocations')
        .update({ 
          cantidad_asignada: empaqueAllocation.cantidad_asignada - cantidad,
          updated_at: new Date().toISOString(),
          notas: `Actualizado: -${cantidad} productos movidos a enviados`
        })
        .eq('id', empaqueAllocation.id);

      if (updateEmpaqueError) {
        console.error("[API /production/enviados POST] Error updating empaque allocation:", updateEmpaqueError);
        return NextResponse.json({ 
          error: 'Error al actualizar asignación de empaque',
          details: updateEmpaqueError.message 
        }, { status: 500 });
      }
    }

    // 2. Create or update enviados allocation
    if (existingEnviados) {
      // Update existing enviados allocation
      const { error: updateEnviadosError } = await supabase
        .from('production_allocations')
        .update({ 
          cantidad_asignada: existingEnviados.cantidad_asignada + cantidad,
          updated_at: new Date().toISOString(),
          notas: `Actualizado: +${cantidad} productos movidos desde empaque`
        })
        .eq('id', existingEnviados.id);

      if (updateEnviadosError) {
        console.error("[API /production/enviados POST] Error updating enviados allocation:", updateEnviadosError);
        // Rollback: restore empaque allocation
        await supabase
          .from('production_allocations')
          .update({ cantidad_asignada: empaqueAllocation.cantidad_asignada })
          .eq('id', empaqueAllocation.id);
        
        return NextResponse.json({ 
          error: 'Error al actualizar asignación de enviados',
          details: updateEnviadosError.message 
        }, { status: 500 });
      }
    } else {
      // Create new enviados allocation
      const { error: insertEnviadosError } = await supabase
        .from('production_allocations')
        .insert({
          producto_id,
          cotizacion_id,
          cantidad_asignada: cantidad,
          stage: 'entregado',
          notas: `${cantidad} productos movidos desde empaque`
        });

      if (insertEnviadosError) {
        console.error("[API /production/enviados POST] Error creating enviados allocation:", insertEnviadosError);
        // Rollback: restore empaque allocation
        await supabase
          .from('production_allocations')
          .update({ cantidad_asignada: empaqueAllocation.cantidad_asignada })
          .eq('id', empaqueAllocation.id);
        
        return NextResponse.json({ 
          error: 'Error al crear asignación de enviados',
          details: insertEnviadosError.message 
        }, { status: 500 });
      }
    }

    console.log("[API /production/enviados POST] Successfully moved products to enviados");

    return NextResponse.json({
      success: true,
      message: `${cantidad} productos movidos a enviados exitosamente`,
      data: {
        producto_id,
        cotizacion_id,
        cantidad_movida: cantidad,
        nueva_cantidad_empaque: empaqueAllocation.cantidad_asignada - cantidad
      }
    });

  } catch (error) {
    console.error('[API /production/enviados POST] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log("[API /production/enviados GET] === STARTING REQUEST ===");
  
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
    // Get enviados products for the cotizacion
    const { data: enviadosData, error: enviadosError } = await supabase
      .from('production_allocations')
      .select(`
        producto_id,
        cantidad_asignada,
        fecha_asignacion,
        notas,
        productos!inner (
          nombre
        )
      `)
      .eq('cotizacion_id', parseInt(cotizacionId))
      .eq('stage', 'entregado');

    if (enviadosError) {
      console.error("[API /production/enviados GET] Error fetching enviados products:", enviadosError);
      return NextResponse.json({ 
        error: 'Error al obtener productos enviados',
        details: enviadosError.message 
      }, { status: 500 });
    }

    const productos = enviadosData?.map(item => ({
      nombre: item.productos.nombre,
      cantidad: item.cantidad_asignada,
      producto_id: item.producto_id,
      fecha_envio: new Date(item.fecha_asignacion).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }),
      notas: item.notas
    })) || [];

    console.log("[API /production/enviados GET] Found enviados products:", productos.length);

    return NextResponse.json({
      success: true,
      data: {
        cotizacion_id: parseInt(cotizacionId),
        productos_enviados: productos,
        total_productos: productos.length,
        total_cantidad: productos.reduce((sum, p) => sum + p.cantidad, 0)
      }
    });

  } catch (error) {
    console.error('[API /production/enviados GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}