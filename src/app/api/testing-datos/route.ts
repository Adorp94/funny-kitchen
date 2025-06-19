import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('Testing API: Starting GET request - fetching ONLY real cotizaciones in production');
    
    // Fetch ONLY real cotizaciones in production status
    const { data: cotizacionesProduccion, error: cotizacionesError } = await supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        cliente_id,
        estado,
        estatus_pago,
        fecha_creacion
      `)
      .eq('estado', 'producción')
      .order('fecha_creacion', { ascending: false });

    if (cotizacionesError) {
      console.error('Error fetching cotizaciones in production:', cotizacionesError);
      return NextResponse.json({ 
        error: 'Error al obtener cotizaciones en producción',
        details: cotizacionesError.message 
      }, { status: 500 });
    }

    console.log('Real cotizaciones in production found:', cotizacionesProduccion?.length || 0);

    // Transform real cotizaciones to match expected format
    const realProductionData = [];
    if (cotizacionesProduccion && cotizacionesProduccion.length > 0) {
      for (const cotizacion of cotizacionesProduccion) {
        // Get client info
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nombre')
          .eq('cliente_id', cotizacion.cliente_id)
          .single();

        // Get products for this cotización
        const { data: productos } = await supabase
          .from('cotizacion_productos')
          .select(`
            producto_id,
            cantidad,
            productos (
              nombre
            )
          `)
          .eq('cotizacion_id', cotizacion.cotizacion_id);

        const clienteName = cliente?.nombre || 'Cliente Desconocido';
        const cotizacionLabel = `${cotizacion.folio} ${clienteName}`;
        const fecha = cotizacion.fecha_creacion?.split('T')[0] || new Date().toISOString().split('T')[0];
        
        for (const producto of (productos || [])) {
          realProductionData.push({
            id: `real_${cotizacion.cotizacion_id}_${producto.producto_id}`,
            cliente: cotizacionLabel,
            producto: producto.productos?.nombre || 'Producto Desconocido',
            cantidad: producto.cantidad,
            fecha: fecha,
            created_at: cotizacion.fecha_creacion,
            updated_at: cotizacion.fecha_creacion,
            // Flag to identify real cotizacion data
            is_real_cotizacion: true,
            cotizacion_id: cotizacion.cotizacion_id
          });
        }
      }
    }

    console.log('Supabase response - real cotizaciones:', cotizacionesProduccion?.length || 0, 'cotizaciones');
    console.log('Transformed real production data:', realProductionData.length, 'items');

    return NextResponse.json({
      data: realProductionData,
      debug: {
        realCotizaciones: cotizacionesProduccion?.length || 0,
        transformedRealItems: realProductionData.length,
        totalItems: realProductionData.length,
        dataSource: 'real_cotizaciones_only'
      }
    });

  } catch (error) {
    console.error('Testing API Error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle both single record and bulk upload
    const records = Array.isArray(body) ? body : [body];
    const validRecords = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const { cliente, producto, cantidad, fecha } = record;

      // Validate required fields
      if (!cliente || !producto || !cantidad) {
        errors.push(`Record ${i + 1}: Missing required fields (cliente, producto, cantidad)`);
        continue;
      }

      // Handle date conversion
      let processedDate = new Date().toISOString().split('T')[0]; // default to today
      
      if (fecha && fecha.trim() !== '') {
        try {
          // Handle different date formats
          let dateToConvert = fecha.trim();
          
          // If it's datetime format (e.g., "2025-05-30 00:00:00"), extract just the date part
          if (dateToConvert.includes(' ')) {
            dateToConvert = dateToConvert.split(' ')[0];
          }
          
          // Validate the date format
          const dateObj = new Date(dateToConvert);
          if (isNaN(dateObj.getTime())) {
            errors.push(`Record ${i + 1}: Invalid date format "${fecha}"`);
            continue;
          }
          
          processedDate = dateToConvert;
        } catch (error) {
          errors.push(`Record ${i + 1}: Error processing date "${fecha}"`);
          continue;
        }
      }

      validRecords.push({
        cliente: cliente.trim(),
        producto: producto.trim(),
        cantidad: parseInt(cantidad),
        fecha: processedDate
      });
    }

    if (validRecords.length === 0) {
      return NextResponse.json({ 
        error: 'No valid records to insert', 
        details: errors 
      }, { status: 400 });
    }

    // Insert valid records
    const { data, error } = await supabase
      .from('testing_datos')
      .insert(validRecords)
      .select();

    if (error) {
      console.error('Error inserting testing data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data,
      summary: {
        inserted: validRecords.length,
        errors: errors.length,
        errorDetails: errors
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('testing_datos')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Error deleting testing data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 