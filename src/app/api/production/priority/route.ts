import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function PATCH(request: NextRequest) {
  console.log("[API /production/priority PATCH] === STARTING REQUEST ===");
  
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
    const { cotizacion_id, prioridad } = await request.json();
    
    console.log(`[API /production/priority PATCH] Updating priority for cotizacion ${cotizacion_id} to ${prioridad}`);

    if (!cotizacion_id || typeof prioridad !== 'boolean') {
      return NextResponse.json({ 
        error: 'cotizacion_id y prioridad (boolean) son requeridos' 
      }, { status: 400 });
    }

    // Verify the cotización exists and is in production
    const { data: existingCotizacion, error: verifyError } = await supabase
      .from('cotizaciones')
      .select('cotizacion_id, folio, estado')
      .eq('cotizacion_id', cotizacion_id)
      .single();

    if (verifyError || !existingCotizacion) {
      console.error("[API /production/priority PATCH] Cotización not found:", verifyError);
      return NextResponse.json({ 
        error: 'Cotización no encontrada' 
      }, { status: 404 });
    }

    if (existingCotizacion.estado !== 'producción') {
      return NextResponse.json({ 
        error: 'Solo se puede modificar la prioridad de cotizaciones en producción' 
      }, { status: 400 });
    }

    // Update the priority
    const { data: updatedCotizacion, error: updateError } = await supabase
      .from('cotizaciones')
      .update({ prioridad })
      .eq('cotizacion_id', cotizacion_id)
      .select('cotizacion_id, folio, prioridad')
      .single();

    if (updateError) {
      console.error("[API /production/priority PATCH] Error updating priority:", updateError);
      return NextResponse.json({ 
        error: 'Error al actualizar la prioridad' 
      }, { status: 500 });
    }

    console.log(`[API /production/priority PATCH] Successfully updated priority for ${existingCotizacion.folio}`);

    return NextResponse.json({
      message: 'Prioridad actualizada exitosamente',
      cotizacion: updatedCotizacion
    });

  } catch (error) {
    console.error('[API /production/priority PATCH] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 