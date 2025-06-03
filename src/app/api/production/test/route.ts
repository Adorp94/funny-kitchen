import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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