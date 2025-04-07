import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const table = searchParams.get('table') || 'cotizacion_productos';
    
    // Attempt to get schema information
    const { data: schemaInfo, error: schemaError } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.error(`Error fetching schema for ${table}:`, schemaError);
      return NextResponse.json({ error: schemaError.message }, { status: 500 });
    }
    
    // Create a stored procedure to get column information
    await supabase.rpc('create_debug_function_if_not_exists');
    
    // Fetch column information using the procedure
    const { data: columnInfo, error: columnError } = await supabase.rpc(
      'debug_get_table_columns',
      { table_name: table }
    );
    
    if (columnError) {
      console.error(`Error fetching columns for ${table}:`, columnError);
    }
    
    return NextResponse.json({
      table,
      sample_row: schemaInfo && schemaInfo.length > 0 ? schemaInfo[0] : null,
      column_info: columnInfo || null
    });
    
  } catch (error) {
    console.error('Error in debug API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
} 