import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Call the database function to process temp productos
    const { data, error } = await supabase
      .rpc('process_productos_temp');

    if (error) {
      console.error('Error processing productos_temp:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const result = data[0];
    
    return NextResponse.json({
      success: true,
      message: `Processing completed. ${result.success_count} productos processed successfully, ${result.error_count} errors.`,
      processed_count: result.processed_count,
      success_count: result.success_count,
      error_count: result.error_count,
      errors: result.errors
    });

  } catch (error) {
    console.error('Error in process-temp endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process temporal productos' },
      { status: 500 }
    );
  }
}

// Clear processed records from temp table
export async function DELETE() {
  try {
    const supabase = await createClient();
    
    // Delete processed records
    const { data, error } = await supabase
      .from('productos_temp')
      .delete()
      .eq('processed', true);

    if (error) {
      console.error('Error deleting processed records:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Processed records cleared from temporal table'
    });

  } catch (error) {
    console.error('Error in process-temp DELETE endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to clear processed records' },
      { status: 500 }
    );
  }
} 