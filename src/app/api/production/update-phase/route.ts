import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  console.log("[API /production/update-phase PATCH] === STARTING REQUEST ===");
  
  const supabase = await createClient();

  try {
    const { producto_id, phase, value } = await request.json();
    
    console.log(`[API /production/update-phase PATCH] Updating ${phase} to ${value} for product ${producto_id}`);

    if (!producto_id || !phase || value === undefined) {
      return NextResponse.json({ 
        error: 'producto_id, phase y value son requeridos' 
      }, { status: 400 });
    }

    const validPhases = ['pedidos', 'por_detallar', 'detallado', 'sancocho', 'terminado'];
    if (!validPhases.includes(phase)) {
      return NextResponse.json({ 
        error: 'Fase de producción inválida' 
      }, { status: 400 });
    }

    if (typeof value !== 'number' || value < 0) {
      return NextResponse.json({ 
        error: 'El valor debe ser un número no negativo' 
      }, { status: 400 });
    }

    // Check if production_active record exists
    const { data: existingRecord } = await supabase
      .from('production_active')
      .select('*')
      .eq('producto_id', producto_id)
      .single();

    let result;

    if (existingRecord) {
      // Update existing record
      const { data, error } = await supabase
        .from('production_active')
        .update({ 
          [phase]: value,
          updated_at: new Date().toISOString()
        })
        .eq('producto_id', producto_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new record with default values
      const newRecord = {
        producto_id,
        pedidos: 0,
        por_detallar: 0,
        detallado: 0,
        sancocho: 0,
        terminado: 0,
        [phase]: value
      };

      const { data, error } = await supabase
        .from('production_active')
        .insert(newRecord)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log(`[API /production/update-phase PATCH] Successfully updated ${phase} for product ${producto_id}`);

    return NextResponse.json({
      message: 'Fase de producción actualizada exitosamente',
      updatedRecord: result
    });

  } catch (error) {
    console.error('[API /production/update-phase PATCH] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 