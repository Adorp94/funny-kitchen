import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get the sum of all expenses in MXN (converted amount)
    const { data, error } = await supabase
      .from('egresos')
      .select('monto_mxn');
    
    if (error) {
      console.error('Error fetching egresos total:', error);
      return NextResponse.json({ error: 'Error fetching total' }, { status: 500 });
    }
    
    // Calculate the total from the returned data
    const total = data.reduce((sum, item) => {
      const amount = parseFloat(item.monto_mxn || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    return NextResponse.json({ total });
  } catch (error) {
    console.error('Unexpected error in egresos total API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 