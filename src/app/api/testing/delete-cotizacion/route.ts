import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { cotizacion_id: cotizacionIdStr } = await request.json();
    const cotizacionId = parseInt(cotizacionIdStr, 10);

    if (isNaN(cotizacionId) || cotizacionId <= 0) {
      return NextResponse.json({ error: 'Invalid Cotización ID format' }, { status: 400 });
    }

    console.log(`[Testing Delete API] Received request to delete cotización ID: ${cotizacionId}`);

    // --- Step 1: Delete related cotizacion_productos ---
    const { error: productDeleteError } = await supabase
      .from('cotizacion_productos')
      .delete()
      .eq('cotizacion_id', cotizacionId);

    if (productDeleteError) {
       console.error(`[Testing Delete API] Error deleting cotizacion_productos for ID ${cotizacionId}:`, productDeleteError);
       // Log the error but proceed to delete the main cotizacion if possible
    } else {
        console.log(`[Testing Delete API] Successfully deleted cotizacion_productos for ID ${cotizacionId}.`);
    }

    // --- Step 2: Delete related cotizacion_historial ---
     const { error: historyDeleteError } = await supabase
       .from('cotizacion_historial')
       .delete()
       .eq('cotizacion_id', cotizacionId);

     if (historyDeleteError) {
        console.error(`[Testing Delete API] Error deleting cotizacion_historial for ID ${cotizacionId}:`, historyDeleteError);
        // Log the error but proceed
     } else {
        console.log(`[Testing Delete API] Successfully deleted cotizacion_historial for ID ${cotizacionId}.`);
     }

    // --- Step 3: Delete the cotización itself ---
    const { data: deletedCotizacion, error: cotizacionDeleteError } = await supabase
      .from('cotizaciones')
      .delete()
      .eq('cotizacion_id', cotizacionId)
      .select() // Select to check if something was actually deleted
      .single(); // Expecting one or zero rows deleted

    if (cotizacionDeleteError && cotizacionDeleteError.code !== 'PGRST116') { // PGRST116: Row not found, which is okay if already deleted
      console.error(`[Testing Delete API] Error deleting cotizacion ID ${cotizacionId}:`, cotizacionDeleteError);
      // Handle specific errors like FK violation if ON DELETE CASCADE failed or wasn't setup for other tables
      if (cotizacionDeleteError.code === '23503') {
         return NextResponse.json({ error: 'Cannot delete cotización due to other related records.' }, { status: 409 });
      }
      return NextResponse.json({ error: cotizacionDeleteError.message || 'Error deleting cotizacion' }, { status: 500 });
    }

    if (!deletedCotizacion && !cotizacionDeleteError) {
         console.log(`[Testing Delete API] Cotización ID ${cotizacionId} not found or already deleted.`);
         // Still proceed to reset sequences
    } else {
        console.log(`[Testing Delete API] Successfully deleted cotizacion ID ${cotizacionId}.`);
    }

    // --- Step 4: Reset Sequences ---
    console.log(`[Testing Delete API] Resetting sequences after deleting ID ${cotizacionId}...`);

    // Reset cotizacion_productos sequence
    const { data: maxProdIdData, error: maxProdIdError } = await supabase.rpc('reset_sequence', { table_name: 'cotizacion_productos', column_name: 'cotizacion_producto_id' });
     if (maxProdIdError) {
         console.error('[Testing Delete API] Error resetting cotizacion_productos sequence:', maxProdIdError);
         // Don't fail the whole request, but log it
     } else {
        console.log(`[Testing Delete API] Reset cotizacion_productos sequence. Next value will be > ${maxProdIdData}`);
     }


    // Reset cotizaciones sequence
     const { data: maxCotIdData, error: maxCotIdError } = await supabase.rpc('reset_sequence', { table_name: 'cotizaciones', column_name: 'cotizacion_id' });
      if (maxCotIdError) {
          console.error('[Testing Delete API] Error resetting cotizaciones sequence:', maxCotIdError);
          // Don't fail the whole request, but log it
      } else {
         console.log(`[Testing Delete API] Reset cotizaciones sequence. Next value will be > ${maxCotIdData}`);
      }

    return NextResponse.json({ message: `Cotización ${cotizacionId} deleted and sequences reset successfully.` }, { status: 200 });

  } catch (err) {
    console.error(`[Testing Delete API] Unexpected error:`, err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper function to reset sequence (can be created in Supabase SQL editor)
/*
-- Run this in Supabase SQL Editor once:
CREATE OR REPLACE FUNCTION reset_sequence(table_name text, column_name text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  max_id bigint;
  seq_name text;
BEGIN
  -- Construct sequence name (common convention)
  seq_name := table_name || '_' || column_name || '_seq';

  -- Find the maximum value of the column
  EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', column_name, table_name) INTO max_id;

  -- Reset the sequence
  -- The 'true' argument means the next value generated will be max_id + 1
  EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_id);

  RAISE LOG 'Reset sequence % to value %', seq_name, max_id;

  RETURN max_id; -- Return the max_id found
EXCEPTION
  WHEN undefined_object THEN
    RAISE WARNING 'Sequence % not found for table % column %.', seq_name, table_name, column_name;
    RETURN NULL; -- Indicate sequence was not found/reset
  WHEN others THEN
    RAISE WARNING 'Error resetting sequence % for table % column %: %', seq_name, table_name, column_name, SQLERRM;
    RETURN NULL; -- Indicate error
END;
$$;

*/ 