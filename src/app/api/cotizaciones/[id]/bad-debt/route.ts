import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cotizacionId = parseInt(id);

    if (isNaN(cotizacionId)) {
      return NextResponse.json(
        { error: 'ID de cotización inválido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { deuda_incobrable, notas } = body;

    if (typeof deuda_incobrable !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo deuda_incobrable debe ser boolean' },
        { status: 400 }
      );
    }

    // Update the quotation's bad debt status
    const { data, error } = await supabase
      .from('cotizaciones')
      .update({
        deuda_incobrable,
        // Optionally add a note field if you want to track reason
        ...(notas && { notas: notas })
      })
      .eq('cotizacion_id', cotizacionId)
      .select('cotizacion_id, folio, deuda_incobrable')
      .single();

    if (error) {
      console.error('Error updating bad debt status:', error);
      return NextResponse.json(
        { error: 'Error al actualizar estado de deuda incobrable' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: deuda_incobrable
        ? `Cotización ${data.folio} marcada como deuda incobrable`
        : `Cotización ${data.folio} restaurada de deuda incobrable`
    });

  } catch (error) {
    console.error('Error in bad debt route:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}