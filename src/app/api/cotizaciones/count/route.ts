import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { count, error } = await supabase
      .from('cotizaciones')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error fetching cotizaciones count:', error);
      return NextResponse.json({ error: 'Error fetching count' }, { status: 500 });
    }
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Unexpected error in cotizaciones count API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 