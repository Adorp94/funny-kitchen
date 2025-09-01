import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get total count of cotizaciones
    const { count: totalCotizaciones, error: countError } = await supabase
      .from('cotizaciones')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error fetching cotizaciones count:', countError);
      return NextResponse.json({ error: 'Error fetching count' }, { status: 500 });
    }

    // Get total value of all cotizaciones
    const { data: cotizaciones, error: valorError } = await supabase
      .from('cotizaciones')
      .select('total');
    
    if (valorError) {
      console.error('Error fetching cotizaciones values:', valorError);
      return NextResponse.json({ error: 'Error fetching values' }, { status: 500 });
    }

    // Calculate total value
    const valorTotal = cotizaciones?.reduce((sum, cotizacion) => {
      return sum + (parseFloat(cotizacion.total) || 0);
    }, 0) || 0;

    // Get count of unique products
    const { count: productosUnicos, error: productosError } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true });
    
    if (productosError) {
      console.error('Error fetching productos count:', productosError);
      return NextResponse.json({ error: 'Error fetching productos count' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      total: totalCotizaciones || 0,
      valorTotal: valorTotal,
      productosUnicos: productosUnicos || 0
    });
  } catch (error) {
    console.error('Unexpected error in cotizaciones count API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 