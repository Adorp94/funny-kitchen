import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log("[API /production/allocate-inventory POST] === STARTING REQUEST ===");
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
        remove: (name: string, options: any) => cookieStore.set(name, '', { ...options, maxAge: 0 }),
      },
    }
  );

  try {
    const body = await request.json();
    const { allocations } = body;

    console.log("[API /production/allocate-inventory POST] Allocations:", allocations);

    if (!allocations || !Array.isArray(allocations)) {
      return NextResponse.json(
        { error: 'Invalid allocations data' },
        { status: 400 }
      );
    }

    const results = [];

    // Process each allocation
    for (const allocation of allocations) {
      const {
        cotizacion_id,
        producto_id,
        cantidad_solicitada,
        cantidad_a_asignar,
        action // 'allocate_inventory' | 'send_to_production' | 'send_to_packaging'
      } = allocation;

      console.log(`[API] Processing allocation: ${action} for product ${producto_id}, cotizacion ${cotizacion_id}`);

      // Validate allocation data
      if (!cotizacion_id || !producto_id || !cantidad_solicitada || cantidad_a_asignar < 0) {
        console.error("[API] Invalid allocation data:", allocation);
        continue;
      }

      if (action === 'allocate_inventory') {
        // Allocate from terminado inventory and potentially reduce terminado count
        // This would create a record in production_allocations table
        
        const { data: allocationData, error: allocationError } = await supabase
          .from('production_allocations')
          .insert({
            producto_id,
            cotizacion_id,
            cantidad_asignada: cantidad_a_asignar,
            stage: 'empaque',
            notas: `Asignado desde inventario terminado - ${cantidad_a_asignar} piezas`
          })
          .select()
          .single();

        if (allocationError) {
          console.error("[API] Error creating allocation:", allocationError);
          results.push({
            cotizacion_id,
            producto_id,
            success: false,
            error: allocationError.message
          });
          continue;
        }

        // Update terminado inventory (reduce by allocated amount)
        const { error: updateError } = await supabase
          .from('production_active')
          .update({
            terminado: supabase.sql`terminado - ${cantidad_a_asignar}`
          })
          .eq('producto_id', producto_id);

        if (updateError) {
          console.error("[API] Error updating terminado inventory:", updateError);
          // Rollback allocation if inventory update fails
          await supabase
            .from('production_allocations')
            .delete()
            .eq('id', allocationData.id);
          
          results.push({
            cotizacion_id,
            producto_id,
            success: false,
            error: updateError.message
          });
          continue;
        }

        results.push({
          cotizacion_id,
          producto_id,
          success: true,
          action: 'allocated_to_packaging',
          cantidad_asignada: cantidad_a_asignar
        });

      } else if (action === 'send_to_production') {
        // Send remaining quantity to production queue
        const cantidad_producir = cantidad_solicitada - (cantidad_a_asignar || 0);
        
        if (cantidad_producir > 0) {
          // Find the cotizacion_producto_id
          const { data: cotizacionProducto, error: cpError } = await supabase
            .from('cotizacion_productos')
            .select('cotizacion_producto_id')
            .eq('cotizacion_id', cotizacion_id)
            .eq('producto_id', producto_id)
            .single();

          if (cpError || !cotizacionProducto) {
            console.error("[API] Error finding cotizacion_producto:", cpError);
            results.push({
              cotizacion_id,
              producto_id,
              success: false,
              error: 'Could not find cotizacion_producto record'
            });
            continue;
          }

          // Check if cotizacion is premium for queue priority
          const { data: cotizacionData, error: cotizacionError } = await supabase
            .from('cotizaciones')
            .select('is_premium, prioridad')
            .eq('cotizacion_id', cotizacion_id)
            .single();

          const isPremium = cotizacionData?.is_premium || cotizacionData?.prioridad || false;

          // Add to production queue
          const { error: queueError } = await supabase
            .from('production_queue')
            .insert({
              cotizacion_producto_id: cotizacionProducto.cotizacion_producto_id,
              producto_id,
              qty_total: cantidad_producir,
              qty_pendiente: cantidad_producir,
              premium: isPremium,
              status: 'queued'
            });

          if (queueError) {
            console.error("[API] Error adding to production queue:", queueError);
            results.push({
              cotizacion_id,
              producto_id,
              success: false,
              error: queueError.message
            });
            continue;
          }

          results.push({
            cotizacion_id,
            producto_id,
            success: true,
            action: 'sent_to_production',
            cantidad_producir
          });
        }

      } else if (action === 'send_to_packaging') {
        // Send entire order directly to packaging (sufficient inventory case)
        const { data: allocationData, error: allocationError } = await supabase
          .from('production_allocations')
          .insert({
            producto_id,
            cotizacion_id,
            cantidad_asignada: cantidad_solicitada,
            stage: 'empaque',
            notas: `Enviado directo a empaque - inventario suficiente`
          })
          .select()
          .single();

        if (allocationError) {
          console.error("[API] Error creating packaging allocation:", allocationError);
          results.push({
            cotizacion_id,
            producto_id,
            success: false,
            error: allocationError.message
          });
          continue;
        }

        // Update terminado inventory
        const { error: updateError } = await supabase
          .from('production_active')
          .update({
            terminado: supabase.sql`terminado - ${cantidad_solicitada}`
          })
          .eq('producto_id', producto_id);

        if (updateError) {
          console.error("[API] Error updating terminado inventory:", updateError);
          // Rollback allocation
          await supabase
            .from('production_allocations')
            .delete()
            .eq('id', allocationData.id);
          
          results.push({
            cotizacion_id,
            producto_id,
            success: false,
            error: updateError.message
          });
          continue;
        }

        results.push({
          cotizacion_id,
          producto_id,
          success: true,
          action: 'sent_to_packaging',
          cantidad_asignada: cantidad_solicitada
        });
      }
    }

    console.log("[API /production/allocate-inventory POST] Results:", results);

    return NextResponse.json({
      success: true,
      results,
      message: `Procesadas ${results.length} asignaciones`
    });

  } catch (error) {
    console.error('[API /production/allocate-inventory POST] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}