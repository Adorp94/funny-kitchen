import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // First, check if we can connect to the database
    console.log('Testing database connection');
    
    // Get schema information
    const { data: cotizaciones, error: cotizacionesError } = await supabase
      .from('cotizaciones')
      .select('*')
      .limit(3);
    
    if (cotizacionesError) {
      console.error('Error accessing cotizaciones table:', cotizacionesError);
      return NextResponse.json({
        success: false,
        error: cotizacionesError.message,
        details: cotizacionesError
      }, { status: 500 });
    }
    
    // Get some example data from other tables
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('*')
      .limit(3);
    
    const { data: productos, error: productosError } = await supabase
      .from('productos')
      .select('*')
      .limit(3);
    
    const { data: prodsxcotizacion, error: prodsxcotizacionError } = await supabase
      .from('prodsxcotizacion')
      .select('*')
      .limit(3);
    
    return NextResponse.json({
      success: true,
      // Include basic schema information
      schemas: {
        cotizaciones: cotizaciones && cotizaciones.length > 0 
          ? Object.keys(cotizaciones[0]) 
          : 'No rows found',
        clientes: clientes && clientes.length > 0 
          ? Object.keys(clientes[0]) 
          : 'No rows found',
        productos: productos && productos.length > 0 
          ? Object.keys(productos[0]) 
          : 'No rows found',
        prodsxcotizacion: prodsxcotizacion && prodsxcotizacion.length > 0 
          ? Object.keys(prodsxcotizacion[0]) 
          : 'No rows found',
      },
      // Include count of records
      counts: {
        cotizaciones: cotizaciones?.length || 0,
        clientes: clientes?.length || 0,
        productos: productos?.length || 0,
        prodsxcotizacion: prodsxcotizacion?.length || 0,
      },
      // Include basic sample data (first record only)
      sampleData: {
        cotizaciones: cotizaciones && cotizaciones.length > 0 
          ? cotizaciones[0] 
          : null,
        prodsxcotizacion: prodsxcotizacion && prodsxcotizacion.length > 0 
          ? prodsxcotizacion[0] 
          : null,
      }
    });
  } catch (error) {
    console.error('Error testing database:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 