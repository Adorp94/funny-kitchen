import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

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

    const supabase = await createClient();

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

    // 2. Create or update enviados allocation with box information preserved
    if (existingEnviados) {
      // Update existing enviados allocation
      const { error: updateEnviadosError } = await supabase
        .from('production_allocations')
        .update({ 
          cantidad_asignada: existingEnviados.cantidad_asignada + cantidad,
          updated_at: new Date().toISOString(),
          notas: `Actualizado: +${cantidad} productos movidos desde empaque`,
          // Preserve box information if this is the first time or aggregate if needed
          cajas_chicas: empaqueAllocation.cajas_chicas || 0,
          cajas_grandes: empaqueAllocation.cajas_grandes || 0,
          comentarios_empaque: empaqueAllocation.comentarios_empaque
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
      // Create new enviados allocation with box information
      const { error: insertEnviadosError } = await supabase
        .from('production_allocations')
        .insert({
          producto_id,
          cotizacion_id,
          cantidad_asignada: cantidad,
          stage: 'entregado',
          notas: `${cantidad} productos movidos desde empaque`,
          cajas_chicas: empaqueAllocation.cajas_chicas || 0,
          cajas_grandes: empaqueAllocation.cajas_grandes || 0,
          comentarios_empaque: empaqueAllocation.comentarios_empaque
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

    // 3. CRITICAL: Subtract delivered quantities from bitácora (production_active.pedidos)
    // This prevents overproduction of already delivered products
    try {
      // Get current bitácora entry for this product
      const { data: bitacoraEntry, error: bitacoraError } = await supabase
        .from('production_active')
        .select('pedidos')
        .eq('producto_id', producto_id)
        .single();

      if (bitacoraError && bitacoraError.code !== 'PGRST116') {
        console.warn("[API /production/enviados POST] Warning: Could not fetch bitácora entry:", bitacoraError);
      } else if (bitacoraEntry) {
        // Calculate new pedidos quantity (don't go below 0)
        const newPedidos = Math.max(0, bitacoraEntry.pedidos - cantidad);
        
        if (newPedidos === 0) {
          // Remove from bitácora entirely if no more pedidos needed
          const { error: deleteError } = await supabase
            .from('production_active')
            .delete()
            .eq('producto_id', producto_id);
            
          if (deleteError) {
            console.warn("[API /production/enviados POST] Warning: Could not remove product from bitácora:", deleteError);
          } else {
            console.log(`[API /production/enviados POST] Removed product ${producto_id} from bitácora (all delivered)`);
          }
        } else {
          // Update bitácora with reduced quantity
          const { error: updateError } = await supabase
            .from('production_active')
            .update({
              pedidos: newPedidos,
              updated_at: new Date().toISOString()
            })
            .eq('producto_id', producto_id);
            
          if (updateError) {
            console.warn("[API /production/enviados POST] Warning: Could not update bitácora:", updateError);
          } else {
            console.log(`[API /production/enviados POST] Updated bitácora for product ${producto_id}: ${bitacoraEntry.pedidos} -> ${newPedidos} pedidos`);
          }
        }
      }
    } catch (bitacoraUpdateError) {
      console.warn("[API /production/enviados POST] Warning: Error updating bitácora:", bitacoraUpdateError);
      // Don't fail the main operation if bitácora update fails
    }

    // 4. Check if all products from this cotización have been fully sent
    try {
      // Get total quantities ordered for this cotización
      const { data: cotizacionProductos, error: cotizacionError } = await supabase
        .from('cotizacion_productos')
        .select('producto_id, cantidad')
        .eq('cotizacion_id', cotizacion_id);

      if (cotizacionError) {
        console.warn("[API /production/enviados POST] Warning: Could not check cotización completion:", cotizacionError);
      } else if (cotizacionProductos && cotizacionProductos.length > 0) {
        // Get total quantities sent for this cotización
        const { data: enviadosAllocations, error: enviadosError } = await supabase
          .from('production_allocations')
          .select('producto_id, cantidad_asignada')
          .eq('cotizacion_id', cotizacion_id)
          .eq('stage', 'entregado');

        if (enviadosError) {
          console.warn("[API /production/enviados POST] Warning: Could not check enviados allocations:", enviadosError);
        } else {
          // Create maps for comparison
          const orderedMap = new Map();
          cotizacionProductos.forEach(cp => {
            orderedMap.set(cp.producto_id, cp.cantidad);
          });

          const sentMap = new Map();
          if (enviadosAllocations) {
            enviadosAllocations.forEach(ea => {
              const existing = sentMap.get(ea.producto_id) || 0;
              sentMap.set(ea.producto_id, existing + ea.cantidad_asignada);
            });
          }

          // Check if all products have been fully sent
          let allProductsFullySent = true;
          for (const [productoId, cantidadOrdenada] of orderedMap.entries()) {
            const cantidadEnviada = sentMap.get(productoId) || 0;
            if (cantidadEnviada < cantidadOrdenada) {
              allProductsFullySent = false;
              break;
            }
          }

          // If all products are fully sent, mark cotización as 'enviada'
          if (allProductsFullySent) {
            console.log(`[API /production/enviados POST] All products fully sent for cotización ${cotizacion_id}, marking as 'enviada'`);
            
            const { error: updateStatusError } = await supabase
              .from('cotizaciones')
              .update({ 
                estado: 'enviada',
                fecha_cierre: new Date().toISOString()
              })
              .eq('cotizacion_id', cotizacion_id);

            if (updateStatusError) {
              console.warn("[API /production/enviados POST] Warning: Could not update cotización status to 'enviada':", updateStatusError);
            } else {
              console.log(`[API /production/enviados POST] Successfully marked cotización ${cotizacion_id} as 'enviada'`);
            }
          } else {
            console.log(`[API /production/enviados POST] Cotización ${cotizacion_id} still has pending products to send`);
          }
        }
      }
    } catch (autoCompleteError) {
      console.warn("[API /production/enviados POST] Warning: Error during auto-completion check:", autoCompleteError);
    }

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

  const supabase = await createClient();

  try {
    // Get enviados products for the cotizacion
    const { data: enviadosData, error: enviadosError } = await supabase
      .from('production_allocations')
      .select(`
        producto_id,
        cantidad_asignada,
        fecha_asignacion,
        notas,
        cajas_chicas,
        cajas_grandes,
        comentarios_empaque,
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
      notas: item.notas,
      cajas_chicas: item.cajas_chicas || 0,
      cajas_grandes: item.cajas_grandes || 0,
      comentarios_empaque: item.comentarios_empaque
    })) || [];

    console.log("[API /production/enviados GET] Found enviados products:", productos.length);

    // Calculate total box counts
    const totalCajasChicas = productos.reduce((sum, p) => sum + (p.cajas_chicas || 0), 0);
    const totalCajasGrandes = productos.reduce((sum, p) => sum + (p.cajas_grandes || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        cotizacion_id: parseInt(cotizacionId),
        productos_enviados: productos,
        total_productos: productos.length,
        total_cantidad: productos.reduce((sum, p) => sum + p.cantidad, 0),
        total_cajas_chicas: totalCajasChicas,
        total_cajas_grandes: totalCajasGrandes
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