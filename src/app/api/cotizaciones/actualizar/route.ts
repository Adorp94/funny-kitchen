import { NextRequest, NextResponse } from 'next/server';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClientComponentClient();
    const data = await request.json();
    
    const { cotizacion_id, estado, ...updateData } = data;
    
    if (!cotizacion_id) {
      return NextResponse.json(
        { error: 'ID de cotización requerido' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const dataToUpdate: any = {};
    
    // Only include valid fields
    if (estado) dataToUpdate.estado = estado;
    
    // Add other fields from updateData that are valid
    const allowedFields = [
      'descuento_global',
      'iva',
      'monto_iva',
      'incluye_envio',
      'costo_envio',
      'total',
      'fecha_expiracion'
    ];
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        dataToUpdate[key] = updateData[key];
      }
    });
    
    // Update cotizacion
    const { data: updatedCotizacion, error } = await supabase
      .from('cotizaciones')
      .update(dataToUpdate)
      .eq('cotizacion_id', cotizacion_id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating quotation:', error);
      return NextResponse.json(
        { error: 'Error al actualizar la cotización' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      cotizacion: updatedCotizacion
    });
    
  } catch (error) {
    console.error('Unexpected error updating quotation:', error);
    return NextResponse.json(
      { error: 'Error inesperado al actualizar la cotización' },
      { status: 500 }
    );
  }
} 