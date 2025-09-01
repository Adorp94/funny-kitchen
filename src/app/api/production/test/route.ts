import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    console.log('Testing production API...');

    // Simple test query
    const { data: testData, error: testError } = await supabase
      .from('cotizacion_productos')
      .select('cotizacion_producto_id, cantidad, production_status')
      .limit(3);

    if (testError) {
      console.error('Test error:', testError);
      return NextResponse.json({ error: 'Test failed', details: testError.message }, { status: 500 });
    }

    console.log('Test data:', testData);

    // Now test with join
    const { data: joinData, error: joinError } = await supabase
      .from('cotizacion_productos')
      .select(`
        cotizacion_producto_id,
        cantidad,
        production_status,
        cotizaciones!inner(folio, estado)
      `)
      .eq('cotizaciones.estado', 'producción')
      .limit(3);

    if (joinError) {
      console.error('Join error:', joinError);
      return NextResponse.json({ error: 'Join failed', details: joinError.message }, { status: 500 });
    }

    console.log('Join data:', joinData);

    return NextResponse.json({
      message: 'Test successful',
      testData,
      joinData,
      count: joinData?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected error', details: error.message }, { status: 500 });
  }
} 